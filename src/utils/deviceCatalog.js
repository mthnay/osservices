/* ------------------------------------------------------------------
   Cihaz Kataloğu — TEK KAYNAK
   ------------------------------------------------------------------
   Hem Ayarlar > Cihaz Modelleri ekranı hem de servis kabul ekranındaki
   cihaz arama listesi bu dosyayı kullanır. Böylece iki liste her zaman
   birbiriyle denk kalır.

   Öncelik: veritabanı (DeviceModel koleksiyonu). Veritabanı boşsa
   aşağıdaki yerleşik katalog yedek olarak devreye girer.
------------------------------------------------------------------ */

/** Sistemdeki tek geçerli kategori listesi */
export const DEVICE_TYPES = ['iPhone', 'iPad', 'Mac', 'Watch', 'AirPods', 'Vision', 'Aksesuar', 'Diğer'];

/**
 * Kayıtlarda geçmişten gelen farklı kategori sözcükleri var
 * (sunucu seed'i 'Phone'/'Tablet'/'Accessory', form 'iPhone'/'iPad'/'Aksesuar').
 * Hepsini tek sözlüğe indirger.
 */
const TYPE_ALIASES = {
    phone: 'iPhone',
    iphone: 'iPhone',
    tablet: 'iPad',
    ipad: 'iPad',
    mac: 'Mac',
    macbook: 'Mac',
    imac: 'Mac',
    watch: 'Watch',
    airpods: 'AirPods',
    audio: 'AirPods',
    vision: 'Vision',
    accessory: 'Aksesuar',
    aksesuar: 'Aksesuar',
    other: 'Diğer',
    diger: 'Diğer',
    'diğer': 'Diğer',
};

/** Kategori bilgisi yoksa cihaz adından tahmin eder. */
export const inferDeviceType = (name) => {
    const value = String(name || '').toLocaleLowerCase('tr');
    if (value.includes('iphone')) return 'iPhone';
    if (value.includes('ipad')) return 'iPad';
    if (value.includes('macbook') || value.includes('imac') || value.includes('mac ')
        || value.startsWith('mac') || value.includes('mac studio')) return 'Mac';
    if (value.includes('watch')) return 'Watch';
    if (value.includes('airpods')) return 'AirPods';
    if (value.includes('vision')) return 'Vision';
    return 'Diğer';
};

/** Ürün ailesi belirtmeyen, "kova" niteliğindeki kategoriler */
const GENERIC_TYPES = ['Aksesuar', 'Diğer'];

/**
 * Her türlü kategori yazımını sistemin tek sözlüğüne çevirir.
 *
 * Kayıtlı kategori genel bir kova ise (ör. sunucu seed'i AirPods'u
 * 'Accessory' olarak yazıyor) ada bakıp daha belirgin bir aile bulunursa
 * o tercih edilir; böylece kataloğun kaynağı ne olursa olsun gruplama aynı.
 */
export const normalizeDeviceType = (rawType, name) => {
    const key = String(rawType || '').trim().toLocaleLowerCase('tr');
    const mapped = (key && TYPE_ALIASES[key])
        || (rawType && DEVICE_TYPES.includes(rawType) ? rawType : null);

    if (!mapped) return inferDeviceType(name);

    if (GENERIC_TYPES.includes(mapped)) {
        const inferred = inferDeviceType(name);
        if (!GENERIC_TYPES.includes(inferred)) return inferred;
    }
    return mapped;
};

/**
 * Kaydı ortak şekle getirir: { name, type, configurations, colors }.
 *
 * Yerleşik katalogda kapasite/çip/nesil/boyut ayrı alanlarda tutulur;
 * veritabanında ise hepsi `configurations` altında. Alan önceliği,
 * servis kabul ekranındaki mevcut davranışla birebir aynı tutulmuştur.
 */
export const normalizeDeviceModel = (model) => {
    if (!model) return null;
    const name = String(model.name || '').trim();

    return {
        ...model,
        name,
        type: normalizeDeviceType(model.type, name),
        configurations: model.configurations || model.capacities || model.chips
            || model.generations || model.sizes || [],
        colors: model.colors || model.materials || [],
    };
};

/**
 * Bir modelden seçilebilir tam cihaz tanımlarını üretir.
 * Örn: "iPhone 15 Pro, 256 GB, Blue Titanium"
 */
export const buildDeviceCombinations = (model) => {
    const device = normalizeDeviceModel(model);
    if (!device?.name) return [];

    const { name, configurations, colors } = device;

    if (configurations.length > 0 && colors.length > 0) {
        const combos = [];
        colors.forEach(color => configurations.forEach(config => combos.push(`${name}, ${config}, ${color}`)));
        return combos;
    }
    if (configurations.length > 0) return configurations.map(config => `${name}, ${config}`);
    if (colors.length > 0) return colors.map(color => `${name}, ${color}`);
    return [name];
};

/**
 * Ekranların kullanacağı geçerli katalog.
 * @returns {{ models: Array, source: 'db'|'fallback' }}
 */
export const resolveDeviceCatalog = (deviceModels) => {
    const fromDb = Array.isArray(deviceModels) ? deviceModels.filter(m => m?.name) : [];
    if (fromDb.length > 0) {
        return { models: fromDb.map(normalizeDeviceModel), source: 'db' };
    }
    return { models: FALLBACK_DEVICE_CATALOG.map(normalizeDeviceModel), source: 'fallback' };
};

/**
 * Veritabanı boşken kullanılan yerleşik Apple kataloğu.
 * "Varsayılan kataloğu içe aktar" işlemi bu listeyi veritabanına yazar.
 */
export const FALLBACK_DEVICE_CATALOG = [
    // --- iPhone ---
    { name: 'iPhone 15 Pro Max', capacities: ['256 GB', '512 GB', '1 TB'], colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'] },
    { name: 'iPhone 15 Pro', capacities: ['128 GB', '256 GB', '512 GB', '1 TB'], colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'] },
    { name: 'iPhone 15 Plus', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pink', 'Yellow', 'Green', 'Blue', 'Black'] },
    { name: 'iPhone 15', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pink', 'Yellow', 'Green', 'Blue', 'Black'] },
    { name: 'iPhone 14 Pro Max', capacities: ['128 GB', '256 GB', '512 GB', '1 TB'], colors: ['Deep Purple', 'Gold', 'Silver', 'Space Black'] },
    { name: 'iPhone 14 Pro', capacities: ['128 GB', '256 GB', '512 GB', '1 TB'], colors: ['Deep Purple', 'Gold', 'Silver', 'Space Black'] },
    { name: 'iPhone 14 Plus', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Blue', 'Purple', 'Midnight', 'Starlight', '(PRODUCT)RED', 'Yellow'] },
    { name: 'iPhone 14', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Blue', 'Purple', 'Midnight', 'Starlight', '(PRODUCT)RED', 'Yellow'] },
    { name: 'iPhone 13 Pro Max', capacities: ['128 GB', '256 GB', '512 GB', '1 TB'], colors: ['Sierra Blue', 'Graphite', 'Gold', 'Silver', 'Alpine Green'] },
    { name: 'iPhone 13 Pro', capacities: ['128 GB', '256 GB', '512 GB', '1 TB'], colors: ['Sierra Blue', 'Graphite', 'Gold', 'Silver', 'Alpine Green'] },
    { name: 'iPhone 13', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pink', 'Blue', 'Midnight', 'Starlight', '(PRODUCT)RED', 'Green'] },
    { name: 'iPhone 13 mini', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pink', 'Blue', 'Midnight', 'Starlight', '(PRODUCT)RED', 'Green'] },
    { name: 'iPhone 12 Pro Max', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pacific Blue', 'Gold', 'Graphite', 'Silver'] },
    { name: 'iPhone 12 Pro', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pacific Blue', 'Gold', 'Graphite', 'Silver'] },
    { name: 'iPhone 12 mini', capacities: ['64 GB', '128 GB', '256 GB'], colors: ['Black', 'White', '(PRODUCT)RED', 'Green', 'Blue', 'Purple'] },
    { name: 'iPhone 12', capacities: ['64 GB', '128 GB', '256 GB'], colors: ['Black', 'White', '(PRODUCT)RED', 'Green', 'Blue', 'Purple'] },
    { name: 'iPhone 11 Pro Max', capacities: ['64 GB', '256 GB', '512 GB'], colors: ['Midnight Green', 'Space Gray', 'Silver', 'Gold'] },
    { name: 'iPhone 11 Pro', capacities: ['64 GB', '256 GB', '512 GB'], colors: ['Midnight Green', 'Space Gray', 'Silver', 'Gold'] },
    { name: 'iPhone 11', capacities: ['64 GB', '128 GB', '256 GB'], colors: ['Black', 'Green', 'Yellow', 'Purple', '(PRODUCT)RED', 'White'] },
    { name: 'iPhone SE (3rd Gen)', capacities: ['64 GB', '128 GB', '256 GB'], colors: ['Midnight', 'Starlight', '(PRODUCT)RED'] },
    { name: 'iPhone SE (2nd Gen)', capacities: ['64 GB', '128 GB', '256 GB'], colors: ['Black', 'White', '(PRODUCT)RED'] },

    // --- iPad ---
    { name: 'iPad Pro 12.9"', generations: ['6th Gen (M2)', '5th Gen (M1)', '4th Gen'], capacities: ['128 GB', '256 GB', '512 GB', '1 TB', '2 TB'] },
    { name: 'iPad Pro 11"', generations: ['4th Gen (M2)', '3rd Gen (M1)', '2nd Gen'], capacities: ['128 GB', '256 GB', '512 GB', '1 TB', '2 TB'] },
    { name: 'iPad Air (5th Gen)', capacities: ['64 GB', '256 GB'], colors: ['Space Gray', 'Starlight', 'Pink', 'Purple', 'Blue'] },
    { name: 'iPad Air (4th Gen)', capacities: ['64 GB', '256 GB'], colors: ['Space Gray', 'Silver', 'Rose Gold', 'Green', 'Sky Blue'] },
    { name: 'iPad (10th Gen)', capacities: ['64 GB', '256 GB'], colors: ['Silver', 'Blue', 'Pink', 'Yellow'] },
    { name: 'iPad mini (6th Gen)', capacities: ['64 GB', '256 GB'], colors: ['Space Gray', 'Pink', 'Purple', 'Starlight'] },

    // --- Mac ---
    { name: 'MacBook Air 13" (M3)', chips: ['M3'], configurations: ['8 GB RAM', '16 GB RAM', '24 GB RAM'] },
    { name: 'MacBook Air 13" (M2)', chips: ['M2'], configurations: ['8 GB RAM', '16 GB RAM', '24 GB RAM'] },
    { name: 'MacBook Air 13" (M1)', chips: ['M1'], configurations: ['8 GB RAM', '16 GB RAM'] },
    { name: 'MacBook Air 15" (M3)', chips: ['M3'], configurations: ['8 GB RAM', '16 GB RAM', '24 GB RAM'] },
    { name: 'MacBook Air 15" (M2)', chips: ['M2'], configurations: ['8 GB RAM', '16 GB RAM', '24 GB RAM'] },
    { name: 'MacBook Pro 14"', chips: ['M1 Pro', 'M1 Max', 'M2 Pro', 'M2 Max', 'M3', 'M3 Pro', 'M3 Max'], configurations: ['16 GB RAM', '32 GB RAM', '64 GB RAM', '96 GB RAM', '128 GB RAM'] },
    { name: 'MacBook Pro 16"', chips: ['M1 Pro', 'M1 Max', 'M2 Pro', 'M2 Max', 'M3 Pro', 'M3 Max'], configurations: ['16 GB RAM', '32 GB RAM', '64 GB RAM', '96 GB RAM', '128 GB RAM'] },
    { name: 'MacBook Pro 13"', chips: ['M2', 'M1', 'Intel Core i5'], configurations: ['8 GB RAM', '16 GB RAM', '32 GB RAM'] },

    // --- Watch ---
    { name: 'Apple Watch Ultra 2', sizes: ['49mm'], materials: ['Titanium'] },
    { name: 'Apple Watch Ultra', sizes: ['49mm'], materials: ['Titanium'] },
    { name: 'Apple Watch Series 9', sizes: ['41mm', '45mm'], materials: ['Aluminum', 'Stainless Steel'] },
    { name: 'Apple Watch Series 8', sizes: ['41mm', '45mm'], materials: ['Aluminum', 'Stainless Steel'] },
    { name: 'Apple Watch SE (2nd Gen)', sizes: ['40mm', '44mm'], materials: ['Aluminum'] },

    // --- AirPods ---
    { name: 'AirPods Pro (2nd Gen)', configurations: ['USB-C Case', 'Lightning Case'] },
    { name: 'AirPods (3rd Gen)', configurations: ['MagSafe Case', 'Lightning Case'] },
    { name: 'AirPods Max', colors: ['Space Gray', 'Silver', 'Pink', 'Green', 'Sky Blue'] },
];
