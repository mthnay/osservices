import express from 'express';
import mongoose from 'mongoose';

import Repair from './models/Repair.js';
import User from './models/User.js';
import Inventory from './models/Inventory.js';
import Technician from './models/Technician.js';
import ServicePoint from './models/ServicePoint.js';
import SystemSetting from './models/SystemSetting.js';
import Media from './models/Media.js';
import Customer from './models/Customer.js';
import DeviceModel from './models/DeviceModel.js';
import Earning from './models/Earning.js';
import Notification from './models/Notification.js';
import Role from './models/Role.js';
import AuditLog from './models/AuditLog.js';
import Satisfaction from './models/Satisfaction.js';
import StoreAnnouncement from './models/StoreAnnouncement.js';
import StoreTask from './models/StoreTask.js';
import StoreShift from './models/StoreShift.js';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { sendAutomatedEmail } from './emailService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { verifyToken, requireRole } from './middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const JWT_SECRET = process.env.JWT_SECRET || 'troy-fallback-secret-key-2026';

// --- Audit Log Helper ---
const createLog = async (req, action, module, details = '', storeId = undefined) => {
    try {
        const user = req.user; // Set by verifyToken middleware
        // Verinin ait olduğu mağaza öncelikli; belirtilmemişse kullanıcının mağazası
        const resolvedStoreId = (storeId !== undefined && storeId !== null) ? Number(storeId) : user?.storeId;
        await AuditLog.create({
            userId: user?.id || 'SYSTEM',
            userName: user?.name || 'Sistem',
            userEmail: user?.email,
            action,
            module,
            details: typeof details === 'object' ? JSON.stringify(details) : details,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
            storeId: resolvedStoreId
        });
    } catch (err) {
        console.error('Audit Log Error:', err);
    }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isPackaged = process.env.NODE_ENV === 'production';
const uploadDir = isPackaged
    ? path.join(process.env.USER_DATA_PATH || process.cwd(), 'troy-uploads')
    : path.resolve(__dirname, '../uploads');

console.log('Upload Directory initialized at:', uploadDir);

if (!fs.existsSync(uploadDir)) {
    try { 
        fs.mkdirSync(uploadDir, { recursive: true }); 
        console.log('Upload directory created successfully.');
    } catch (e) { 
        console.error('FAILED to create upload directory:', e.message);
    }
} else {
    try {
        fs.accessSync(uploadDir, fs.constants.W_OK);
        console.log('Upload directory is writable.');
    } catch (e) {
        console.error('Upload directory is NOT writable:', e.message);
    }
}

const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
    }
});

const uploadDisk = multer({ 
    storage: diskStorage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB Limit
});

// Multer for memory storage (Database Uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

// --- Global Authentication Middleware ---
router.use((req, res, next) => {
    const publicPaths = [
        '/system/check-updates',
        '/login',
        '/users/forgot-password',
        '/users/check-email'
    ];
    
    // Allow public exact matches or paths starting with /public/ or /media/
    if (publicPaths.includes(req.path) || req.path.startsWith('/public/') || req.path.startsWith('/media/')) {
        return next();
    }
    
    return verifyToken(req, res, next);
});

// --- Seed Default Roles ---
router.post('/system/seed-roles', async (req, res) => {
    try {
        const count = await Role.countDocuments();
        if (count === 0) {
            const defaultRoles = [
                { name: 'superadmin', displayName: 'Super Admin', permissions: ['view_all_stores', 'manage_users', 'manage_settings', 'manage_stock'], isSystem: true },
                { name: 'storemanager', displayName: 'Mağaza Müdürü', permissions: ['manage_stock', 'delete_repair'], isSystem: true },
                { name: 'servis_sorumlusu', displayName: 'Servis Sorumlusu', permissions: ['manage_stock', 'delete_repair'], isSystem: true },
                { name: 'reception', displayName: 'Resepsiyon', permissions: ['manage_stock'], isSystem: true },
                { name: 'technician', displayName: 'Teknisyen', permissions: [], isSystem: true },
                { name: 'accountant', displayName: 'Muhasebe', permissions: ['view_all_stores'], isSystem: true },
            ];
            await Role.insertMany(defaultRoles);
            res.json({ success: true, message: 'Default roles seeded successfully' });
        } else {
            // Ensure servis_sorumlusu exists even if roles were already seeded
            const exist = await Role.findOne({ name: 'servis_sorumlusu' });
            if (!exist) {
                await Role.create({
                    name: 'servis_sorumlusu',
                    displayName: 'Servis Sorumlusu',
                    permissions: ['manage_stock', 'delete_repair'],
                    isSystem: true
                });
            }
            res.json({ success: true, message: 'Roles already exist (servis_sorumlusu checked/added)' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- Roles ---
router.get('/roles', async (req, res) => {
    try {
        const roles = await Role.find({}).lean();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/roles', requireRole(['superadmin', 'yonetici']), async (req, res) => {
    try {
        const { name, displayName, permissions } = req.body;
        const requestorRole = req.user?.role?.toLowerCase();
        
        // Güvenlik Önlemi: Yönetici (yonetici) rolü, SuperAdmin veya Admin rollerini oluşturamaz
        if (requestorRole === 'yonetici' && (name?.toLowerCase() === 'superadmin' || name?.toLowerCase() === 'admin')) {
            return res.status(403).json({ message: 'Yönetici rolü, SuperAdmin veya Admin rollerini oluşturamaz.' });
        }

        const roleExists = await Role.findOne({ name });
        if (roleExists) {
            return res.status(400).json({ message: 'Bu rol adı zaten mevcut' });
        }
        const role = await Role.create({ name, displayName, permissions: permissions || [], isSystem: false });
        res.status(201).json(role);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/roles/:id', requireRole(['superadmin', 'yonetici']), async (req, res) => {
    try {
        const { displayName, permissions } = req.body;
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ message: 'Rol bulunamadı' });
        
        // Güvenlik Önlemi: Yönetici (yonetici) rolü, SuperAdmin veya Admin rollerini düzenleyemez
        const requestorRole = req.user?.role?.toLowerCase();
        if (requestorRole === 'yonetici' && (role.name?.toLowerCase() === 'superadmin' || role.name?.toLowerCase() === 'admin')) {
            return res.status(403).json({ message: 'Yönetici rolü, SuperAdmin veya Admin rollerini düzenleyemez.' });
        }

        role.displayName = displayName || role.displayName;
        role.permissions = permissions || role.permissions;
        
        const updatedRole = await role.save();
        res.json(updatedRole);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/roles/:id', requireRole(['superadmin', 'yonetici']), async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ message: 'Rol bulunamadı' });
        if (role.isSystem) return res.status(400).json({ message: 'Sistem rolleri silinemez' });
        
        // Güvenlik Önlemi: Yönetici (yonetici) rolü, SuperAdmin veya Admin rollerini silemez
        const requestorRole = req.user?.role?.toLowerCase();
        if (requestorRole === 'yonetici' && (role.name?.toLowerCase() === 'superadmin' || role.name?.toLowerCase() === 'admin')) {
            return res.status(403).json({ message: 'Yönetici rolü, SuperAdmin veya Admin rollerini silemez.' });
        }

        await role.deleteOne();
        res.json({ message: 'Rol başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- System Routes ---
router.get('/system/check-updates', (req, res) => {
    // Gerçek bir yapıda burada bir GitHub API sorgusu veya versiyon kontrolü yapılır
    res.json({
        available: true,
        version: 'v1.5.0',
        notes: 'Lojistik modülü güncellemeleri ve performans iyileştirmeleri.'
    });
});

router.post('/system/reboot', requireRole(['superadmin']), (req, res) => {
    res.json({ success: true, message: 'Server is rebooting...' });
    
    // İşlemi sonlandırmak için kısa bir gecikme verelim (cevap dönebilsin)
    setTimeout(() => {
        console.log('REBOOT TRIGGERED: Server is exiting...');
        process.exit(0);
    }, 1000);
});
router.get('/fix-stores', requireRole(['superadmin']), async (req, res) => {
    try {
        const firstPoint = await ServicePoint.findOne({});
        if (!firstPoint) return res.status(404).json({ message: 'No service points found' });

        const result = await User.updateMany({}, { storeId: firstPoint.id });
        res.json({
            message: `Linked all users to store: ${firstPoint.name}`,
            storeId: firstPoint.id,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Repairs ---
// Public Route: Cihaz Takibi İstemcisi
router.get('/public/repairs/:id', async (req, res) => {
    try {
        const repair = await Repair.findOne({ id: req.params.id });
        if (!repair) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
        
        // Sadece müşteriye gösterilecek güvenli veriler gönderiliyor
        res.json({
            id: repair.id,
            device: repair.device,
            status: repair.status,
            date: repair.date,
            issue: repair.issue,
            quoteAmount: repair.quoteAmount,
            diagnosisNotes: repair.diagnosisNotes,
            history: repair.history
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Public Route: Teklif Onay/Red
router.post('/public/repairs/:id/quote', async (req, res) => {
    try {
        const { action } = req.body; // 'accept' veya 'reject'
        const repair = await Repair.findOne({ id: req.params.id });
        
        if (!repair) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
        if (repair.status !== 'Müşteri Onayı Bekliyor') {
            return res.status(400).json({ message: 'Bu kayıt şu an teklif aşamasında değildir.' });
        }

        let newStatus = '';
        let note = '';

        if (action === 'accept') {
            newStatus = 'İşlemde';
            note = 'Müşteri onarımı portal üzerinden dijital olarak onayladı.';
        } else if (action === 'reject') {
            newStatus = 'Cihaz Hazır'; // İade için hazır
            note = 'Müşteri onarımı reddetti. Cihaz iadesi için hazırlanıyor.';
        } else {
            return res.status(400).json({ message: 'Geçersiz işlem.' });
        }

        const newHistory = [...(repair.history || []), { status: newStatus, date: new Date().toLocaleString('tr-TR'), note }];
        
        const updatedRepair = await Repair.findOneAndUpdate(
            { id: req.params.id }, 
            { status: newStatus, history: newHistory }, 
            { new: true }
        );
        res.json({ success: true, status: newStatus });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Public Route: Müşteri Geribildirimi (NPS)
router.post('/public/repairs/:id/feedback', async (req, res) => {
    try {
        const { score, comment } = req.body;
        const repair = await Repair.findOne({ id: req.params.id });

        if (!repair) return res.status(404).json({ message: 'Kayıt bulunamadı.' });
        
        // Eğer zaten bir skor varsa güncellemeye izin vermeyebiliriz veya güncelleyebiliriz. 
        // Apple standartlarında genellikle bir kez verilir.
        if (repair.feedback && repair.feedback.score) {
            return res.status(400).json({ message: 'Bu kayıt için zaten geribildirim verilmiş.' });
        }

        await Repair.findOneAndUpdate(
            { id: req.params.id },
            { 
                feedback: { 
                    score, 
                    comment, 
                    createdAt: new Date() 
                } 
            }
        );

        res.json({ success: true, message: 'Geribildiriminiz için teşekkür ederiz!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// --- Repairs ---
router.get('/repairs', async (req, res) => {
    try {
        const filter = {};
        if (req.query.storeId) {
            filter.storeId = req.query.storeId;
        }
        const repairs = await Repair.find(filter).sort({ createdAt: -1 }).lean();
        res.json(repairs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/repairs', async (req, res) => {
    try {
        // Debug için gelen veriyi dosyaya yaz
        fs.writeFileSync(path.join(__dirname, '../debug_log.json'), JSON.stringify({
            timestamp: new Date().toISOString(),
            body: req.body
        }, null, 2));
        
        console.log('[REPAIR] Incoming data logged to debug_log.json');
        // Otomatik ID Oluştur (Eğer yoksa)
        if (!req.body.id || req.body.id.startsWith('TR-')) {
            const lastRepair = await Repair.findOne({ id: /^S\d+$/ }).sort({ id: -1 });
            let nextId = 1;
            if (lastRepair && lastRepair.id) {
                const num = parseInt(lastRepair.id.replace('S', ''), 10);
                if (!isNaN(num)) nextId = num + 1;
            } else {
                const repairCount = await Repair.countDocuments();
                nextId = repairCount + 1;
            }
            req.body.id = `S${String(nextId).padStart(5, '0')}`;
        }
        
        const repair = new Repair(req.body);
        const newRepair = await repair.save();

        await createLog(req, 'CREATE_REPAIR', 'REPAIR', `Yeni servis kaydı oluşturuldu: ${newRepair.serviceNo || newRepair.id} - ${newRepair.customerName || ''} (${newRepair.device || ''})`, newRepair.storeId);

        // Otomatik Kabul E-postası Gönder (Arka Planda)
        if (newRepair.customerEmail) {
            sendAutomatedEmail(newRepair, 'Kabul').catch(err => console.error('Auto Email Error:', err));
        }

        res.status(201).json(newRepair);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/repairs/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Debug için gelen veriyi dosyaya yaz
        fs.writeFileSync(path.join(__dirname, '../debug_log.json'), JSON.stringify({
            timestamp: new Date().toISOString(),
            type: 'UPDATE',
            id: id,
            body: req.body
        }, null, 2));

        const filter = { $or: [{ id: id }] };
        if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });

        const oldRepair = await Repair.findOne(filter);
        let updatedRepair = await Repair.findOneAndUpdate(filter, req.body, { new: true });

        if (updatedRepair) {
            const statusChanged = req.body.status && oldRepair && oldRepair.status !== req.body.status;
            const detail = statusChanged
                ? `Servis kaydı güncellendi: ${updatedRepair.serviceNo || updatedRepair.id} (Durum: ${oldRepair.status} → ${updatedRepair.status})`
                : `Servis kaydı güncellendi: ${updatedRepair.serviceNo || updatedRepair.id} - ${updatedRepair.customerName || ''}`;
            await createLog(req, 'UPDATE_REPAIR', 'REPAIR', detail, updatedRepair.storeId);

            // Eğer durum değiştiyse otomatik e-posta gönder
            if (statusChanged) {
                if (updatedRepair.customerEmail) {
                    sendAutomatedEmail(updatedRepair, updatedRepair.status).catch(err => console.error('Auto Status Email Error:', err));
                }
            }
            res.json(updatedRepair);
        } else {
            res.status(404).json({ message: 'Repair not found' });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/repairs/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const filter = { $or: [{ id: id }] };
        if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });
        
        const deleted = await Repair.findOneAndDelete(filter);
        if (deleted) {
            await createLog(req, 'DELETE_REPAIR', 'REPAIR', `Servis kaydı silindi: ${deleted.serviceNo} - ${deleted.customerName}`, deleted.storeId);
        }
        res.json({ message: 'Repair deleted', success: !!deleted });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Users ---
router.get('/users', async (req, res) => {
    try {
        const filter = {};
        if (req.query.storeId) filter.storeId = req.query.storeId;
        
        // Şifre alanını güvenlik için hariç tutuyoruz
        const users = await User.find(filter).select('-password').lean();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Check Email (For Login Flow) ---
router.post('/users/check-email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'E-posta gerekli' });
        
        const user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            return res.json({ success: true, name: user.name });
        } else {
            return res.status(404).json({ success: false, message: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[LOGIN] Attempt for email: ${email}`);
        
        const user = await User.findOne({ email });

        if (!user) {
            console.warn(`[LOGIN] FAILED: User not found with email: ${email}`);
            return res.status(401).json({ message: 'E-posta veya şifre hatalı.' });
        }

        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) {
            console.warn(`[LOGIN] FAILED: Password mismatch for user: ${email}`);
            return res.status(401).json({ message: 'E-posta veya şifre hatalı.' });
        }

        console.log(`[LOGIN] SUCCESS: User ${user.name} logged in.`);
        
        // --- Audit Log ---
        req.user = user; // Manual set for login route
        await createLog(req, 'LOGIN', 'AUTH', `Kullanıcı sisteme giriş yaptı: ${user.email}`);

        const token = jwt.sign(
            { id: user._id || user.id, name: user.name, email: user.email, role: user.role, storeId: user.storeId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Şifreyi objeden çıkarıp geri kalanı dönüyoruz
        const { password: _, ...userWithoutPassword } = user._doc || user;
        res.json({ user: userWithoutPassword, token });
    } catch (err) {
        console.error(`[LOGIN] ERROR:`, err.message);
        res.status(500).json({ message: err.message });
    }
});

router.post('/users/verify-password', verifyToken, async (req, res) => {
    try {
        const { userId, password } = req.body;
        if (!userId || !password) {
            return res.status(400).json({ message: 'Kullanıcı ID ve şifre gereklidir.' });
        }
        
        // Find user by id or _id
        const filter = { $or: [{ id: userId }] };
        if (mongoose.Types.ObjectId.isValid(userId)) {
            filter.$or.push({ _id: userId });
        }
        const user = await User.findOne(filter);
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }
        
        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Girilen şifre hatalı.' });
        }
        
        res.json({ success: true, message: 'Şifre doğrulandı.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/users', requireRole(['superadmin', 'yonetici']), upload.single('avatar'), async (req, res) => {
    try {
        const userData = req.body;
        const requestorRole = req.user?.role?.toLowerCase();

        // Yönetici, SuperAdmin hesabı oluşturamaz
        if (requestorRole === 'yonetici' && (userData.role?.toLowerCase() === 'superadmin' || userData.role?.toLowerCase() === 'admin')) {
            return res.status(403).json({ message: 'Yönetici rolü, SuperAdmin hesabı oluşturamaz.' });
        }

        if (userData.password) {
            userData.password = bcrypt.hashSync(userData.password, 10);
        }
        const user = new User(userData);
        const newUser = await user.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/users/:id', requireRole(['superadmin', 'yonetici']), async (req, res) => {
    try {
        const id = req.params.id;
        const requestorRole = req.user?.role?.toLowerCase();

        // Yönetici, SuperAdmin hesaplarını düzenleyemez
        if (requestorRole === 'yonetici') {
            const targetUser = await User.findOne({ $or: [
                ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
                { id: id }
            ]});
            if (targetUser && (targetUser.role?.toLowerCase() === 'superadmin' || targetUser.role?.toLowerCase() === 'admin')) {
                return res.status(403).json({ message: 'Yönetici rolü, SuperAdmin hesabını düzenleyemez.' });
            }
            // Yönetici, bir hesabı SuperAdmin yapamaz
            if (req.body.role?.toLowerCase() === 'superadmin' || req.body.role?.toLowerCase() === 'admin') {
                return res.status(403).json({ message: 'Yönetici rolü, başka bir hesabı SuperAdmin yapamaz.' });
            }
        }

        console.log(`[UserUpdate] Request for ID: ${id}`);
        const updateData = { ...req.body };
        if (updateData.password && updateData.password.trim() !== "") {
            updateData.password = bcrypt.hashSync(updateData.password, 10);
        } else {
            delete updateData.password;
        }

        let updatedUser = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
        }
        if (!updatedUser) {
            updatedUser = await User.findOneAndUpdate({ id: id }, updateData, { new: true });
        }

        if (updatedUser) {
            const { password: _, ...userWithoutPassword } = updatedUser._doc || updatedUser;
            res.json(userWithoutPassword);
        } else {
            res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/users/:id', requireRole(['superadmin', 'yonetici']), async (req, res) => {
    try {
        const id = req.params.id;
        const requestorRole = req.user?.role?.toLowerCase();

        // Yönetici, SuperAdmin hesaplarını silemez
        if (requestorRole === 'yonetici') {
            const targetUser = await User.findOne({ $or: [
                ...(mongoose.Types.ObjectId.isValid(id) ? [{ _id: id }] : []),
                { id: id }
            ]});
            if (targetUser && (targetUser.role?.toLowerCase() === 'superadmin' || targetUser.role?.toLowerCase() === 'admin')) {
                return res.status(403).json({ message: 'Yönetici rolü, SuperAdmin hesabını silemez.' });
            }
        }

        const filter = { $or: [{ id: id }] };
        if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });
        const deleted = await User.findOneAndDelete(filter);
        res.json({ message: 'User deleted', success: !!deleted });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Forgot Password ---
router.post('/users/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.' });
        }
        
        // Şifreyi e-posta ile gönder (veya sıfırlama linki - yerel simülasyon olduğu için doğrudan hatırlatma yapıyoruz)
        res.json({ 
            success: true, 
            message: 'Şifre hatırlatma yönergesi e-posta adresinize gönderildi.',
            message: 'Eğer e-posta adresi kayıtlıysa, şifre sıfırlama talimatları gönderilecektir.'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Inventory ---
router.get('/inventory', async (req, res) => {
    try {
        const filter = {};
        if (req.query.storeId) {
            filter.storeId = req.query.storeId;
        }
        const inventory = await Inventory.find(filter).lean();
        res.json(inventory);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/inventory', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    const data = { ...req.body };
    if (data.kgbSerial && (!data.kgbSerials || data.kgbSerials.length === 0)) {
        data.kgbSerials = [data.kgbSerial];
    }
    if (data.kbbSerial && (!data.kbbSerials || data.kbbSerials.length === 0)) {
        data.kbbSerials = [data.kbbSerial];
    }
    const item = new Inventory(data);
    try {
        const newItem = await item.save();
        await createLog(req, 'CREATE_STOCK', 'INVENTORY', `Yeni parça eklendi: ${newItem.name || ''} (${newItem.partNumber || newItem.id || ''}) - Adet: ${newItem.quantity ?? ''}`, newItem.storeId);
        res.status(201).json(newItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/inventory/:id', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    try {
        const id = req.params.id;
        const filter = { $or: [{ id: id }] };
        if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });
        
        const data = { ...req.body };
        if (data.kgbSerial && (!data.kgbSerials || data.kgbSerials.length === 0)) {
            data.kgbSerials = [data.kgbSerial];
        }
        if (data.kbbSerial && (!data.kbbSerials || data.kbbSerials.length === 0)) {
            data.kbbSerials = [data.kbbSerial];
        }
        
        const updatedItem = await Inventory.findOneAndUpdate(filter, data, { new: true });
        if (updatedItem) {
            await createLog(req, 'UPDATE_STOCK', 'INVENTORY', `Parça güncellendi: ${updatedItem.name || ''} (${updatedItem.partNumber || updatedItem.id || ''}) - Adet: ${updatedItem.quantity ?? ''}`, updatedItem.storeId);
        }
        res.json(updatedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/inventory/:id', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    try {
        const id = req.params.id;
        console.log(`[Inventory] DELETE request for id/_id: ${id}`);
        
        const filter = { $or: [{ id: id }] };
        if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });
        
        const deleted = await Inventory.findOneAndDelete(filter);
        
        if (deleted) {
            console.log(`[Inventory] SUCCESS: Deleted item: ${deleted.name} (${deleted.partNumber || deleted.id})`);
            await createLog(req, 'DELETE_STOCK', 'INVENTORY', `Parça silindi: ${deleted.name || ''} (${deleted.partNumber || deleted.id || ''})`, deleted.storeId);
            res.json({ message: 'Inventory item deleted', success: true });
        } else {
            console.warn(`[Inventory] FAILED: No record found for ID: ${id}`);
            res.status(404).json({ message: 'Parça bulunamadı.', success: false });
        }
    } catch (err) {
        console.error(`[Inventory] DELETE error:`, err);
        res.status(500).json({ message: err.message });
    }
});

// Decrease stock quantity (Part Usage)
router.post('/inventory/use', async (req, res) => {
    const { partId, quantity, serialNumber, serialType } = req.body;
    try {
        let item = await Inventory.findOne({ id: partId });
        if (!item) {
            item = await Inventory.findOne({ _id: partId });
        }
        
        if (!item) {
            return res.status(404).json({ message: 'Parça bulunamadı.' });
        }
        if (item.quantity < quantity) {
            return res.status(400).json({ message: 'Yetersiz stok.' });
        }
        
        const updateData = { quantity: item.quantity - quantity };
        
        // Remove serials if provided
        if (serialNumber && serialType) {
            const field = serialType === 'kgb' ? 'kgbSerials' : 'kbbSerials';
            const arr = item[field] || [];
            updateData[field] = arr.filter(s => s !== serialNumber);
        }

        const updatedItem = await Inventory.findOneAndUpdate({ _id: item._id }, updateData, { new: true });
        res.json(updatedItem);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Process repair stock movement: KGB (yeni parça) düş, KBB (eski parça) ekle — mağaza bazlı
router.post('/inventory/process-movement', async (req, res) => {
    const { repairId, parts } = req.body;
    if (!Array.isArray(parts) || parts.length === 0) {
        return res.json({ success: true, message: 'İşlenecek parça yok.' });
    }
    try {
        const results = [];
        for (const part of parts) {
            const storeId = Number(part.storeId);
            if (!storeId || Number.isNaN(storeId)) {
                return res.status(400).json({ success: false, message: 'Parça için geçerli mağaza bilgisi (storeId) eksik.' });
            }
            const partNumber = part.partNumber || null;

            // 1) KGB ambarından düş (yeni parça çıkışı) — mağaza bazlı
            if (partNumber) {
                const kgbItem = await Inventory.findOne({
                    partNumber,
                    storeId,
                    $or: [{ warehouseType: 'KGB' }, { warehouseType: { $exists: false } }, { warehouseType: null }]
                });
                if (kgbItem) {
                    kgbItem.quantity = Math.max(0, (kgbItem.quantity || 0) - 1);
                    if (part.kgbSerial) {
                        kgbItem.kgbSerials = (kgbItem.kgbSerials || []).filter(s => s !== part.kgbSerial);
                    }
                    await kgbItem.save();
                    results.push({ kgb: kgbItem._id });
                }
            }

            // 2) KBB ambarına ekle (sökülen eski parça girişi) — mağaza bazlı
            if (part.kbbSerial) {
                let kbbItem = await Inventory.findOne({
                    partNumber,
                    storeId,
                    warehouseType: 'KBB'
                });
                if (kbbItem) {
                    kbbItem.quantity = (kbbItem.quantity || 0) + 1;
                    kbbItem.kbbSerials = [...(kbbItem.kbbSerials || []), part.kbbSerial].filter(Boolean);
                    await kbbItem.save();
                    results.push({ kbb: kbbItem._id });
                } else {
                    const created = await Inventory.create({
                        id: `kbb-${Date.now()}-${Math.round(Math.random() * 1000)}`,
                        name: part.description || part.name || 'Sökülen Parça',
                        partNumber,
                        category: part.category || 'Diğer',
                        quantity: 1,
                        kbbSerials: [part.kbbSerial].filter(Boolean),
                        warehouseType: 'KBB',
                        storeId
                    });
                    results.push({ kbbCreated: created._id });
                }
            }
        }

        await createLog(req, 'STOCK_USE', 'INVENTORY', `Onarım (#${repairId}) için ${parts.length} parça işlendi (KGB düşüldü / KBB eklendi).`, Number(parts[0]?.storeId) || undefined);
        res.json({ success: true, processed: results.length });
    } catch (err) {
        console.error('[Inventory] process-movement error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// KBB iadesi: iade edilen eski parçayı ilgili mağazanın KBB ambarından düş
router.post('/inventory/return-kbb', async (req, res) => {
    const { parts, returnCode } = req.body;
    if (!Array.isArray(parts) || parts.length === 0) {
        return res.json({ success: true, processed: 0 });
    }
    try {
        let processed = 0;
        for (const part of parts) {
            const storeId = Number(part.storeId);
            if (!storeId || Number.isNaN(storeId)) continue;

            const query = { storeId, warehouseType: 'KBB' };
            if (part.partNumber) query.partNumber = part.partNumber;
            else query.name = part.name || part.description;

            const kbbItem = await Inventory.findOne(query);
            if (!kbbItem) continue;

            if (part.kbbSerial) {
                kbbItem.kbbSerials = (kbbItem.kbbSerials || []).filter(s => s !== part.kbbSerial);
            }
            kbbItem.quantity = Math.max(0, (kbbItem.quantity || 0) - 1);
            await kbbItem.save();
            processed++;
        }

        await createLog(req, 'STOCK_USE', 'INVENTORY', `KBB iadesi: ${processed} parça KBB ambarından düşüldü. (İade Kodu: ${returnCode || '-'})`, Number(parts[0]?.storeId) || undefined);
        res.json({ success: true, processed });
    } catch (err) {
        console.error('[Inventory] return-kbb error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Transfer Serials across Stores
router.post('/inventory/transfer-serial', async (req, res) => {
    const { sourceItemId, targetStoreId, serialNumbers, serialType } = req.body;
    try {
        let sourceItem = await Inventory.findOne({ _id: sourceItemId }) || await Inventory.findOne({ id: sourceItemId });
        if (!sourceItem) return res.status(404).json({ message: 'Kaynak parça bulunamadı.' });

        const serialField = serialType === 'kgb' ? 'kgbSerials' : 'kbbSerials';
        let arr = sourceItem[serialField] || [];
        
        // Remove from source
        const newArr = arr.filter(s => !serialNumbers.includes(s));
        sourceItem[serialField] = newArr;
        sourceItem.quantity = Math.max(0, sourceItem.quantity - serialNumbers.length);
        await sourceItem.save();

        // Get matching item in target store (partNumber varsa ona göre, yoksa ada göre eşleştir)
        const targetQuery = {
            storeId: targetStoreId,
            name: sourceItem.name,
            warehouseType: sourceItem.warehouseType
        };
        if (sourceItem.partNumber) {
            targetQuery.partNumber = sourceItem.partNumber;
        }
        let targetItem = await Inventory.findOne(targetQuery);

        if (!targetItem) {
            targetItem = new Inventory({
                id: `stk-${Date.now()}`,
                partNumber: sourceItem.partNumber,
                name: sourceItem.name,
                category: sourceItem.category,
                type: sourceItem.type,
                price: sourceItem.price,
                minLevel: sourceItem.minLevel,
                storeId: targetStoreId,
                warehouseType: sourceItem.warehouseType,
                quantity: 0,
                kgbSerials: [],
                kbbSerials: []
            });
        }
        
        if (!targetItem[serialField]) targetItem[serialField] = [];
        targetItem[serialField] = [...targetItem[serialField], ...serialNumbers];
        targetItem.quantity += serialNumbers.length;
        await targetItem.save();

        await createLog(req, 'STOCK_TRANSFER', 'INVENTORY', `${serialNumbers.length} adet seri nolu parça transfer edildi. Kaynak: ${sourceItem.storeId}, Hedef: ${targetStoreId}`);

        res.json({ success: true, sourceItem, targetItem });
    } catch(err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Technicians ---
router.get('/technicians', async (req, res) => {
    try {
        const filter = {};
        if (req.query.storeId) {
            filter.storeId = req.query.storeId;
        }
        const technicians = await Technician.find(filter).lean();
        res.json(technicians);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/technicians/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const filter = { $or: [{ id: id }] };
        if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });
        
        const updatedTech = await Technician.findOneAndUpdate(filter, req.body, { new: true });
        res.json(updatedTech);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/technicians/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const filter = { $or: [{ id: id }] };
        if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });
        
        const deleted = await Technician.findOneAndDelete(filter);
        res.json({ message: 'Technician deleted', success: !!deleted });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Service Points ---
router.get('/service-points', async (req, res) => {
    try {
        const points = await ServicePoint.find().lean();
        res.json(points);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/service-points', async (req, res) => {
    const point = new ServicePoint(req.body);
    try {
        const newPoint = await point.save();
        res.status(201).json(newPoint);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/service-points/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const filter = { $or: [{ id: id }] };
        if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });
        
        const updatedPoint = await ServicePoint.findOneAndUpdate(filter, req.body, { new: true });
        res.json(updatedPoint);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/service-points/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const filter = { $or: [{ id: id }] };
        if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });
        
        const deleted = await ServicePoint.findOneAndDelete(filter);
        res.json({ message: 'Service Point deleted', success: !!deleted });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- System Settings ---
router.get('/settings/:key', async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: req.params.key });
        res.json(setting ? setting.value : null);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/settings', async (req, res) => {
    const { key, value } = req.body;
    try {
        const setting = await SystemSetting.findOneAndUpdate(
            { key },
            { value },
            { new: true, upsert: true } // Create if not exists
        );
        res.json(setting.value);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// --- Media (Images in DB) ---
router.post('/upload', upload.single('file'), async (req, res) => {
    console.log('[UPLOAD] New request received (DB Mode)');
    if (!req.file) {
        console.error('[UPLOAD] No file found in request');
        return res.status(400).json({ message: 'Dosya yüklenemedi. (req.file eksik)' });
    }
    try {
        // Save to MongoDB for persistence on ephemeral systems like Render
        const newMedia = new Media({
            data: req.file.buffer,
            contentType: req.file.mimetype,
            name: req.file.originalname
        });
        await newMedia.save();

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        // Return a persistent URL pointing to the DB media route
        const fullUrl = `${protocol}://${host}/api/media/${newMedia._id}`;
        
        console.log('[UPLOAD] Saved to DB. Returning URL:', fullUrl);
        res.json({ success: true, url: fullUrl, id: newMedia._id });
    } catch (err) {
        console.error('[UPLOAD] DB Error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

router.get('/media/:id', async (req, res) => {
    try {
        const media = await Media.findById(req.params.id);
        if (!media) return res.status(404).send('Bulunamadı');
        res.set('Content-Type', media.contentType);
        res.send(media.data);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// --- Customers (CRM) ---
router.get('/customers', async (req, res) => {
    try {
        const filter = {};
        if (req.query.storeId) {
            filter.storeId = req.query.storeId;
        }
        const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
        res.json(customers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/customers', async (req, res) => {
    try {
        const lastCustomer = await Customer.findOne({ id: /^C-\d+$/ }).sort({ id: -1 });
        let nextId = 1000 + (await Customer.countDocuments()) + 1;
        if (lastCustomer && lastCustomer.id) {
            const num = parseInt(lastCustomer.id.replace('C-', ''), 10);
            if (!isNaN(num)) nextId = num + 1;
        }
        const customerId = `C-${nextId}`;

        const newCustomer = new Customer({
            ...req.body,
            id: customerId
        });
        const savedCustomer = await newCustomer.save();
        await createLog(req, 'CREATE_CUSTOMER', 'CUSTOMER', `Yeni müşteri eklendi: ${savedCustomer.name || ''} ${savedCustomer.phone ? '(' + savedCustomer.phone + ')' : ''}`, savedCustomer.storeId);
        res.status(201).json(savedCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/customers/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const filter = { $or: [{ id: id }] };
        if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });
        
        const updatedCustomer = await Customer.findOneAndUpdate(filter, req.body, { new: true });
        if (updatedCustomer) {
            await createLog(req, 'UPDATE_CUSTOMER', 'CUSTOMER', `Müşteri güncellendi: ${updatedCustomer.name || ''} ${updatedCustomer.phone ? '(' + updatedCustomer.phone + ')' : ''}`, updatedCustomer.storeId);
        }
        res.json(updatedCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/customers/:id', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    try {
        const id = req.params.id;
        const filter = { $or: [{ id: id }] };
        if (mongoose.Types.ObjectId.isValid(id)) filter.$or.push({ _id: id });
        
        const deleted = await Customer.findOneAndDelete(filter);
        if (deleted) {
            await createLog(req, 'DELETE_CUSTOMER', 'CUSTOMER', `Müşteri silindi: ${deleted.name || ''} ${deleted.phone ? '(' + deleted.phone + ')' : ''}`, deleted.storeId);
        }
        res.json({ message: 'Müşteri silindi', success: !!deleted });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Earnings ---
router.get('/earnings', async (req, res) => {
    try {
        const filter = {};
        if (req.query.storeId) {
            filter.storeId = req.query.storeId;
        }
        const earnings = await Earning.find(filter).sort({ month: -1 }).lean();
        res.json(earnings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/earnings', async (req, res) => {
    try {
        const id = `ERN-${Date.now()}`;
        const newEarning = new Earning({ ...req.body, id });
        const savedEarning = await newEarning.save();
        res.status(201).json(savedEarning);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// --- Device Models ---
router.get('/device-models', async (req, res) => {
    try {
        const query = req.query.q;
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
        let filter = {};
        if (query) {
            filter = { name: { $regex: query, $options: 'i' } };
        }
        let queryBuilder = DeviceModel.find(filter).sort({ name: 1 });
        if (limit) {
            queryBuilder = queryBuilder.limit(limit);
        }
        const models = await queryBuilder.lean();
        res.json(models);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/device-models', requireRole(['superadmin', 'yonetici']), async (req, res) => {
    try {
        const { name, type, configurations, colors } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Cihaz adı zorunludur.' });
        }
        const newModel = new DeviceModel({
            name,
            type: type || 'Other',
            configurations: configurations || [],
            colors: colors || []
        });
        const saved = await newModel.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/device-models/:id', requireRole(['superadmin', 'yonetici']), async (req, res) => {
    try {
        const { name, type, configurations, colors } = req.body;
        const id = req.params.id;
        const updated = await DeviceModel.findByIdAndUpdate(
            id,
            { name, type, configurations, colors },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ message: 'Cihaz modeli bulunamadı.' });
        }
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/device-models/:id', requireRole(['superadmin', 'yonetici']), async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await DeviceModel.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Cihaz modeli bulunamadı.' });
        }
        res.json({ success: true, message: 'Cihaz modeli silindi.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/device-models/seed', async (req, res) => {
    try {
        // Clear existing to update with full list
        await DeviceModel.deleteMany({});

        const devices = [
            // --- iPhones ---
            { name: 'iPhone 16 Pro Max', type: 'Phone', configurations: ['256GB', '512GB', '1TB'], colors: ['Desert Titanium', 'Natural Titanium', 'White Titanium', 'Black Titanium'] },
            { name: 'iPhone 16 Pro', type: 'Phone', configurations: ['128GB', '256GB', '512GB', '1TB'], colors: ['Desert Titanium', 'Natural Titanium', 'White Titanium', 'Black Titanium'] },
            { name: 'iPhone 16 Plus', type: 'Phone', configurations: ['128GB', '256GB', '512GB'], colors: ['Ultramarine', 'Teal', 'Pink', 'White', 'Black'] },
            { name: 'iPhone 16', type: 'Phone', configurations: ['128GB', '256GB', '512GB'], colors: ['Ultramarine', 'Teal', 'Pink', 'White', 'Black'] },
            { name: 'iPhone 15 Pro Max', type: 'Phone', configurations: ['256GB', '512GB', '1TB'], colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'] },
            { name: 'iPhone 15 Pro', type: 'Phone', configurations: ['128GB', '256GB', '512GB', '1TB'], colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'] },
            { name: 'iPhone 15 Plus', type: 'Phone', configurations: ['128GB', '256GB', '512GB'], colors: ['Pink', 'Yellow', 'Green', 'Blue', 'Black'] },
            { name: 'iPhone 15', type: 'Phone', configurations: ['128GB', '256GB', '512GB'], colors: ['Pink', 'Yellow', 'Green', 'Blue', 'Black'] },
            { name: 'iPhone 14 Pro Max', type: 'Phone', configurations: ['128GB', '256GB', '512GB', '1TB'], colors: ['Deep Purple', 'Gold', 'Silver', 'Space Black'] },
            { name: 'iPhone 13', type: 'Phone', configurations: ['128GB', '256GB', '512GB'], colors: ['Green', 'Pink', 'Blue', 'Midnight', 'Starlight', 'Red'] },
            { name: 'iPhone 13 mini', type: 'Phone', configurations: ['128GB', '256GB', '512GB'], colors: ['Green', 'Pink', 'Blue', 'Midnight', 'Starlight', 'Red'] },
            { name: 'iPhone 12 Pro Max', type: 'Phone', configurations: ['128GB', '256GB', '512GB'], colors: ['Pacific Blue', 'Gold', 'Graphite', 'Silver'] },
            { name: 'iPhone 12 Pro', type: 'Phone', configurations: ['128GB', '256GB', '512GB'], colors: ['Pacific Blue', 'Gold', 'Graphite', 'Silver'] },
            { name: 'iPhone 12', type: 'Phone', configurations: ['64GB', '128GB', '256GB'], colors: ['Blue', 'Green', 'Red', 'White', 'Black', 'Purple'] },
            { name: 'iPhone 11 Pro Max', type: 'Phone', configurations: ['64GB', '256GB', '512GB'], colors: ['Midnight Green', 'Silver', 'Space Gray', 'Gold'] },
            { name: 'iPhone 11', type: 'Phone', configurations: ['64GB', '128GB', '256GB'], colors: ['Green', 'Purple', 'White', 'Yellow', 'Black', 'Red'] },
            { name: 'iPhone XS Max', type: 'Phone', configurations: ['64GB', '256GB', '512GB'], colors: ['Gold', 'Silver', 'Space Gray'] },
            { name: 'iPhone XS', type: 'Phone', configurations: ['64GB', '256GB', '512GB'], colors: ['Gold', 'Silver', 'Space Gray'] },
            { name: 'iPhone XR', type: 'Phone', configurations: ['64GB', '128GB', '256GB'], colors: ['Blue', 'White', 'Black', 'Yellow', 'Coral', 'Red'] },
            { name: 'iPhone X', type: 'Phone', configurations: ['64GB', '256GB'], colors: ['Silver', 'Space Gray'] },
            { name: 'iPhone SE (3rd Gen)', type: 'Phone', configurations: ['64GB', '128GB', '256GB'], colors: ['Midnight', 'Starlight', 'Red'] },

            // --- iPads ---
            { name: 'iPad Pro 13" (M4)', type: 'Tablet', configurations: ['256GB', '512GB', '1TB', '2TB'], colors: ['Space Black', 'Silver'] },
            { name: 'iPad Pro 11" (M4)', type: 'Tablet', configurations: ['256GB', '512GB', '1TB', '2TB'], colors: ['Space Black', 'Silver'] },
            { name: 'iPad Air 13" (M2)', type: 'Tablet', configurations: ['128GB', '256GB', '512GB', '1TB'], colors: ['Space Gray', 'Starlight', 'Blue', 'Purple'] },
            { name: 'iPad Air 11" (M2)', type: 'Tablet', configurations: ['128GB', '256GB', '512GB', '1TB'], colors: ['Space Gray', 'Starlight', 'Blue', 'Purple'] },
            { name: 'iPad mini (A17 Pro)', type: 'Tablet', configurations: ['128GB', '256GB', '512GB'], colors: ['Space Gray', 'Blue', 'Purple', 'Starlight'] },
            { name: 'iPad (10th Gen)', type: 'Tablet', configurations: ['64GB', '256GB'], colors: ['Blue', 'Pink', 'Yellow', 'Silver'] },

            // --- Macs ---
            { name: 'MacBook Pro 14" (M4/Pro/Max)', type: 'Mac', configurations: ['512GB', '1TB', '2TB', '4TB'], colors: ['Space Black', 'Silver'] },
            { name: 'MacBook Pro 16" (M4/Pro/Max)', type: 'Mac', configurations: ['512GB', '1TB', '2TB', '4TB'], colors: ['Space Black', 'Silver'] },
            { name: 'MacBook Pro 14" (M3)', type: 'Mac', configurations: ['512GB', '1TB'], colors: ['Space Black', 'Silver'] },
            { name: 'MacBook Air 13" (M3)', type: 'Mac', configurations: ['256GB', '512GB'], colors: ['Midnight', 'Starlight', 'Space Gray', 'Silver'] },
            { name: 'MacBook Air 15" (M3)', type: 'Mac', configurations: ['256GB', '512GB'], colors: ['Midnight', 'Starlight', 'Space Gray', 'Silver'] },
            { name: 'iMac 24" (M4)', type: 'Mac', configurations: ['256GB', '512GB'], colors: ['Blue', 'Green', 'Pink', 'Silver', 'Yellow', 'Orange', 'Purple'] },
            { name: 'Mac mini (M4/Pro)', type: 'Mac', configurations: ['256GB', '512GB'], colors: ['Silver'] },
            { name: 'Mac Studio (M2 Max/Ultra)', type: 'Mac', configurations: ['512GB', '1TB', '2TB'], colors: ['Silver'] },

            // --- Wearables ---
            { name: 'Apple Watch Ultra 2', type: 'Watch', configurations: ['49mm'], colors: ['Black Titanium', 'Natural Titanium'] },
            { name: 'Apple Watch Series 10', type: 'Watch', configurations: ['42mm', '46mm'], colors: ['Jet Black', 'Rose Gold', 'Silver Titanium', 'Slate Titanium', 'Natural Titanium'] },
            { name: 'Apple Watch Series 9', type: 'Watch', configurations: ['41mm', '45mm'], colors: ['Midnight', 'Starlight', 'Silver', 'Pink', 'Red'] },
            { name: 'Apple Watch SE (2nd Gen)', type: 'Watch', configurations: ['40mm', '44mm'], colors: ['Midnight', 'Starlight', 'Silver'] },

            // --- New Categories ---
            { name: 'Apple Vision Pro', type: 'Vision', configurations: ['256GB', '512GB', '1TB'], colors: ['Standard'] },

            // --- Audio ---
            { name: 'AirPods Pro (2nd Gen) USB-C', type: 'Accessory', configurations: ['Standard'], colors: ['White'] },
            { name: 'AirPods 4', type: 'Accessory', configurations: ['Standard', 'Active Noise Cancellation'], colors: ['White'] },
            { name: 'AirPods Max (USB-C)', type: 'Accessory', configurations: ['Standard'], colors: ['Midnight', 'Starlight', 'Blue', 'Orange', 'Purple'] }
        ];

        await DeviceModel.insertMany(devices);
        res.json({ message: 'Device models seeded successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Notifications ---
router.get('/notifications', async (req, res) => {
    try {
        const filter = {};
        if (req.query.repairId) {
            filter.repairId = req.query.repairId;
        }
        const notifications = await Notification.find(filter).sort({ sentAt: -1 }).lean();
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/notifications', async (req, res) => {
    try {
        const notification = new Notification(req.body);
        const savedNotification = await notification.save();
        res.status(201).json(savedNotification);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// --- AI Routes ---
router.post('/ai/diagnose', async (req, res) => {
    const { deviceModel, issueDescription } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        return res.status(400).json({ 
            success: false, 
            message: 'Gemini API Key is missing or not configured. Please check your .env file.' 
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Sen bir Apple Yetkili Servis teknisyen asistanısın. 
            Cihaz: ${deviceModel}
            Müşteri Şikayeti: ${issueDescription}

            Lütfen bu bilgiler doğrultusunda şu formatta JSON cevabı ver:
            {
                "likelyCauses": ["Neden 1", "Neden 2"],
                "steps": ["Adım 1", "Adım 2"],
                "suggestedParts": ["Parça 1", "Parça 2"],
                "techNote": "Teknisyen için profesyonel not özeti..."
            }
            Sadece JSON formatında cevap ver, başka açıklama ekleme.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // JSON ayıklama (bazen AI markdown içinde verebiliyor)
        const jsonMatch = text.match(/\\{.*\\}/s) || text.match(/\\{.*\\}/);
        const diagnosis = JSON.parse(jsonMatch ? jsonMatch[0] : text);

        res.json({ success: true, diagnosis });
    } catch (error) {
        console.error('AI Diagnose Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/ai/enhance-message', async (req, res) => {
    const { rawMessage, customerName, deviceModel } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        return res.status(400).json({ 
            success: false, 
            message: 'Gemini API Key is missing.' 
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Aşağıdaki teknik notu, müşteri ${customerName} için, ${deviceModel} cihazı hakkında nazik, profesyonel ve kurumsal bir bilgilendirme mesajına dönüştür. 
            Mesaj Türkçe olmalı. 
            Not: ${rawMessage}
            
            Sadece geliştirilmiş mesaj metnini döndür.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ success: true, enhancedMessage: response.text().trim() });
    } catch (error) {
        console.error('AI Enhance Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- Store Management: Announcements ---
router.get('/store-announcements', async (req, res) => {
    try {
        const filter = {};
        const userRole = req.user?.role?.toLowerCase();
        const userStoreId = Number(req.user?.storeId);

        if (!userRole) {
            return res.status(403).json({ message: 'Yetkisiz erişim.' });
        }

        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        if (!isGlobalAdmin) {
            filter.storeId = userStoreId;
        } else if (req.query.storeId) {
            filter.storeId = Number(req.query.storeId);
        }

        const announcements = await StoreAnnouncement.find(filter).sort({ createdAt: -1 }).lean();
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/store-announcements', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    try {
        const userRole = req.user?.role?.toLowerCase();
        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        const bodyStoreId = Number(req.body.storeId);

        if (!isGlobalAdmin && bodyStoreId !== Number(req.user.storeId)) {
            return res.status(403).json({ message: 'Sadece kendi mağazanız için duyuru ekleyebilirsiniz.' });
        }

        const announcement = new StoreAnnouncement(req.body);
        const saved = await announcement.save();
        await createLog(req, 'CREATE_ANNOUNCEMENT', 'STORE_MANAGEMENT', `Yeni duyuru oluşturuldu: ${saved.title}`);
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/store-announcements/:id', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    try {
        const announcement = await StoreAnnouncement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ message: 'Duyuru bulunamadı.' });
        }

        const userRole = req.user?.role?.toLowerCase();
        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        if (!isGlobalAdmin && Number(announcement.storeId) !== Number(req.user.storeId)) {
            return res.status(403).json({ message: 'Sadece kendi mağazanızın duyurularını silebilirsiniz.' });
        }

        await announcement.deleteOne();
        await createLog(req, 'DELETE_ANNOUNCEMENT', 'STORE_MANAGEMENT', `Duyuru silindi: ${announcement.title}`);
        res.json({ success: true, message: 'Duyuru silindi.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Store Management: Tasks ---
router.get('/store-tasks', async (req, res) => {
    try {
        const filter = {};
        const userRole = req.user?.role?.toLowerCase();
        const userStoreId = Number(req.user?.storeId);

        if (!userRole) {
            return res.status(403).json({ message: 'Yetkisiz erişim.' });
        }

        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        if (!isGlobalAdmin) {
            filter.storeId = userStoreId;
        } else if (req.query.storeId) {
            filter.storeId = Number(req.query.storeId);
        }

        const tasks = await StoreTask.find(filter).sort({ createdAt: -1 }).lean();
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/store-tasks', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    try {
        const userRole = req.user?.role?.toLowerCase();
        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        const bodyStoreId = Number(req.body.storeId);

        if (!isGlobalAdmin && bodyStoreId !== Number(req.user.storeId)) {
            return res.status(403).json({ message: 'Sadece kendi mağazanız için görev ekleyebilirsiniz.' });
        }

        const task = new StoreTask(req.body);
        const saved = await task.save();
        await createLog(req, 'CREATE_TASK', 'STORE_MANAGEMENT', `Yeni görev oluşturuldu: ${saved.title}`);
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/store-tasks/:id', async (req, res) => {
    try {
        const task = await StoreTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Görev bulunamadı.' });
        }

        const userRole = req.user?.role?.toLowerCase();
        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        const isManager = ['storemanager'].includes(userRole);

        if (!isGlobalAdmin && !isManager && task.assignedTo !== req.user.name) {
            return res.status(403).json({ message: 'Sadece yöneticiler veya göreve atanan kişi güncelleyebilir.' });
        }

        if (!isGlobalAdmin && Number(task.storeId) !== Number(req.user.storeId)) {
            return res.status(403).json({ message: 'Sadece kendi mağazanızın görevlerini güncelleyebilirsiniz.' });
        }

        if (!isGlobalAdmin && req.body.storeId && Number(req.body.storeId) !== Number(req.user.storeId)) {
            return res.status(403).json({ message: 'Görevi başka bir mağazaya taşıyamazsınız.' });
        }

        const updated = await StoreTask.findByIdAndUpdate(req.params.id, req.body, { new: true });
        await createLog(req, 'UPDATE_TASK', 'STORE_MANAGEMENT', `Görev güncellendi: ${updated?.title} (Durum: ${updated?.status})`);
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/store-tasks/:id', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    try {
        const task = await StoreTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: 'Görev bulunamadı.' });
        }

        const userRole = req.user?.role?.toLowerCase();
        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        if (!isGlobalAdmin && Number(task.storeId) !== Number(req.user.storeId)) {
            return res.status(403).json({ message: 'Sadece kendi mağazanızın görevlerini silebilirsiniz.' });
        }

        await task.deleteOne();
        await createLog(req, 'DELETE_TASK', 'STORE_MANAGEMENT', `Görev silindi: ${task.title}`);
        res.json({ success: true, message: 'Görev silindi.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Store Shifts ---
router.get('/store-shifts', async (req, res) => {
    try {
        const filter = {};
        const userRole = req.user?.role?.toLowerCase();
        const userStoreId = Number(req.user?.storeId);

        if (!userRole) {
            return res.status(403).json({ message: 'Yetkisiz erişim.' });
        }

        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        if (!isGlobalAdmin) {
            filter.storeId = userStoreId;
        } else if (req.query.storeId) {
            filter.storeId = Number(req.query.storeId);
        }

        if (req.query.startDate && req.query.endDate) {
            filter.date = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }
        const shifts = await StoreShift.find(filter).sort({ date: 1, startTime: 1 }).lean();
        res.json(shifts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/store-shifts', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    try {
        const userRole = req.user?.role?.toLowerCase();
        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        const bodyStoreId = Number(req.body.storeId);

        if (!isGlobalAdmin && bodyStoreId !== Number(req.user.storeId)) {
            return res.status(403).json({ message: 'Sadece kendi mağazanız için vardiya ekleyebilirsiniz.' });
        }

        const shift = new StoreShift(req.body);
        const saved = await shift.save();
        await createLog(req, 'CREATE_SHIFT', 'STORE_MANAGEMENT', `Yeni vardiya oluşturuldu: ${saved.userName} - ${saved.shiftType} (${new Date(saved.date).toLocaleDateString('tr-TR')})`);
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/store-shifts/:id', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    try {
        const shift = await StoreShift.findById(req.params.id);
        if (!shift) {
            return res.status(404).json({ message: 'Vardiya bulunamadı.' });
        }

        const userRole = req.user?.role?.toLowerCase();
        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        if (!isGlobalAdmin && Number(shift.storeId) !== Number(req.user.storeId)) {
            return res.status(403).json({ message: 'Sadece kendi mağazanızın vardiyalarını güncelleyebilirsiniz.' });
        }

        if (!isGlobalAdmin && req.body.storeId && Number(req.body.storeId) !== Number(req.user.storeId)) {
            return res.status(403).json({ message: 'Vardiyayı başka bir mağazaya taşıyamazsınız.' });
        }

        const updated = await StoreShift.findByIdAndUpdate(req.params.id, req.body, { new: true });
        await createLog(req, 'UPDATE_SHIFT', 'STORE_MANAGEMENT', `Vardiya güncellendi: ${updated?.userName} - ${updated?.shiftType}`);
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/store-shifts/bulk-delete', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    try {
        const userRole = req.user?.role?.toLowerCase();
        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        const { storeId, startDate, endDate } = req.query;

        if (!storeId || !startDate || !endDate) {
            return res.status(400).json({ message: 'storeId, startDate ve endDate parametreleri zorunludur.' });
        }

        if (!isGlobalAdmin && Number(storeId) !== Number(req.user.storeId)) {
            return res.status(403).json({ message: 'Sadece kendi mağazanızın vardiyalarını silebilirsiniz.' });
        }

        const filter = {
            storeId: Number(storeId),
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        };

        const result = await StoreShift.deleteMany(filter);
        await createLog(req, 'DELETE_SHIFT_BULK', 'STORE_MANAGEMENT', `${storeId} nolu mağazada ${startDate} - ${endDate} arası ${result.deletedCount} vardiya silindi.`);
        res.json({ success: true, message: `${result.deletedCount} vardiya silindi.`, deletedCount: result.deletedCount });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/store-shifts/:id', requireRole(['superadmin', 'storemanager']), async (req, res) => {
    try {
        const shift = await StoreShift.findById(req.params.id);
        if (!shift) {
            return res.status(404).json({ message: 'Vardiya bulunamadı.' });
        }

        const userRole = req.user?.role?.toLowerCase();
        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(userRole);
        if (!isGlobalAdmin && Number(shift.storeId) !== Number(req.user.storeId)) {
            return res.status(403).json({ message: 'Sadece kendi mağazanızın vardiyalarını silebilirsiniz.' });
        }

        await shift.deleteOne();
        await createLog(req, 'DELETE_SHIFT', 'STORE_MANAGEMENT', `Vardiya silindi: ${shift.userName} - ${shift.shiftType}`);
        res.json({ success: true, message: 'Vardiya silindi.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Müşteri Memnuniyeti (günlük, mağaza bazlı) ---
router.get('/satisfaction', async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        const canViewAll = ['superadmin', 'admin', 'yonetici'].includes(role);
        const query = {};
        if (!canViewAll) {
            query.storeId = req.user?.storeId ?? null;
        } else if (req.query.storeId && req.query.storeId !== '0') {
            query.storeId = Number(req.query.storeId);
        }
        if (req.query.from || req.query.to) {
            query.date = {};
            if (req.query.from) query.date.$gte = req.query.from;
            if (req.query.to) query.date.$lte = req.query.to;
        }
        const entries = await Satisfaction.find(query).sort({ date: -1 }).limit(500).lean();
        res.json(entries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/satisfaction', async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        const canViewAll = ['superadmin', 'admin', 'yonetici'].includes(role);
        // Herkes yalnızca kendi mağazasına girer; yönetici belirli bir mağaza seçebilir
        let storeId = canViewAll ? Number(req.body.storeId) : Number(req.user?.storeId);
        if (!storeId || Number.isNaN(storeId)) {
            return res.status(400).json({ message: 'Geçerli bir mağaza bilgisi bulunamadı.' });
        }
        const date = req.body.date;
        if (!date) {
            return res.status(400).json({ message: 'Tarih (date) zorunludur.' });
        }
        const doc = await Satisfaction.findOneAndUpdate(
            { storeId, date },
            {
                storeId,
                date,
                satisfied: Math.max(0, Number(req.body.satisfied) || 0),
                neutral: Math.max(0, Number(req.body.neutral) || 0),
                dissatisfied: Math.max(0, Number(req.body.dissatisfied) || 0),
                createdBy: req.user?.name || 'Sistem',
                userId: req.user?.id
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        await createLog(req, 'SET_SATISFACTION', 'STORE_MANAGEMENT', `Günlük memnuniyet verisi girildi (${date}): Memnun ${doc.satisfied} / Nötr ${doc.neutral} / Memnun değil ${doc.dissatisfied}`, storeId);
        res.json(doc);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Recent Activity Feed (mağaza bazlı son eklenen/çıkarılan/güncellenen) ---
router.get('/system/recent-activity', async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        const canViewAll = ['superadmin', 'admin', 'yonetici'].includes(role);

        // Sadece veri hareketlerini göster (LOGIN gibi oturum olaylarını hariç tut)
        const query = { module: { $in: ['REPAIR', 'INVENTORY', 'CUSTOMER', 'STORE_MANAGEMENT'] } };

        if (!canViewAll) {
            // Yönetici olmayan kullanıcı sadece kendi mağazasını görür
            query.storeId = req.user?.storeId ?? null;
        } else if (req.query.storeId && req.query.storeId !== '0') {
            // Yönetici belirli bir mağazaya filtrelemek isterse
            query.storeId = Number(req.query.storeId);
        }

        const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
        const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(limit).lean();
        res.json(logs);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- Audit Logs ---
router.get('/system/audit-logs', requireRole(['superadmin']), async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).lean();
        res.json(logs);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;
