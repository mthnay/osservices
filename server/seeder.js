import Repair from './models/Repair.js';
import User from './models/User.js';
import Inventory from './models/Inventory.js';
import Technician from './models/Technician.js';
import ServicePoint from './models/ServicePoint.js';
import SystemSetting from './models/SystemSetting.js';
import Role from './models/Role.js';
import bcrypt from 'bcryptjs';

const initialServicePoints = [
    { id: 1, name: 'Troy Servis İstinyePark', type: 'Merkez', address: 'İstinyePark AVM', phone: '0212 345 67 89' },
    { id: 2, name: 'Troy Servis Kanyon', type: 'Şube', address: 'Kanyon AVM', phone: '0212 987 65 43' }
];

const initialUsers = [
    { id: 'u1', name: 'Admin User', email: 'admin@troy.com', password: '123', role: 'Admin', storeId: 1, avatar: 'AD' },
    { id: 'u2', name: 'Ayşe Yılmaz', email: 'ayse@troy.com', password: '123', role: 'Ön Karşılama', storeId: 1, avatar: 'AY' },
    { id: 'u3', name: 'Mehmet Demir', email: 'mehmet@troy.com', password: '123', role: 'Teknisyen', storeId: 1, avatar: 'MD' },
    { id: 'u4', name: 'Ali Veli', email: 'ali@troy.com', password: '123', role: 'Lojistik', storeId: 1, avatar: 'AV' },
    { id: 'u5', name: 'Zeynep Kaya', email: 'zeynep@troy.com', password: '123', role: 'Ön Karşılama', storeId: 2, avatar: 'ZK' },
];

const initialRepairs = [
    { id: 'TR-1001', device: 'iPhone 13 - Mavi', customer: 'Ahmet Yılmaz', customerPhone: '0532 000 00 01', status: 'Beklemede', date: '28.01.2024 10:00', storeId: 1, issue: 'Ekran kırık', history: [{ status: 'Kayıt Oluşturuldu', date: '28.01.2024 10:00', note: 'Cihaz servise kabul edildi.' }] },
    {
        id: 'TR-1002',
        device: 'iPhone 14 Pro - Uzay Siyahı',
        customer: 'Ayşe Demir',
        customerPhone: '0532 000 00 02',
        status: 'Teslim Edildi',
        date: '20.01.2024 11:30',
        storeId: 1,
        serial: 'G6TDFL89N7V',
        warrantyStatus: 'AppleCare+',
        visualCondition: ['Ekran Çizik', 'Kasa Darbe'],
        findMyOff: true,
        backupTaken: true,
        issue: 'Ekran titremesi ve batarya çabuk bitiyor',
        diagnosisNotes: 'Ekran paneli arızalı, batarya sağlığı %78. Her iki parçanın değişimi kararlaştırıldı.',
        tests: 'FaceID ok, Truetone ok, Dokunmatik hassasiyeti ok, Batarya döngüsü: 840',
        quoteAmount: '6850.00',
        repairClosingNote: 'Cihazın ekranı ve bataryası orijinal parçalarla değiştirildi. Sıvı koruma contaları yenilendi. Tüm fonksiyon testleri başarıyla tamamlandı.',
        steps: [
            { id: 1, label: 'Cihazın dış kozmetik kontrolü yapıldı', checked: true },
            { id: 2, label: 'Güvenlik vidaları söküldü', checked: true },
            { id: 3, label: 'Ekran flex kabloları ayrıldı', checked: true },
            { id: 4, label: 'Batarya bağlantısı kesildi', checked: true },
            { id: 5, label: 'Yeni parça montajı yapıldı', checked: true },
            { id: 6, label: 'Cihaz kapatıldı ve vidalandı', checked: true },
            { id: 7, label: 'Yazılımsal testler tamamlandı', checked: true }
        ],
        parts: [
            { id: 'P1', description: 'iPhone 14 Pro Ekran (Orijinal)', partNumber: '661-23145' },
            { id: 'P2', description: 'iPhone 14 Pro Batarya', partNumber: '616-00043' }
        ],
        mediaFiles: [
            { url: 'https://images.unsplash.com/photo-1592890288564-76628a30a657?w=150&h=150&fit=crop', id: 1 },
            { url: 'https://images.unsplash.com/photo-1580227974550-92787c80a068?w=150&h=150&fit=crop', id: 2 }
        ],
        history: [
            { status: 'Kayıt Oluşturuldu', date: '20.01.2024 11:30', note: 'Cihaz servise kabul edildi.' },
            { status: 'İşlemde', date: '20.01.2024 14:00', note: 'Onarım süreci başlatıldı. Parçalar stoktan çekildi.' },
            { status: 'Cihaz Hazır', date: '21.01.2024 10:00', note: 'Onarım tamamlandı, tüm testlerden geçti.' },
            { status: 'Teslim Edildi', date: '21.01.2024 16:30', note: 'Cihaz müşteriye form ile teslim edildi.' }
        ]
    },
    { id: 'TR-1003', device: 'iPad Air 5', customer: 'Mehmet Kaya', customerPhone: '0532 000 00 03', status: 'Müşteri Onayı Bekliyor', date: '28.01.2024 12:15', storeId: 2, issue: 'Şarj olmuyor', quoteAmount: '3500.00', diagnosisNotes: 'Şarj entegresi ve batarya değişimi gerekiyor.', history: [{ status: 'Teklif Sunuldu', date: '28.01.2024 14:00', note: 'Müşteriye 3500 TL teklif iletildi.' }] }
];

const initialInventory = [
    { id: 'P-101', name: 'iPhone 13 Ekran (Orijinal)', category: 'iPhone', type: 'Ekran', quantity: 4, minLevel: 5, price: 5500, location: 'Raf A-1', storeId: 1 },
    { id: 'P-102', name: 'iPhone 11 Batarya', category: 'iPhone', type: 'Batarya', quantity: 12, minLevel: 10, price: 1200, location: 'Raf A-2', storeId: 1 },
    { id: 'P-103', name: 'MacBook Air M1 Ekran', category: 'Mac', type: 'Ekran', quantity: 2, minLevel: 3, price: 8500, location: 'Raf B-1', storeId: 2 },
];

const initialTechnicians = [];

const initialSystemSettings = [
    {
        key: 'emailConfig',
        value: {
            host: 'mail.troyapr.com',
            port: 587,
            user: 'info@troyapr.com',
            pass: 'password_here'
        }
    }
];

export const seedData = async () => {
    try {
        const userCount = await User.countDocuments();
        console.log(`[SEEDER] Current User count: ${userCount}`);

        if (userCount === 0) {
            console.log('[SEEDER] Database is empty. Seeding initial users...');
            const hashedUsers = initialUsers.map(user => ({
                ...user,
                password: bcrypt.hashSync(user.password, 10)
            }));
            await User.insertMany(hashedUsers);
            console.log('[SEEDER] Users seeded with hashed passwords:', initialUsers.map(u => u.email).join(', '));
        } else {
            console.log('[SEEDER] Database already contains users. Skipping user seeding.');
        }

        if (await Repair.countDocuments() === 0) {
            await Repair.insertMany(initialRepairs);
            console.log('[SEEDER] Repairs seeded');
        }
        if (await Inventory.countDocuments() === 0) {
            await Inventory.insertMany(initialInventory);
            console.log('[SEEDER] Inventory seeded');
        }
        if (await Technician.countDocuments() === 0) {
            await Technician.insertMany(initialTechnicians);
            console.log('[SEEDER] Technicians seeded');
        }
        if (await ServicePoint.countDocuments() === 0) {
            await ServicePoint.insertMany(initialServicePoints);
            console.log('[SEEDER] ServicePoints seeded');
        }
        if (await SystemSetting.countDocuments() === 0) {
            await SystemSetting.insertMany(initialSystemSettings);
            console.log('[SEEDER] SystemSettings seeded');
        }

        // Seed default roles if none exist
        const roleCount = await Role.countDocuments();
        if (roleCount === 0) {
            const defaultRoles = [
                { name: 'superadmin', displayName: 'Super Admin', permissions: ['view_all_stores', 'manage_users', 'manage_settings', 'manage_stock'], isSystem: true },
                { name: 'storemanager', displayName: 'Mağaza Müdürü', permissions: ['manage_stock', 'delete_repair'], isSystem: true },
                { name: 'servis_sorumlusu', displayName: 'Servis Sorumlusu', permissions: ['manage_stock', 'delete_repair'], isSystem: true },
                { name: 'reception', displayName: 'Resepsiyon', permissions: ['manage_stock'], isSystem: true },
                { name: 'technician', displayName: 'Teknisyen', permissions: [], isSystem: true },
                { name: 'accountant', displayName: 'Muhasebe', permissions: ['view_all_stores'], isSystem: true }
            ];
            await Role.insertMany(defaultRoles);
            console.log('[SEEDER] Default roles seeded successfully');
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
                console.log('[SEEDER] Seeded servis_sorumlusu role');
            }
        }
    } catch (error) {
        console.error('[SEEDER] ERROR:', error);
    }
};
