const buildProductSvg = ({ label, accent, icon }) => {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#f8fafc"/>
                    <stop offset="100%" stop-color="#eef2f7"/>
                </linearGradient>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.16"/>
                </filter>
            </defs>
            <rect width="800" height="600" fill="url(#bg)"/>
            <circle cx="650" cy="80" r="130" fill="${accent}" opacity="0.12"/>
            <circle cx="110" cy="520" r="170" fill="${accent}" opacity="0.08"/>
            ${icon}
            <text x="400" y="525" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800" fill="#111827">${label}</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const PRODUCT_FALLBACKS = {
    iphone: buildProductSvg({
        label: 'iPhone',
        accent: '#2563eb',
        icon: '<rect x="300" y="105" width="200" height="330" rx="42" fill="#111827" filter="url(#shadow)"/><rect x="318" y="132" width="164" height="276" rx="28" fill="#f9fafb"/><rect x="365" y="118" width="70" height="8" rx="4" fill="#374151"/><circle cx="400" cy="420" r="9" fill="#374151"/>'
    }),
    ipad: buildProductSvg({
        label: 'iPad',
        accent: '#4f46e5',
        icon: '<rect x="230" y="115" width="340" height="285" rx="34" fill="#111827" filter="url(#shadow)"/><rect x="253" y="140" width="294" height="235" rx="18" fill="#f9fafb"/><circle cx="400" cy="387" r="8" fill="#374151"/>'
    }),
    mac: buildProductSvg({
        label: 'Mac',
        accent: '#475569',
        icon: '<rect x="245" y="130" width="310" height="210" rx="18" fill="#111827" filter="url(#shadow)"/><rect x="265" y="150" width="270" height="165" rx="8" fill="#f9fafb"/><path d="M190 372h420l-38 55H228z" fill="#cbd5e1" filter="url(#shadow)"/><path d="M318 372h164l18 26H300z" fill="#94a3b8"/>'
    }),
    watch: buildProductSvg({
        label: 'Apple Watch',
        accent: '#ea580c',
        icon: '<rect x="350" y="70" width="100" height="95" rx="28" fill="#cbd5e1"/><rect x="350" y="355" width="100" height="95" rx="28" fill="#cbd5e1"/><rect x="300" y="145" width="200" height="230" rx="54" fill="#111827" filter="url(#shadow)"/><rect x="322" y="168" width="156" height="184" rx="38" fill="#f9fafb"/><rect x="498" y="230" width="16" height="58" rx="8" fill="#64748b"/>'
    }),
    airpods: buildProductSvg({
        label: 'AirPods',
        accent: '#059669',
        icon: '<path d="M310 145c-42 0-76 33-76 74 0 34 23 63 55 72v108c0 22 18 40 40 40s40-18 40-40V205c0-33-27-60-59-60z" fill="#f9fafb" stroke="#cbd5e1" stroke-width="16" filter="url(#shadow)"/><path d="M490 145c42 0 76 33 76 74 0 34-23 63-55 72v108c0 22-18 40-40 40s-40-18-40-40V205c0-33 27-60 59-60z" fill="#f9fafb" stroke="#cbd5e1" stroke-width="16" filter="url(#shadow)"/>'
    }),
    other: buildProductSvg({
        label: 'Aksesuar',
        accent: '#7c3aed',
        icon: '<rect x="255" y="170" width="290" height="220" rx="32" fill="#f9fafb" stroke="#cbd5e1" stroke-width="16" filter="url(#shadow)"/><path d="M315 255h170M315 305h120" stroke="#7c3aed" stroke-width="24" stroke-linecap="round"/><circle cx="510" cy="205" r="42" fill="#7c3aed" opacity="0.2"/>'
    })
};

const PRODUCT_PHOTOS = {
    iphone: '/product-images/iphone.jpg',
    ipad: '/product-images/ipad.jpg',
    mac: '/product-images/mac.jpg',
    watch: '/product-images/watch.jpg',
    airpods: '/product-images/airpods.jpg',
    other: '/product-images/accessory.jpg'
};

// Ürün grubunu metinden çıkarır. Hem hazır fotoğrafı hem de hiç ağa çıkmayan
// gömülü SVG'yi aynı anahtardan üretebilmek için tek yerde tutuluyor.
const resolveProductKey = (group = '', model = '') => {
    const fullText = `${(group || '').toLowerCase()} ${(model || '').toLowerCase()}`;

    if (fullText.includes('iphone')) return 'iphone';
    if (fullText.includes('mac') || fullText.includes('bilgisayar')) return 'mac';
    if (fullText.includes('ipad') || fullText.includes('tablet')) return 'ipad';
    if (fullText.includes('watch') || fullText.includes('saat')) return 'watch';
    if (fullText.includes('airpods') || fullText.includes('ses') || fullText.includes('audio') ||
        fullText.includes('kulaklık') || fullText.includes('beats')) return 'airpods';

    // Parça/aksesuar ve bilinmeyen her şey
    return 'other';
};

// Kayıtta productGroup boş olabilir; cihaz adından da grup çıkarmak için dışa açık.
export const getProductGroupKey = resolveProductKey;

export const getProductImage = (group = '', model = '') => PRODUCT_PHOTOS[resolveProductKey(group, model)];

// Son çare: veri URI olduğu için ağ/dosya hatası ihtimali yok, asla kırılmaz.
export const getProductFallbackSvg = (group = '', model = '') => PRODUCT_FALLBACKS[resolveProductKey(group, model)];

// Bilinen ölü/örnek adresler
const DEAD_LINK_PATTERNS = [
    'officialapple.store',
    'img.icons8.com',
    'images.unsplash.com',
    'example.com',
    'broken-link'
];

// Uygulamanın kendi statik varlıkları (public/ altından servis edilir).
// Bunlar /uploads ile karıştırılmamalı.
const STATIC_ASSET_PREFIXES = ['product-images/', 'assets/'];

// Bu yollar backend tarafından servis edilir; kayıtta eski/başka bir host yazılıysa
// güncel backend adresine taşınabilir.
const BACKEND_PATH_PREFIXES = ['/uploads/', '/api/media/'];

// API adresinden backend kökünü çıkarır. '/api' -> '' (aynı origin),
// 'https://sunucu/api' -> 'https://sunucu'
const getBackendBase = (apiUrl) => {
    const raw = (apiUrl || '').trim();
    if (!raw) {
        return typeof window !== 'undefined' ? window.location.origin : '';
    }
    return raw.replace(/\/api\/?$/i, '').replace(/\/$/, '');
};

/**
 * Kayıtta saklanan görsel değerini gerçekten yüklenebilir bir adrese çevirir.
 * Çözemediği her durumda ürün görseline düşer; böylece kırık görsel oluşmaz.
 */
export const getSafeRepairImageUrl = (imagePath, group, model, apiUrl) => {
    const fallback = getProductImage(group, model);

    if (!imagePath || typeof imagePath !== 'string') return fallback;

    const value = imagePath.trim();
    if (!value) return fallback;

    // Gömülü görsel
    if (value.startsWith('data:')) return value;

    // blob: adresleri yalnızca oluşturuldukları sayfa oturumunda geçerlidir;
    // kayıttan geldiyse kesin kırıktır.
    if (value.startsWith('blob:')) return fallback;

    if (DEAD_LINK_PATTERNS.some(pattern => value.includes(pattern))) return fallback;

    const backendBase = getBackendBase(apiUrl);

    // Mutlak adres: kayıt oluşturulurken o anki sunucu adresi (localhost, LAN IP,
    // eski domain) gömülmüş olabilir. Bizim servis ettiğimiz bir yolsa güncel
    // backend'e taşıyoruz, değilse olduğu gibi bırakıp onError'a güveniyoruz.
    if (/^https?:\/\//i.test(value)) {
        try {
            const parsed = new URL(value);
            if (BACKEND_PATH_PREFIXES.some(prefix => parsed.pathname.startsWith(prefix))) {
                return `${backendBase}${parsed.pathname}`;
            }
        } catch {
            return fallback; // Bozuk URL
        }
        return value;
    }

    // Protokolsüz ama şüpheli değerler (örn. "C:\...", "www.site.com/x.jpg")
    if (value.includes('\\') || /^[a-z]+:/i.test(value)) return fallback;

    const cleanPath = value.replace(/^\.?\//, '');

    // public/ altındaki varlıklar aynı origin'den gelir
    if (STATIC_ASSET_PREFIXES.some(prefix => cleanPath.startsWith(prefix))) {
        return `/${cleanPath}`;
    }

    // Veritabanındaki medya kaydı
    if (cleanPath.startsWith('api/media/')) return `${backendBase}/${cleanPath}`;
    if (cleanPath.startsWith('media/')) return `${backendBase}/api/${cleanPath}`;

    // Disk üzerindeki yüklemeler
    if (cleanPath.startsWith('uploads/')) return `${backendBase}/${cleanPath}`;

    // Sadece dosya adı verilmişse yükleme klasöründen ara
    return `${backendBase}/uploads/${cleanPath}`;
};

/**
 * Bir cihaz görseli için sırayla denenecek adresler: kaydın kendi görseli ->
 * ürün fotoğrafı -> gömülü SVG. Son eleman veri URI olduğu için zincir
 * her zaman geçerli bir görselle sonuçlanır.
 */
export const getDeviceImageSources = (imagePath, group, model, apiUrl) => {
    const candidates = [
        getSafeRepairImageUrl(imagePath, group, model, apiUrl),
        getProductImage(group, model),
        getProductFallbackSvg(group, model)
    ];

    return candidates.filter((src, index) => src && candidates.indexOf(src) === index);
};
