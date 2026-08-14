import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

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

export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: 'Yetki bilgisi bulunamadı.' });
        }

        const userRole = req.user.role.toLowerCase();
        
        // Rol uyumluluğu eşleştirmesi
        let mappedUserRole = userRole;
        if (userRole === 'admin') mappedUserRole = 'superadmin';
        if (userRole === 'yonetici') mappedUserRole = 'superadmin';
        if (userRole === 'servis_sorumlusu' || userRole === 'servissorumlusu') mappedUserRole = 'storemanager';

        const allowedRoles = roles.map(r => r.toLowerCase());

        if (!allowedRoles.includes(mappedUserRole)) {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz bulunmamaktadır.' });
        }

        next();
    };
};
