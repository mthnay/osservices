/* ------------------------------------------------------------------
   Modül Erişim Haritası
   ------------------------------------------------------------------
   Hangi ekranın hangi yetkiyi gerektirdiği tek yerde tanımlıdır.
   Sidebar menüyü buna göre süzer, App.jsx de sekmeyi buna göre açar;
   böylece menü gizlense bile ekran doğrudan açılamaz.
------------------------------------------------------------------ */

/** Sol menüde görünen modüller (sıra menüdeki sırayı belirler) */
export const MODULE_MENU = [
    { id: 'dashboard', label: 'Genel Bakış', permission: 'view_dashboard' },
    { id: 'service', label: 'Servis Kabul', permission: 'create_repair' },
    { id: 'pending-repairs', label: 'İşlem Bekleyenler', permission: 'view_repairs' },
    { id: 'approval-pending', label: 'Müşteri Onayı', permission: 'view_repairs' },
    { id: 'customers', label: 'Müşteriler (CRM)', permission: 'view_customers' },
    { id: 'marketing', label: 'Pzr. & Otomasyon', permission: 'send_customer_message' },
    { id: 'stock', label: 'Envanter ve Stok', permission: 'view_stock' },
    { id: 'in-store', label: 'Mağaza İçi Onarım', permission: 'view_repairs' },
    { id: 'ready-pickup', label: 'Hazırlar', permission: 'view_repairs' },
    { id: 'archive', label: 'Servis Arşivi', permission: 'view_archive' },
    { id: 'apple-center', label: 'Apple Onarım Merk.', permission: 'view_repairs' },
    { id: 'technicians', label: 'Teknisyenler', permission: 'view_technicians' },
    { id: 'reports', label: 'Raporlar', permission: 'view_reports' },
    { id: 'settings', label: 'Ayarlar', permission: 'manage_settings' },
];

/** Menüde görünmeyen ama yönlendirmeyle açılabilen ekranlar */
const EXTRA_MODULES = [
    { id: 'store-operations', label: 'Mağaza Operasyonu', permission: 'view_store_operations' },
    { id: 'store-management', label: 'Mağaza Yönetimi', permission: 'view_store_operations' },
];

export const MODULE_ACCESS = [...MODULE_MENU, ...EXTRA_MODULES].reduce((acc, item) => {
    acc[item.id] = item.permission;
    return acc;
}, {});

/** Bir sekmenin gerektirdiği yetki (tanımsızsa serbest kabul edilir) */
export const permissionForTab = (tabId) => MODULE_ACCESS[tabId] || null;

/**
 * Kullanıcı bu sekmeyi açabilir mi?
 * @param {(user: object, permission: string) => boolean} hasPermission
 */
export const canOpenTab = (hasPermission, user, tabId) => {
    const permission = permissionForTab(tabId);
    if (!permission) return true;
    return hasPermission(user, permission);
};

/** Kullanıcının erişebildiği ilk modül — açılış sekmesi için */
export const firstAllowedTab = (hasPermission, user) => {
    const found = MODULE_MENU.find(item => hasPermission(user, item.permission));
    return found ? found.id : null;
};
