/* ------------------------------------------------------------------
   Onarım Merkezi (ARC) sonuç kodları

   Bütün Birim Posta akışında cihaz Apple Onarım Merkezi'ne gönderilir.
   Cihaz geri geldiğinde merkezde ne yapıldığı bu kodlardan biriyle
   kayda geçer. Her sonuç için servis sonuç raporu zorunludur; bazı
   sonuçlar ek alan ister:

     requiresIdentity → cihaz/anakart değiştiği için yeni seri no ve
                        IMEI bilgileri girilmelidir (cihaz kimliği değişir).
     requiresParts    → merkezde değişen parçalar tek tek girilmelidir.
------------------------------------------------------------------ */

export const ARC_OUTCOMES = [
    {
        code: 'unit-replaced',
        label: 'İade edilen birim değiştirildi',
        hint: 'Cihazın tamamı yenisiyle değiştirildi. Müşteriye farklı bir cihaz teslim edilecek.',
        requiresIdentity: true,
        requiresParts: false,
        identityLabel: 'Yeni cihaz seri numarası',
        outcomeStatus: 'Cihaz Hazır',
        tone: 'info',
        customerText: 'Cihazınız Apple Onarım Merkezi tarafından yenisiyle değiştirilmiştir. Teslim edilen cihazın kimlik bilgileri aşağıda yer almaktadır.',
    },
    {
        code: 'board-system-replaced',
        label: 'Anakarta bağlı orta/arka sistem değiştirildi',
        hint: 'Anakart ve ona bağlı sistem değiştirildi. Cihazın seri/IMEI bilgileri değişmiş olabilir.',
        requiresIdentity: true,
        requiresParts: false,
        identityLabel: 'Yeni anakart / cihaz seri numarası',
        outcomeStatus: 'Cihaz Hazır',
        tone: 'info',
        customerText: 'Cihazınızın anakartı ve ona bağlı sistemi Apple Onarım Merkezi tarafından değiştirilmiştir. Güncel cihaz kimlik bilgileri aşağıda yer almaktadır.',
    },
    {
        code: 'repaired',
        label: 'Birim onarılıp iade edildi',
        hint: 'Cihaz onarıldı. Merkezde değişen parçaların tek tek girilmesi gerekir.',
        requiresIdentity: false,
        requiresParts: true,
        outcomeStatus: 'Cihaz Hazır',
        tone: 'success',
        customerText: 'Cihazınız Apple Onarım Merkezi tarafından onarılarak iade edilmiştir. Değişen parçalar aşağıda listelenmiştir.',
    },
    {
        code: 'ntf',
        label: 'Birim iade edildi — hata yinelenemedi',
        hint: 'Bildirilen arıza merkezde tekrar edilemedi; cihaza işlem yapılmadı.',
        requiresIdentity: false,
        requiresParts: false,
        outcomeStatus: 'İade Hazır',
        tone: 'warning',
        customerText: 'Cihazınız Apple Onarım Merkezi tarafından incelenmiş, bildirilen arıza test koşullarında yeniden oluşturulamadığı için cihaza işlem yapılmadan iade edilmiştir.',
    },
    {
        code: 'abuse',
        label: 'Birim kötüye kullanım nedeniyle iade edildi',
        hint: 'Kullanıcı kaynaklı hasar tespit edildi; garanti kapsamı dışında iade.',
        requiresIdentity: false,
        requiresParts: false,
        outcomeStatus: 'İade Hazır',
        tone: 'danger',
        customerText: 'Cihazınızda kullanıcı kaynaklı hasar tespit edildiğinden işlem garanti kapsamı dışında değerlendirilmiş ve cihaz onarım yapılmadan iade edilmiştir.',
    },
    {
        code: 'ber',
        label: 'Birim iade edildi — BER (ekonomik onarım dışı)',
        hint: 'Onarım ekonomik olarak mümkün değil; cihaz işlem görmeden iade edildi.',
        requiresIdentity: false,
        requiresParts: false,
        outcomeStatus: 'İade Hazır',
        tone: 'danger',
        customerText: 'Cihazınızın onarımı ekonomik olarak mümkün görülmediğinden (BER) işlem yapılmadan iade edilmiştir.',
    },
];

export const getArcOutcome = (code) => ARC_OUTCOMES.find(o => o.code === code) || null;

export const arcOutcomeLabel = (code) => getArcOutcome(code)?.label || '';

/** Sonuca göre kaydın alacağı durum */
export const arcOutcomeStatus = (code) => getArcOutcome(code)?.outcomeStatus || 'Cihaz Hazır';

export const emptyArcPart = () => ({ partNumber: '', description: '', kbbSerial: '', kgbSerial: '' });

/**
 * IMEI yalnızca hücresel cihazlarda bulunur. Kabul sırasında IMEI girilmişse
 * cihazın IMEI'si var demektir; Mac gibi IMEI'siz cihazlarda alan zorunlu olmaz.
 */
export const deviceHasImei = (repair) => Boolean(repair?.imei1 || repair?.imei2);

/**
 * ARC sonuç taslağını doğrular.
 * @param {Object} draft  {code, newSerial, newImei1, newImei2, replacedParts, report}
 * @param {Object} options {requireImei}
 * @returns {Object} alan adı → hata mesajı
 */
export const validateArcOutcome = (draft, options = {}) => {
    const errors = {};
    const outcome = getArcOutcome(draft?.code);

    if (!outcome) {
        errors.code = 'Onarım merkezinde ne yapıldığını seçin.';
        return errors;
    }

    if (outcome.requiresIdentity) {
        if (!String(draft.newSerial || '').trim()) {
            errors.newSerial = `${outcome.identityLabel} zorunludur.`;
        }
        if (options.requireImei !== false) {
            if (!String(draft.newImei1 || '').trim()) errors.newImei1 = 'IMEI 1 zorunludur.';
            if (!String(draft.newImei2 || '').trim()) errors.newImei2 = 'IMEI 2 zorunludur.';
        }
    }

    if (outcome.requiresParts) {
        const parts = (draft.replacedParts || []).filter(p => String(p?.description || '').trim());
        if (parts.length === 0) {
            errors.replacedParts = 'En az bir değişen parça girin (parça tanımı zorunludur).';
        }
    }

    if (!String(draft.report || '').trim()) {
        errors.report = 'Servis sonuç raporu zorunludur.';
    }

    return errors;
};

/** Kayıt geçmişine ve müşteri formuna yazılacak özet satır */
export const summarizeArcOutcome = (arcOutcome) => {
    const outcome = getArcOutcome(arcOutcome?.code);
    if (!outcome) return '';

    const bits = [outcome.label];
    if (outcome.requiresIdentity && arcOutcome.newSerial) {
        bits.push(`Yeni seri: ${arcOutcome.newSerial}`);
    }
    if (outcome.requiresParts) {
        const count = (arcOutcome.replacedParts || []).length;
        if (count) bits.push(`${count} parça değişti`);
    }
    return bits.join(' · ');
};
