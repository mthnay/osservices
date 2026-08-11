import { getProductGroupKey } from './productImages';

// Arşive giren durumlar
export const ARCHIVE_STATUSES = ['Teslim Edildi', 'İade Edildi', 'Tamamlandı'];

export const STATUS_LABELS = {
    'Teslim Edildi': 'Teslim Edildi',
    'İade Edildi': 'İade Edildi',
    'Tamamlandı': 'Tamamlandı'
};

export const PRODUCT_GROUP_LABELS = {
    iphone: 'iPhone',
    ipad: 'iPad',
    mac: 'Mac',
    watch: 'Apple Watch',
    airpods: 'AirPods & Ses',
    other: 'Diğer'
};

export const REPAIR_TYPE_LABELS = {
    'carry-in': 'Mağaza İçi Onarım',
    'apple-center': 'Apple Onarım Merkezi',
    'mail-in': 'Bütün Birim Posta',
    'direct-return': 'İşlemsiz İade',
    'returnbefore': 'Değiştirmeden Önce İade',
    'service': 'Onarım Olmayan Servis',
    'approval': 'Teklifli Onarım',
    'unknown': 'Belirtilmemiş'
};

export const WARRANTY_LABELS = {
    applecare: 'AppleCare+',
    warranty: 'Garanti Kapsamında',
    out: 'Garanti Dışı',
    unknown: 'Belirtilmemiş'
};

export const MONTH_NAMES = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

// Veride hem 'AppleCare+', 'applecare' hem 'out-of-warranty', 'standard' gibi
// farklı yazımlar var; tek kovaya indiriyoruz.
export const getWarrantyKey = (warrantyStatus = '') => {
    const value = String(warrantyStatus || '').toLowerCase();
    if (!value) return 'unknown';
    if (value.includes('applecare')) return 'applecare';
    if (value.includes('out') || value.includes('dışı') || value.includes('disi') || value.includes('expired')) return 'out';
    if (value.includes('standard') || value.includes('garanti') || value.includes('warranty') || value.includes('limited')) return 'warranty';
    return 'unknown';
};

export const getRepairTypeKey = (repair) => {
    const value = repair.repairType || repair.type || '';
    return REPAIR_TYPE_LABELS[value] ? value : 'unknown';
};

// "14.05.2026 15:30" ve ISO tarihleri birlikte destekler
export const parseRepairDate = (value) => {
    if (!value) return null;

    if (typeof value === 'string') {
        const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
        if (match) {
            const [, day, month, year, hour = '0', minute = '0'] = match;
            const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
            return isNaN(date.getTime()) ? null : date;
        }
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
};

// Arşivde tarih olarak teslim/iade kaydı esas alınır, yoksa kabul tarihi
export const getArchiveDate = (repair) => {
    const closingEntry = (repair.history || []).find(h =>
        h.status === 'Teslim Edildi' || h.status === 'İade Edildi'
    );

    return parseRepairDate(closingEntry?.date)
        || parseRepairDate(repair.completedAt)
        || parseRepairDate(repair.date)
        || parseRepairDate(repair.createdAt);
};

/**
 * Filtreleme, gruplama ve sıralama için kaydın yanına hesaplanmış alanları ekler.
 * Kayıt nesnesi olduğu gibi korunur (`repair`), hiçbir alan kaybedilmez.
 */
export const toArchiveEntry = (repair, storeNameById) => {
    const date = getArchiveDate(repair);
    const storeKey = repair.storeId != null ? String(repair.storeId) : 'unknown';

    return {
        repair,
        id: repair.id,
        storeKey,
        storeName: storeNameById.get(storeKey) || 'Mağaza Atanmamış',
        statusKey: repair.status,
        productKey: getProductGroupKey(repair.productGroup, repair.device),
        warrantyKey: getWarrantyKey(repair.warrantyStatus),
        repairTypeKey: getRepairTypeKey(repair),
        technician: repair.technician || '',
        date,
        timestamp: date ? date.getTime() : 0,
        yearKey: date ? String(date.getFullYear()) : 'unknown',
        monthIndex: date ? date.getMonth() : null,
        searchText: [
            repair.id, repair.repairId, repair.appleRepairId, repair.customer,
            repair.customerPhone, repair.device, repair.serial, repair.serialNumber,
            repair.imei1, repair.imei2, repair.invoiceNumber, repair.technician
        ].filter(Boolean).join(' ').toLowerCase()
    };
};

// Facet tanımları: anahtar -> kayıttan değer ve etiket üretimi
export const FACETS = {
    status: { label: 'Durum', valueOf: (e) => e.statusKey, labelOf: (v) => STATUS_LABELS[v] || v },
    store: { label: 'Mağaza', valueOf: (e) => e.storeKey, labelOf: (v, e) => e?.storeName || 'Mağaza Atanmamış' },
    year: { label: 'Yıl', valueOf: (e) => e.yearKey, labelOf: (v) => (v === 'unknown' ? 'Tarihsiz' : v) },
    product: { label: 'Ürün Grubu', valueOf: (e) => e.productKey, labelOf: (v) => PRODUCT_GROUP_LABELS[v] || v },
    warranty: { label: 'Garanti', valueOf: (e) => e.warrantyKey, labelOf: (v) => WARRANTY_LABELS[v] || v },
    repairType: { label: 'İşlem Türü', valueOf: (e) => e.repairTypeKey, labelOf: (v) => REPAIR_TYPE_LABELS[v] || v }
};

export const EMPTY_FILTERS = { status: [], store: [], year: [], product: [], warranty: [], repairType: [] };

// Bir kaydın, belirtilen facet hariç tüm filtrelere uyup uymadığı.
// (Facet sayaçları hesaplanırken kendi facet'i dışarıda bırakılır.)
export const matchesFilters = (entry, filters, exceptKey = null) =>
    Object.entries(filters).every(([key, values]) => {
        if (key === exceptKey || !values.length) return true;
        return values.includes(FACETS[key].valueOf(entry));
    });

export const countActiveFilters = (filters) =>
    Object.values(filters).reduce((total, values) => total + values.length, 0);
