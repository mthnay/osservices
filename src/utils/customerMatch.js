/* ------------------------------------------------------------------
   Cari (müşteri) eşleştirme
   Aynı kişi için ikinci bir cari açılmasını engeller. TC, telefon,
   ad-soyad ve e-posta normalize edilerek karşılaştırılır.

   Seviyeler:
     exact   → TC aynı. Kesinlikle aynı kişidir, yeni cari açılamaz.
     confirm → Telefon ya da ad-soyad aynı. Kullanıcı "farklı kişi"
               olduğunu açıkça onaylamadan yeni cari açılamaz.
     soft    → Yalnızca e-posta aynı. Bilgi amaçlı, engel değildir.

   NOT: Sunucu tarafı aynı kuralları uygular; ikiz dosya
   server/customerMatch.js. Biri değişirse diğeri de güncellenmeli
   (src/ electron paketine dahil edilmediği için ortak import yapılamıyor).
------------------------------------------------------------------ */

const TR_FOLD = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };

/** Türkçe karakterleri katlayıp noktalama ve fazla boşlukları temizler */
export const normalizeName = (value) => String(value ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (ch) => TR_FOLD[ch] || ch)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** "Ay Metehan" ile "Metehan Ay" aynı sayılsın diye sözcükler sıralanır */
export const nameKey = (value) => normalizeName(value).split(' ').filter(Boolean).sort().join(' ');

/** Yalnızca 11 haneli TC anlamlıdır; eksik giriş eşleştirmede kullanılmaz */
export const normalizeTc = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits.length === 11 ? digits : '';
};

/** Ülke kodu / baştaki sıfır farklarını yok saymak için son 10 hane */
export const normalizePhone = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : '';
};

export const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

/** T.C. kimlik numarası algoritma doğrulaması. Eksik/boş girişte null (nötr) döner. */
export const isValidTc = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length !== 11) return null;
    if (digits[0] === '0') return false;
    let odd = 0, even = 0, sum = 0;
    for (let i = 0; i < 9; i++) {
        const digit = parseInt(digits[i], 10);
        if (i % 2 === 0) odd += digit; else even += digit;
        sum += digit;
    }
    const tenth = ((odd * 7) - even) % 10;
    const eleventh = (sum + tenth) % 10;
    return tenth === parseInt(digits[9], 10) && eleventh === parseInt(digits[10], 10);
};

export const MATCH_REASON_LABELS = {
    tc: 'TC kimlik numarası aynı',
    phone: 'Telefon numarası aynı',
    name: 'Ad soyad aynı',
    email: 'E-posta adresi aynı',
};

const REASON_LEVEL = { tc: 'exact', phone: 'confirm', name: 'confirm', email: 'soft' };
const LEVEL_RANK = { none: 0, soft: 1, confirm: 2, exact: 3 };

export const customerKeyOf = (customer) => customer?._id || customer?.id;

/** İki cari kaydı arasındaki ortak kimlik alanları */
export const matchReasons = (candidate, existing) => {
    const reasons = [];

    const tc = normalizeTc(candidate?.tc);
    if (tc && tc === normalizeTc(existing?.tc)) reasons.push('tc');

    const phone = normalizePhone(candidate?.phone);
    if (phone && phone === normalizePhone(existing?.phone)) reasons.push('phone');

    const name = nameKey(candidate?.name);
    // Tek sözcüklü isimler ("Ahmet") kimlik saymak için fazla zayıf
    if (name && name.includes(' ') && name === nameKey(existing?.name)) reasons.push('name');

    const email = normalizeEmail(candidate?.email);
    if (email && email === normalizeEmail(existing?.email)) reasons.push('email');

    return reasons;
};

export const levelOfReasons = (reasons = []) => reasons
    .reduce((acc, reason) => (LEVEL_RANK[REASON_LEVEL[reason]] > LEVEL_RANK[acc] ? REASON_LEVEL[reason] : acc), 'none');

/**
 * Aday cari bilgisiyle çakışan kayıtları bulur.
 * @param {Array} customers  mevcut cari listesi
 * @param {Object} candidate {name, tc, phone, email}
 * @param {Object} options   {excludeKey} düzenlenen kaydın kendisi hariç tutulur
 * @returns {{level: string, matches: Array<{customer, reasons, level}>}}
 */
export const findCustomerMatches = (customers, candidate, options = {}) => {
    const excludeKey = options.excludeKey != null ? String(options.excludeKey) : null;
    const matches = [];

    (customers || []).forEach((existing) => {
        if (!existing) return;
        if (excludeKey && String(customerKeyOf(existing)) === excludeKey) return;

        const reasons = matchReasons(candidate, existing);
        if (!reasons.length) return;
        matches.push({ customer: existing, reasons, level: levelOfReasons(reasons) });
    });

    matches.sort((a, b) => (LEVEL_RANK[b.level] - LEVEL_RANK[a.level]) || (b.reasons.length - a.reasons.length));

    return { level: matches[0]?.level || 'none', matches };
};

/** Yeni cari açılmadan önce kullanıcı onayı gerektiren durum */
export const blocksCreate = (level) => level === 'exact' || level === 'confirm';

/** Kullanıcı "farklı kişi" diyerek geçebilir mi */
export const isForceable = (level) => level === 'confirm';

export const describeMatch = (reasons = []) => reasons
    .filter((reason) => MATCH_REASON_LABELS[reason])
    .map((reason) => MATCH_REASON_LABELS[reason])
    .join(' · ');
