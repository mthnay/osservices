/* ------------------------------------------------------------------
   Yetki Kataloğu — TEK KAYNAK
   ------------------------------------------------------------------
   TASARIM KURALI:
   Görüntüleme serbesttir. Sistemdeki tüm modülleri (servis, stok, arşiv,
   raporlar…) her kullanıcı görebilir. Yetkiler yalnızca VERİ DEĞİŞTİREN
   işlemleri kısıtlar: ekleme, düzenleme, silme, gönderme, transfer.

   Bu yüzden katalogda "…gör" tipi yetki yoktur; tek istisna, hangi
   mağazaların verisinin görüneceğini belirleyen kapsam kuralıdır
   (view_all_stores) — bu bir menü kısıtı değil, veri izolasyonudur.

   risk     -> 'normal' | 'high' | 'critical' (kritik yetkiler ek onay ister)
   implies  -> bu yetki verildiğinde otomatik kazanılan alt yetkiler
   aliases  -> geçmişte kullanılmış eski isimler (geriye dönük uyumluluk)
------------------------------------------------------------------ */

export const PERMISSION_CATEGORIES = [
    { id: 'repairs', label: 'Servis Kayıtları', description: 'Kayıt açma, düzenleme, silme ve iş atama' },
    { id: 'customers', label: 'Müşteriler', description: 'Müşteri kaydı ve müşteriye gönderilen bildirimler' },
    { id: 'inventory', label: 'Envanter & Ambar', description: 'Stok hareketleri, transfer ve ambar tanımları' },
    { id: 'operations', label: 'Teknisyen & Operasyon', description: 'Teknisyen kadrosu ve mağaza operasyonu' },
    { id: 'finance', label: 'Finans & Veri', description: 'Ciro verisi ve dışa aktarma' },
    { id: 'system', label: 'Sistem & Güvenlik', description: 'Ayarlar, kullanıcı, rol ve erişim yönetimi' },
];

export const PERMISSIONS = [
    /* --------------------------- Servis Kayıtları --------------------------- */
    {
        id: 'create_repair', category: 'repairs', risk: 'normal',
        label: 'Servis kaydı açabilir',
        description: 'Yeni servis kabul kaydı oluşturur.',
    },
    {
        id: 'edit_repairs', category: 'repairs', risk: 'normal',
        label: 'Servis kaydını düzenleyebilir',
        description: 'Kayıt bilgilerini, teşhis ve notları günceller.',
    },
    {
        id: 'delete_repairs', category: 'repairs', risk: 'critical',
        label: 'Servis kaydı silebilir',
        description: 'Kaydı veritabanından kalıcı olarak siler. Geri alınamaz.',
        aliases: ['delete_repair'],
    },
    {
        id: 'assign_jobs', category: 'repairs', risk: 'normal',
        label: 'Teknisyene iş atayabilir',
        description: 'Servis kayıtlarını teknisyenlere atar, iş akışını değiştirir.',
    },
    {
        id: 'manage_kbb', category: 'repairs', risk: 'normal',
        label: 'KBB işlemleri yapabilir',
        description: 'Sökülen eski parçayı Apple’a gönderir ve iade kaydı işler.',
        aliases: ['view_kbb'],
    },

    /* ------------------------------ Müşteriler ------------------------------ */
    {
        id: 'manage_customers', category: 'customers', risk: 'normal',
        label: 'Müşteri ekleyebilir / düzenleyebilir',
        description: 'Müşteri kaydı oluşturur ve bilgilerini günceller.',
    },
    {
        id: 'delete_customers', category: 'customers', risk: 'high',
        label: 'Müşteri silebilir',
        description: 'Müşteri kaydını kalıcı olarak siler.',
    },
    {
        id: 'send_customer_message', category: 'customers', risk: 'high',
        label: 'Müşteriye bildirim gönderebilir',
        description: 'WhatsApp, SMS, e-posta bildirimleri ve pazarlama gönderimleri.',
    },

    /* --------------------------- Envanter & Ambar --------------------------- */
    {
        id: 'manage_stock', category: 'inventory', risk: 'normal',
        label: 'Stok hareketi yapabilir',
        description: 'Parça girişi, çıkışı ve stok düzeltmesi işler.',
    },
    {
        id: 'transfer_stock', category: 'inventory', risk: 'high',
        label: 'Ambarlar arası transfer yapabilir',
        description: 'Parça ve ödünç cihazları ambarlar arasında taşır.',
    },
    {
        id: 'manage_warehouses', category: 'inventory', risk: 'critical',
        label: 'Ambar ekleyebilir / kaldırabilir',
        description: 'Ambar tanımlarını oluşturur veya sistemden kaldırır.',
    },
    {
        id: 'manage_device_catalog', category: 'inventory', risk: 'normal',
        label: 'Cihaz kataloğunu düzenleyebilir',
        description: 'Cihaz modeli ekler, düzenler ve siler.',
    },

    /* ------------------------ Teknisyen & Operasyon ------------------------ */
    {
        id: 'manage_technicians', category: 'operations', risk: 'high',
        label: 'Teknisyen yönetebilir',
        description: 'Teknisyen ekler, düzenler ve sistemden kaldırır.',
    },
    {
        id: 'manage_store_operations', category: 'operations', risk: 'normal',
        label: 'Mağaza operasyonunu yönetebilir',
        description: 'Vardiya, görev ve mağaza duyurularını düzenler.',
    },

    /* ----------------------------- Finans & Veri ----------------------------- */
    {
        id: 'view_earnings', category: 'finance', risk: 'high',
        label: 'Ciro / hakediş verisine erişebilir',
        description: 'Gelir ve hakediş rakamlarını görür. (Finansal veri kapsamı)',
    },
    {
        id: 'manage_earnings', category: 'finance', risk: 'high',
        label: 'Hakediş kaydı işleyebilir',
        description: 'Hakediş kayıtlarını ekler ve günceller.',
    },
    {
        id: 'export_data', category: 'finance', risk: 'high',
        label: 'Veri dışa aktarabilir',
        description: 'Toplu dışa aktarma, PDF ve Excel çıktısı alır.',
    },

    /* --------------------------- Sistem & Güvenlik --------------------------- */
    {
        id: 'view_all_stores', category: 'system', risk: 'high',
        label: 'Tüm mağazaların verisine erişebilir',
        description: 'Kendi mağazası dışındaki kayıtları da görür. (Veri kapsamı kuralı)',
    },
    {
        id: 'manage_settings', category: 'system', risk: 'critical',
        label: 'Sistem ayarlarını yönetebilir',
        description: 'Ayarlar bölümüne erişir (kurumsal kimlik, ambar, katalog, metinler).',
    },
    {
        id: 'manage_users', category: 'system', risk: 'critical',
        label: 'Kullanıcı yönetebilir',
        description: 'Personel hesabı oluşturur, düzenler ve siler.',
    },
    {
        id: 'manage_roles', category: 'system', risk: 'critical',
        label: 'Rol ve yetki yönetebilir',
        description: 'Rolleri ve bu rollerin yetkilerini değiştirir.',
    },
    {
        id: 'manage_security', category: 'system', risk: 'critical',
        label: 'Güvenlik yönetebilir',
        description: 'Şifre belirler, kullanıcıların sistem erişimini açar/kapatır.',
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
 * Doğrudan verilmiş, kapsama yoluyla gelmiş ya da eski bir isimle
 * (alias) kayıtlı olabilir.
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
 * Katalog yenilenmeden önce sistemde kullanılan yetki isimleri.
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

/** Yalnızca yeni katalogda bulunan yetkiler */
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
