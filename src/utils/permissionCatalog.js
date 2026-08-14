/* ------------------------------------------------------------------
   Yetki Kataloğu — TEK KAYNAK
   ------------------------------------------------------------------
   Sistemdeki tüm yetki alanları burada tanımlanır. Rol yönetimi ekranı
   bu katalogdan beslenir; hasPermission() de aynı katalogdaki kapsama
   (implies) ve eski ad (aliases) bilgilerini kullanır.

   Kategori  -> ekranda gruplama
   risk      -> 'normal' | 'high' | 'critical' (kritik yetkiler uyarı ister)
   implies   -> bu yetki verildiğinde otomatik kazanılan alt yetkiler
   aliases   -> geçmişte kullanılmış eski isimler (geriye dönük uyumluluk)
------------------------------------------------------------------ */

export const PERMISSION_CATEGORIES = [
    { id: 'repairs', label: 'Servis Kayıtları', description: 'Servis kabul, onarım ve arşiv işlemleri' },
    { id: 'customers', label: 'Müşteriler', description: 'CRM kayıtları ve müşteri iletişimi' },
    { id: 'inventory', label: 'Envanter & Ambar', description: 'Stok, ambar ve KBB süreçleri' },
    { id: 'operations', label: 'Teknisyen & Operasyon', description: 'Atama, teknisyen ve mağaza operasyonu' },
    { id: 'finance', label: 'Finans & Raporlama', description: 'Ciro, hakediş ve raporlar' },
    { id: 'system', label: 'Sistem & Güvenlik', description: 'Ayarlar, kullanıcı ve yetki yönetimi' },
];

export const PERMISSIONS = [
    /* --------------------------- Servis Kayıtları --------------------------- */
    {
        id: 'create_repair', category: 'repairs', risk: 'normal',
        label: 'Servis kaydı aç',
        description: 'Yeni servis kabul kaydı oluşturabilir.',
        implies: ['view_repairs'],
    },
    {
        id: 'view_repairs', category: 'repairs', risk: 'normal',
        label: 'Servis kayıtlarını gör',
        description: 'Mağazasındaki tüm servis kayıtlarını görüntüler.',
    },
    {
        id: 'view_own_repairs', category: 'repairs', risk: 'normal',
        label: 'Yalnızca kendi kayıtlarını gör',
        description: 'Sadece kendisine atanmış kayıtları görür (kısıtlayıcı yetki).',
    },
    {
        id: 'edit_repairs', category: 'repairs', risk: 'normal',
        label: 'Servis kayıtlarını düzenle',
        description: 'Kayıt bilgilerini, teşhis ve notları güncelleyebilir.',
        implies: ['view_repairs'],
    },
    {
        id: 'delete_repairs', category: 'repairs', risk: 'critical',
        label: 'Servis kaydı sil',
        description: 'Servis kaydını veritabanından kalıcı olarak siler.',
        aliases: ['delete_repair'],
    },
    {
        id: 'view_archive', category: 'repairs', risk: 'normal',
        label: 'Servis arşivini gör',
        description: 'Kapanmış/teslim edilmiş kayıtların arşivine erişir.',
        aliases: ['view_repairs'],
    },

    /* ------------------------------ Müşteriler ------------------------------ */
    {
        id: 'view_customers', category: 'customers', risk: 'normal',
        label: 'Müşterileri gör',
        description: 'CRM müşteri listesini görüntüler.',
        aliases: ['view_repairs', 'create_repair'],
    },
    {
        id: 'manage_customers', category: 'customers', risk: 'normal',
        label: 'Müşteri ekle / düzenle',
        description: 'Müşteri kaydı oluşturur ve bilgilerini günceller.',
        implies: ['view_customers'],
    },
    {
        id: 'delete_customers', category: 'customers', risk: 'high',
        label: 'Müşteri sil',
        description: 'Müşteri kaydını kalıcı olarak siler.',
    },
    {
        id: 'send_customer_message', category: 'customers', risk: 'high',
        label: 'Müşteriye mesaj / bildirim gönder',
        description: 'WhatsApp, SMS ve e-posta bildirimleri ile pazarlama gönderimleri.',
        implies: ['view_customers'],
    },

    /* --------------------------- Envanter & Ambar --------------------------- */
    {
        id: 'view_stock', category: 'inventory', risk: 'normal',
        label: 'Stoğu gör',
        description: 'Envanter ve parça listesini görüntüler.',
        aliases: ['manage_stock'],
    },
    {
        id: 'manage_stock', category: 'inventory', risk: 'normal',
        label: 'Stok yönetimi',
        description: 'Parça girişi, çıkışı ve stok düzeltmesi yapar.',
        implies: ['view_stock'],
    },
    {
        id: 'transfer_stock', category: 'inventory', risk: 'high',
        label: 'Ambarlar arası transfer',
        description: 'Parça ve ödünç cihazları ambarlar arasında taşır.',
        implies: ['view_stock'],
    },
    {
        id: 'manage_warehouses', category: 'inventory', risk: 'critical',
        label: 'Ambar ekle / kaldır',
        description: 'Ambar tanımlarını oluşturur veya sistemden kaldırır.',
        implies: ['view_stock'],
    },
    {
        id: 'view_kbb', category: 'inventory', risk: 'normal',
        label: 'KBB süreçlerini gör',
        description: 'Sökülen eski parça (KBB) yönetimi ve arşivi.',
    },

    /* ------------------------ Teknisyen & Operasyon ------------------------ */
    {
        id: 'view_technicians', category: 'operations', risk: 'normal',
        label: 'Teknisyenleri gör',
        description: 'Teknisyen listesi ve performans verileri.',
    },
    {
        id: 'manage_technicians', category: 'operations', risk: 'high',
        label: 'Teknisyen yönetimi',
        description: 'Teknisyen ekler, düzenler ve sistemden kaldırır.',
        implies: ['view_technicians'],
    },
    {
        id: 'assign_jobs', category: 'operations', risk: 'normal',
        label: 'İş atama',
        description: 'Servis kayıtlarını teknisyenlere atar ve iş akışını yönetir.',
        implies: ['view_technicians'],
    },
    {
        id: 'view_store_operations', category: 'operations', risk: 'normal',
        label: 'Mağaza operasyonlarını gör',
        description: 'Vardiya, görev ve mağaza duyuruları ekranı.',
    },

    /* -------------------------- Finans & Raporlama -------------------------- */
    {
        id: 'view_dashboard', category: 'finance', risk: 'normal',
        label: 'Genel bakış panelini gör',
        description: 'Ana gösterge paneline erişir.',
    },
    {
        id: 'view_reports', category: 'finance', risk: 'normal',
        label: 'Raporları gör',
        description: 'Performans ve operasyon raporlarını görüntüler.',
        aliases: ['view_dashboard'],
    },
    {
        id: 'view_earnings', category: 'finance', risk: 'high',
        label: 'Ciro / hakediş gör',
        description: 'Gelir, ciro ve hakediş verilerine erişir.',
    },
    {
        id: 'export_data', category: 'finance', risk: 'high',
        label: 'Veri dışa aktar',
        description: 'Toplu dışa aktarma ve PDF/Excel çıktısı alır.',
    },

    /* --------------------------- Sistem & Güvenlik --------------------------- */
    {
        id: 'view_all_stores', category: 'system', risk: 'high',
        label: 'Tüm mağazaları gör',
        description: 'Kendi mağazası dışındaki tüm mağaza verilerine erişir.',
    },
    {
        id: 'manage_settings', category: 'system', risk: 'critical',
        label: 'Sistem ayarlarını yönet',
        description: 'Ayarlar bölümünün tamamına erişir (kurumsal kimlik, ambar, katalog).',
        implies: ['view_dashboard'],
    },
    {
        id: 'manage_users', category: 'system', risk: 'critical',
        label: 'Kullanıcı yönetimi',
        description: 'Personel hesabı oluşturur, düzenler ve siler.',
    },
    {
        id: 'manage_roles', category: 'system', risk: 'critical',
        label: 'Rol ve yetki yönetimi',
        description: 'Rolleri ve bu rollerin yetkilerini değiştirir.',
    },
    {
        id: 'manage_security', category: 'system', risk: 'critical',
        label: 'Güvenlik yönetimi',
        description: 'Şifre belirler ve kullanıcıların sistem erişimini açar/kapatır.',
    },
    {
        id: 'view_audit_logs', category: 'system', risk: 'high',
        label: 'Sistem günlüklerini gör',
        description: 'Denetim kayıtlarını (audit log) görüntüler.',
    },
];

export const PERMISSION_MAP = PERMISSIONS.reduce((acc, permission) => {
    acc[permission.id] = permission;
    return acc;
}, {});

export const PERMISSION_IDS = PERMISSIONS.map(p => p.id);

export const RISK_LABELS = {
    normal: 'Standart',
    high: 'Yüksek',
    critical: 'Kritik',
};

/** Verilen yetki listesinden, kapsama (implies) kurallarıyla genişletilmiş küme */
export const expandPermissions = (granted) => {
    const result = new Set();
    const queue = [...(granted || [])];

    while (queue.length > 0) {
        const id = queue.pop();
        if (!id || result.has(id)) continue;
        result.add(id);

        const implied = PERMISSION_MAP[id]?.implies || [];
        implied.forEach(next => { if (!result.has(next)) queue.push(next); });
    }
    return result;
};

/**
 * Bir rolün yetki listesinde `permissionId` var mı?
 * Doğrudan verilmiş olabilir, kapsama yoluyla gelmiş olabilir ya da
 * eski bir isimle (alias) kayıtlı olabilir.
 */
export const listHasPermission = (granted, permissionId) => {
    const expanded = expandPermissions(granted);
    if (expanded.has(permissionId)) return true;

    const aliases = PERMISSION_MAP[permissionId]?.aliases || [];
    return aliases.some(alias => expanded.has(alias));
};

export const permissionsByCategory = (categoryId) =>
    PERMISSIONS.filter(p => p.category === categoryId);

/**
 * Katalog genişlemeden önce sistemde var olan yetki isimleri.
 * Sunucudaki rol tohumları çok dar listelerle geliyor
 * (ör. ['manage_stock','delete_repair']); bu roller yeni ekrandan
 * bir kez kaydedilene kadar rol varsayılanlarıyla desteklenir.
 */
export const LEGACY_PERMISSION_IDS = [
    'view_all_stores', 'manage_settings', 'manage_users', 'manage_stock',
    'view_dashboard', 'edit_repairs', 'delete_repairs', 'delete_repair',
    'view_earnings', 'create_repair', 'view_own_repairs', 'view_repairs',
    'view_kbb', 'view_technicians',
];

/** Yalnızca genişletilmiş katalogda bulunan yetkiler */
export const CATALOG_ONLY_IDS = PERMISSION_IDS.filter(id => !LEGACY_PERMISSION_IDS.includes(id));

/**
 * Rol henüz yeni yetki ekranından kaydedilmemiş mi?
 * Listesinde yeni katalog yetkilerinden hiçbiri yoksa "eski" sayılır ve
 * rol varsayılanları taban olarak uygulanır. Ekrandan bir kez kaydedildiğinde
 * liste açık hale gelir ve yetki kaldırma da çalışır.
 */
export const isLegacyPermissionSet = (granted) => {
    const list = granted || [];
    if (list.length === 0) return true;
    return !list.some(id => CATALOG_ONLY_IDS.includes(id));
};
