import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'troy-fallback-secret-key-2026';

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ message: 'Erişim engellendi. Token bulunamadı.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token.' });
    }
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

        const allowedRoles = roles.map(r => r.toLowerCase());

        if (!allowedRoles.includes(mappedUserRole)) {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz bulunmamaktadır.' });
        }

        next();
    };
};
