/* ------------------------------------------------------------------
   Onarım Teklifi Akışı

   Teklif üç aşamada ilerler:
     pending  → Teklif müşteriye sunuldu, karar bekleniyor
     approved → Müşteri onayladı, onarım sürebilir
     rejected → Müşteri reddetti, cihaz iadeye hazırlanır

   Karar mağazadan (store) ya da müşteri portalından (portal) gelebilir;
   her iki kanal da aynı yapıya yazar, böylece kayıt tek bir doğruluk
   kaynağına sahip olur.

   Geriye dönük uyum: `quoteAmount` (düz toplam) ve `quotationDetails`
   ({date, items}) alanları da yazılmaya devam eder — müşteri portalı ve
   eski ekranlar bu alanları okur.
------------------------------------------------------------------ */

export const QUOTE_PENDING = 'pending';
export const QUOTE_APPROVED = 'approved';
export const QUOTE_REJECTED = 'rejected';

export const QUOTE_DECISION_LABELS = {
    [QUOTE_PENDING]: 'Müşteri onayı bekleniyor',
    [QUOTE_APPROVED]: 'Müşteri teklifi onayladı',
    [QUOTE_REJECTED]: 'Müşteri teklifi reddetti',
};

export const QUOTE_CHANNEL_LABELS = {
    store: 'Mağazada alındı',
    portal: 'Müşteri portalından alındı',
};

/** Red gerekçeleri — "Diğer" seçilirse serbest metin zorunludur */
export const QUOTE_REJECTION_REASONS = [
    'Müşteri fiyatı yüksek buldu',
    'Müşteri cihazı yenilemeye karar verdi',
    'Onarım başka serviste yaptırılacak',
    'Müşteri işlemden vazgeçti',
    'Diğer',
];

export const emptyQuoteItem = () => ({ name: '', price: '' });

const toNumber = (value) => {
    const n = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
};

/** Kalemleri toplar; kalem yoksa 0 döner */
export const quoteTotal = (items = []) =>
    items.reduce((sum, item) => sum + toNumber(item?.price), 0);

/** Kaydedilmeye değer kalemler: adı olan ve tutarı sıfırdan büyük olanlar */
export const cleanQuoteItems = (items = []) => items
    .filter(item => String(item?.name || '').trim() && toNumber(item?.price) > 0)
    .map(item => ({ name: String(item.name).trim(), price: toNumber(item.price) }));

export const formatQuoteAmount = (value) => {
    const n = toNumber(value);
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
};

/**
 * Müşteriye sunulacak teklifi doğrular.
 * @returns {Object} alan adı → hata mesajı
 */
export const validateQuoteDraft = (draft) => {
    const errors = {};
    const items = cleanQuoteItems(draft?.items);

    if (items.length === 0) {
        errors.items = 'En az bir teklif kalemi girin (açıklama ve sıfırdan büyük tutar).';
    }

    const partial = (draft?.items || []).find(
        item => String(item?.name || '').trim() && toNumber(item?.price) <= 0
    );
    if (partial) {
        errors.itemPrice = `"${partial.name}" kaleminin tutarı sıfırdan büyük olmalıdır.`;
    }

    return errors;
};

/**
 * Red kararını doğrular. Onay için ek alan istenmez.
 * @returns {Object} alan adı → hata mesajı
 */
export const validateQuoteRejection = ({ reason, customReason } = {}) => {
    const errors = {};
    if (!String(reason || '').trim()) {
        errors.rejectionReason = 'Red gerekçesini seçin.';
    } else if (reason === 'Diğer' && !String(customReason || '').trim()) {
        errors.rejectionReasonDetail = 'Gerekçeyi kısaca yazın.';
    }
    return errors;
};

/** Seçim ve serbest metinden nihai gerekçe cümlesi */
export const resolveRejectionReason = (reason, customReason) => {
    if (reason === 'Diğer') return String(customReason || '').trim();
    const extra = String(customReason || '').trim();
    return extra ? `${reason} — ${extra}` : reason;
};

/** Karar sonrası kaydın alacağı durum */
export const quoteDecisionStatus = (decision) => {
    if (decision === QUOTE_APPROVED) return 'İşlemde';
    if (decision === QUOTE_REJECTED) return 'İade Bekleniyor';
    return 'Müşteri Onayı Bekliyor';
};

/** Kayıt geçmişi ve müşteri formu için tek satırlık özet */
export const summarizeQuote = (quote) => {
    if (!quote?.decision) return '';
    const bits = [QUOTE_DECISION_LABELS[quote.decision] || quote.decision];
    if (quote.amount) bits.push(formatQuoteAmount(quote.amount));
    if (quote.decision === QUOTE_REJECTED && quote.rejectionReason) {
        bits.push(quote.rejectionReason);
    }
    return bits.join(' · ');
};

/**
 * Portal ve eski ekranların okuduğu alanları da üreten yardımcı.
 * Tek yerden yazılırsa `quotationDetails` şekli tutarlı kalır.
 */
export const buildQuoteUpdates = (quote) => ({
    quote,
    quoteAmount: String(quote.amount ?? ''),
    quotationDetails: {
        date: quote.sentAt || new Date().toLocaleString('tr-TR'),
        items: quote.items || [],
    },
});
