import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';

const JWT_SECRET = process.env.JWT_SECRET || 'troy-fallback-secret-key-2026';

export const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ message: 'Erişim engellendi. Token bulunamadı.' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
    }

    // Erişimi kapatılan hesabın elindeki token'ın (24 saat geçerli) anında
    // geçersiz kalması için her istekte hesap durumu doğrulanır.
    try {
        const id = decoded?.id;
        if (id) {
            const filter = { $or: [{ id: String(id) }] };
            if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });

            const account = await User.findOne(filter).select('isActive').lean();
            if (account && account.isActive === false) {
                return res.status(403).json({
                    code: 'ACCOUNT_DISABLED',
                    message: 'Hesabınızın sistem erişimi kapatılmıştır. Lütfen yöneticinizle görüşün.'
                });
            }
        }
    } catch (error) {
        // Durum sorgusu başarısız olursa isteği düşürmeyip token doğrulamasına güveniriz.
        console.error('[auth] Hesap durumu kontrol edilemedi:', error.message);
    }

    req.user = decoded;
    next();
};

// Rol uyumluluğu eşleştirmesi: istemcideki normalizeRoleName ile aynı sözlük
const ROLE_ALIASES = {
    admin: 'superadmin',
    yonetici: 'superadmin',
    servis_sorumlusu: 'storemanager',
    servissorumlusu: 'storemanager',
    teknisyen: 'technician',
    muhasebe: 'accountant',
    logistic: 'accountant'
};

export const normalizeRole = (role) => {
    const userRole = String(role || '').toLowerCase();
    return ROLE_ALIASES[userRole] || userRole;
};

export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Yetki bilgisi bulunamadı.' });
        }

        const allowedRoles = roles.map(normalizeRole);

        if (!allowedRoles.includes(normalizeRole(req.user.role))) {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz bulunmamaktadır.' });
        }

        next();
    };
};

/**
 * Yetki tabanlı kapı. Rol Yönetimi ekranından tanımlanan izin listesine bakar;
 * böylece sunucu ile arayüzün "kim ne yapabilir" görüşü aynı kalır.
 * legacyRoles, rol kaydı bulunmayan kurulumlar için geriye dönük güvenlik ağıdır.
 */
export const requirePermission = (permission, legacyRoles = []) => {
    const allowedRoles = ['superadmin', ...legacyRoles.map(normalizeRole)];

    return async (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Yetki bilgisi bulunamadı.' });
        }

        const role = normalizeRole(req.user.role);
        if (allowedRoles.includes(role)) return next();

        try {
            const roleDoc = await Role.findOne({
                name: { $in: [req.user.role, String(req.user.role).toLowerCase(), role] }
            }).lean();

            if (roleDoc && Array.isArray(roleDoc.permissions) && roleDoc.permissions.includes(permission)) {
                return next();
            }
        } catch (error) {
            // Rol kaydı okunamazsa yalnızca yerleşik rol listesine güvenilir.
            console.error('[auth] Rol yetkisi okunamadı:', error.message);
        }

        return res.status(403).json({ message: 'Bu işlem için yetkiniz bulunmamaktadır.' });
    };
};
