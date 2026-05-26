// src/utils/permissions.js

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
        'manage_stock', 
        'edit_repairs',
        'view_earnings',
        'view_kbb',
        'view_technicians'
    ],
    [ROLES.ACCOUNTANT]: [
        'view_earnings',
        'manage_stock',
        'view_kbb',
        'view_dashboard'
    ],
    [ROLES.RECEPTION]: [
        'create_repair', 
        'view_repairs'
    ],
    [ROLES.TECHNICIAN]: [
        'edit_repairs', 
        'view_own_repairs',
        'view_repairs'
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

export const hasPermission = (user, permission) => {
    if (!user || !user.role) return false;
    
    // Map roles for compatibility (case-insensitive normalization)
    let userRole = user.role.toLowerCase();
    if (userRole === 'admin') userRole = ROLES.SUPER_ADMIN;
    if (userRole === 'teknisyen') userRole = ROLES.TECHNICIAN;
    if (userRole === 'yonetici') userRole = ROLES.YONETICI;
    if (userRole === 'muhasebe' || userRole === 'logistic') userRole = ROLES.ACCOUNTANT;
    if (userRole === 'servissorumlusu' || userRole === 'servis_sorumlusu') userRole = ROLES.STORE_MANAGER;

    // First check dynamic roles
    const dynamicRole = dynamicRoles.find(r => r.name.toLowerCase() === userRole || r.displayName.toLowerCase() === userRole);
    if (dynamicRole) {
        // If it's a dynamic role, check its permissions array
        return dynamicRole.permissions && dynamicRole.permissions.includes(permission);
    }

    // Fallback to static mapping if dynamic role not found
    const permissions = ROLE_PERMISSIONS[userRole];
    return permissions ? permissions.includes(permission) : false;
};
