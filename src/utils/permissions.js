// src/utils/permissions.js
import { listHasPermission, PERMISSION_IDS, isLegacyPermissionSet } from './permissionCatalog';

export const ROLES = {
    SUPER_ADMIN: 'superadmin',
    YONETICI: 'yonetici',
    STORE_MANAGER: 'storemanager',
    SERVICE_SUPERVISOR: 'servis_sorumlusu',
    RECEPTION: 'reception',
    TECHNICIAN: 'technician',
    ACCOUNTANT: 'accountant'
};

export const ROLE_DISPLAY_NAMES = {
    [ROLES.SUPER_ADMIN]: 'SÜPER ADMİN',
    [ROLES.YONETICI]: 'YÖNETİCİ',
    [ROLES.STORE_MANAGER]: 'MAĞAZA YÖNETİCİSİ',
    [ROLES.SERVICE_SUPERVISOR]: 'SERVİS SORUMLUSU',
    [ROLES.RECEPTION]: 'BANKO / KARŞILAMA',
    [ROLES.TECHNICIAN]: 'TEKNİSYEN',
    [ROLES.ACCOUNTANT]: 'MUHASEBE',
    'muhasebe': 'MUHASEBE',
    'logistic': 'MUHASEBE',
    'teknisyen': 'TEKNİSYEN',
    'servis_sorumlusu': 'SERVİS SORUMLUSU',
    'servissorumlusu': 'SERVİS SORUMLUSU'
};

let dynamicRoles = [];

export const setGlobalRoles = (roles) => {
    dynamicRoles = roles;
};

const ROLE_PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: [
        'view_all_stores', 
        'manage_settings', 
        'manage_users', 
        'view_dashboard', 
        'manage_stock', 
        'edit_repairs',
        'delete_repairs',
        'view_earnings',
        'view_kbb',
        'view_technicians'
    ],
    [ROLES.YONETICI]: [
        'view_all_stores',
        'manage_settings',
        'manage_users',
        'view_dashboard',
        'manage_stock',
        'edit_repairs',
        'delete_repairs',
        'view_earnings',
        'view_kbb',
        'view_technicians'
    ],
    [ROLES.STORE_MANAGER]: [
        'view_dashboard',
        'view_reports',
        'manage_stock',
        'transfer_stock',
        'edit_repairs',
        'create_repair',
        'view_repairs',
        'delete_repairs',
        'view_archive',
        'view_customers',
        'manage_customers',
        'send_customer_message',
        'view_earnings',
        'export_data',
        'view_kbb',
        'view_technicians',
        'manage_technicians',
        'assign_jobs',
        'view_store_operations'
    ],
    [ROLES.ACCOUNTANT]: [
        'view_earnings',
        'export_data',
        'manage_stock',
        'view_kbb',
        'view_dashboard',
        'view_reports',
        'view_archive',
        'view_customers'
    ],
    [ROLES.RECEPTION]: [
        'create_repair',
        'view_repairs',
        'view_archive',
        'view_customers',
        'manage_customers',
        'view_store_operations'
    ],
    [ROLES.TECHNICIAN]: [
        'edit_repairs',
        'view_own_repairs',
        'view_repairs',
        'view_stock',
        'view_kbb',
        'view_technicians'
    ]
};

export const isSuperAdmin = (user) => {
    if (!user || !user.role) return false;
    const r = user.role.toLowerCase();
    return r === 'superadmin' || r === 'admin';
};

export const isYonetici = (user) => {
    if (!user || !user.role) return false;
    return user.role.toLowerCase() === 'yonetici';
};

export const canManageSuperAdmins = (currentUser) => {
    return isSuperAdmin(currentUser) && !isYonetici(currentUser);
};

// Kullanıcının erişebildiği mağaza id'leri (birincil storeId + storeIds birleşimi)
export const getAccessibleStoreIds = (user) => {
    if (!user) return [];
    const ids = new Set();
    const add = (v) => {
        if (v === null || v === undefined || v === '') return;
        const n = Number(v);
        if (!Number.isNaN(n)) ids.add(n);
    };
    add(user.storeId);
    (user.storeIds || []).forEach(add);
    return [...ids];
};

// Kullanıcı belirtilen mağazaya erişebilir mi? (yetkili hesaplar tümüne erişir)
export const canAccessStore = (user, storeId) => {
    if (!user) return false;
    if (hasPermission(user, 'view_all_stores')) return true;
    return getAccessibleStoreIds(user).map(String).includes(String(storeId));
};

/** Rol adını sistemin tek sözlüğüne indirger */
export const normalizeRoleName = (role) => {
    let userRole = String(role || '').toLowerCase();
    if (userRole === 'admin') return ROLES.SUPER_ADMIN;
    if (userRole === 'teknisyen') return ROLES.TECHNICIAN;
    if (userRole === 'yonetici') return ROLES.YONETICI;
    if (userRole === 'muhasebe' || userRole === 'logistic') return ROLES.ACCOUNTANT;
    if (userRole === 'servissorumlusu' || userRole === 'servis_sorumlusu') return ROLES.STORE_MANAGER;
    return userRole;
};

/** Tam yetkili roller: yetki listesinden bağımsız olarak her şeye erişir */
const FULL_ACCESS_ROLES = [ROLES.SUPER_ADMIN, ROLES.YONETICI];

/** Bir rolün ham (kapsama uygulanmamış) yetki listesi */
export const getRolePermissions = (role) => {
    const userRole = normalizeRoleName(role);
    if (FULL_ACCESS_ROLES.includes(userRole)) return [...PERMISSION_IDS];

    const dynamicRole = dynamicRoles.find(r =>
        String(r.name || '').toLowerCase() === userRole ||
        String(r.displayName || '').toLowerCase() === userRole
    );
    const baseline = ROLE_PERMISSIONS[userRole] || [];

    if (!dynamicRole) return baseline;

    const granted = dynamicRole.permissions || [];

    // Rol henüz yeni yetki ekranından kaydedilmediyse (sunucu tohumları çok dar
    // listelerle geliyor) yerleşik rol varsayılanı taban olarak eklenir; böylece
    // katalog genişlerken mevcut roller erişimini kaybetmez.
    // İlk kayıttan sonra liste açıktır ve yetki kaldırma da geçerli olur.
    if (isLegacyPermissionSet(granted)) {
        return [...new Set([...baseline, ...granted])];
    }
    return granted;
};

export const hasPermission = (user, permission) => {
    if (!user || !user.role) return false;

    const userRole = normalizeRoleName(user.role);
    // Süper admin ve yönetici her zaman tam yetkilidir
    if (FULL_ACCESS_ROLES.includes(userRole)) return true;

    // listHasPermission; kapsama (implies) ve eski isimleri (aliases) birlikte değerlendirir,
    // böylece katalog büyüdüğünde mevcut roller erişimini kaybetmez.
    return listHasPermission(getRolePermissions(user.role), permission);
};
