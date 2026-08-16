import React, { useState, useEffect, useId, useRef, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
    Truck, CheckCircle, ExternalLink, Box, AlertCircle, Wrench, Clock, Plus, Trash2,
    FileText, DollarSign, X, Mail, Camera, Smartphone, ClipboardList, Check, Save
} from 'lucide-react';
import CustomerNotificationModal from './CustomerNotificationModal';
import { useAppContext } from '../context/AppContext';
import {
    ARC_OUTCOMES, getArcOutcome, arcOutcomeStatus, validateArcOutcome,
    summarizeArcOutcome, emptyArcPart, deviceHasImei
} from '../utils/arcOutcome';

/* ------------------------------------------------------------------
   Cihaz Lojistik & Takip
   Bütün Birim Posta akışındaki kayıtların servis ekranı. Cihaz Apple
   Onarım Merkezi'ne gönderilir, döndüğünde merkezde ne yapıldığı
   yapılandırılmış bir sonuç koduyla kayda geçer.

   GSX form dili: numaralı bölümler, açık etiketler, hata özeti ve
   klavye/ekran okuyucu ile tam kullanılabilirlik.
------------------------------------------------------------------ */

const inputBase = 'w-full bg-white border border-gray-300 rounded-xl text-sm text-[#1d1d1f] placeholder:text-gray-400 outline-none transition-all focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15';
const ghostButton = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-[13px] font-semibold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25';

// Sonucun görsel tonu — bilgi / başarı / uyarı / iade
const TONES = {
    info: { border: 'border-[#0071e3]/25', bg: 'bg-[#0071e3]/5', text: 'text-[#0071e3]' },
    success: { border: 'border-[#1e7e34]/25', bg: 'bg-[#e6f4ea]', text: 'text-[#1e7e34]' },
    warning: { border: 'border-[#ff9500]/30', bg: 'bg-[#ff9500]/8', text: 'text-[#bf5b04]' },
    danger: { border: 'border-[#c30000]/25', bg: 'bg-[#fff5f5]', text: 'text-[#c30000]' },
};

/** Numaralı bölüm başlığı (GSX form dili) */
const FieldGroup = ({ index, title, hint, icon: Icon, required, children, action }) => (
    <section className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100">
            <div className="flex items-start gap-3 min-w-0">
                <span
                    aria-hidden="true"
                    className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-[#f5f5f7] text-[#1d1d1f] text-[11px] font-bold flex items-center justify-center border border-gray-200"
                >
                    {index}
                </span>
                <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                        {Icon && <Icon size={14} className="text-[#0071e3] shrink-0" aria-hidden="true" />}
                        {title}
                        {required && <span className="text-[#c30000] font-bold" aria-hidden="true">*</span>}
                        {required && <span className="sr-only">(zorunlu alan)</span>}
                    </h3>
                    {hint && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{hint}</p>}
                </div>
            </div>
            {action}
        </header>
        <div className="p-5">{children}</div>
    </section>
);

const FieldError = ({ id, children }) => (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold text-[#c30000]">
        <AlertCircle size={13} className="shrink-0 mt-px" aria-hidden="true" />
        {children}
    </p>
);

/** Salt okunur künye satırı */
const InfoRow = ({ label, value, mono }) => (
    <div>
        <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</dt>
        <dd className={`text-[13px] font-semibold text-[#1d1d1f] mt-0.5 break-words ${mono ? 'font-mono' : ''}`}>
            {value || '—'}
        </dd>
    </div>
);

const AppleLogisticsModal = ({ repairId, onClose }) => {
    const { updateRepair, repairs, showToast, uploadMedia, currentUser } = useAppContext();
    const uid = useId();
    const fieldId = (name) => `${uid}-${name}`;

    const repair = useMemo(() => repairs.find(r => r.id === repairId) || null, [repairs, repairId]);

    const [shipmentCode, setShipmentCode] = useState('');
    const [gsxNo, setGsxNo] = useState('');
    const [errors, setErrors] = useState({});
    const [uploading, setUploading] = useState(false);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // ARC sonuç taslağı
    const [outcomeCode, setOutcomeCode] = useState('');
    const [newSerial, setNewSerial] = useState('');
    const [newImei1, setNewImei1] = useState('');
    const [newImei2, setNewImei2] = useState('');
    const [replacedParts, setReplacedParts] = useState([]);
    const [report, setReport] = useState('');

    const fileInputRef = useRef(null);
    const errorSummaryRef = useRef(null);
    const dialogRef = useRef(null);
    const hydratedFor = useRef(null);

    const outcome = getArcOutcome(outcomeCode);
    const requireImei = deviceHasImei(repair);

    // Kayıt değişince yerel taslağı bir kez doldur; sonraki global
    // güncellemeler kullanıcının yazdıklarını ezmemeli
    useEffect(() => {
        if (!repair || hydratedFor.current === repair.id) return;
        hydratedFor.current = repair.id;

        setShipmentCode(repair.shipmentCode || '');
        setGsxNo(repair.appleRepairId || '');

        const saved = repair.arcOutcome || null;
        setOutcomeCode(saved?.code || '');
        setNewSerial(saved?.newSerial || '');
        setNewImei1(saved?.newImei1 || '');
        setNewImei2(saved?.newImei2 || '');
        setReplacedParts(saved?.replacedParts?.length ? saved.replacedParts : []);
        setReport(saved?.report || '');
        setErrors({});
    }, [repair]);

    useEffect(() => {
        dialogRef.current?.focus();
        const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const errorList = Object.values(errors).filter(Boolean);

    const draft = { code: outcomeCode, newSerial, newImei1, newImei2, replacedParts, report };

    /** Cihaz merkezden döndüğünde açılan bölüm */
    const canReceive = repair && [
        "Apple'a Gönderildi", 'İade Bekleniyor', 'Müşteri Onayı Bekliyor', 'Cihaz Hazır', 'İade Hazır'
    ].includes(repair.status);

    const handleOutcomeChange = (code) => {
        setOutcomeCode(code);
        const next = getArcOutcome(code);
        // Sonuç değişince önceki sonuca ait alanlar geçersiz olur
        if (!next?.requiresIdentity) {
            setNewSerial(''); setNewImei1(''); setNewImei2('');
        }
        if (!next?.requiresParts) {
            setReplacedParts([]);
        } else if (replacedParts.length === 0) {
            setReplacedParts([emptyArcPart()]);
        }
        setErrors({});
    };

    const addPart = () => setReplacedParts(prev => [...prev, emptyArcPart()]);
    const removePart = (index) => setReplacedParts(prev => prev.filter((_, i) => i !== index));
    const updatePart = (index, field, value) => {
        setReplacedParts(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
        setErrors(prev => ({ ...prev, replacedParts: undefined }));
    };

    const handleStartTracking = async () => {
        if (!shipmentCode.trim()) {
            setErrors({ shipmentCode: 'Gönderi takip numarası zorunludur.' });
            requestAnimationFrame(() => errorSummaryRef.current?.focus());
            return;
        }
        setErrors({});
        await updateRepair(repairId, {
            status: "Apple'a Gönderildi",
            shipmentCode: shipmentCode.trim(),
            appleRepairId: gsxNo.trim(),
            historyNote: `Kargo takip no girildi: ${shipmentCode.trim()}. Cihaz Apple Onarım Merkezi'ne gönderildi.`
        });
        showToast('Takip numarası kaydedildi, cihaz gönderildi olarak işaretlendi.', 'success');
    };

    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            await updateRepair(repairId, {
                shipmentCode: shipmentCode.trim(),
                appleRepairId: gsxNo.trim(),
                // Taslakta durum değişmez; yalnızca girilenler saklanır
                arcOutcome: outcomeCode ? { ...draft, status: 'draft' } : undefined,
                historyNote: 'Lojistik bilgileri güncellendi (taslak).'
            });
            showToast('İlerleme kaydedildi.', 'success');
        } finally {
            setSaving(false);
        }
    };

    /** Cihazı merkezden teslim al: sonuç kodu ve raporu kalıcı yazar */
    const handleReceiveFromARC = async () => {
        const nextErrors = validateArcOutcome(draft, { requireImei });
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            requestAnimationFrame(() => errorSummaryRef.current?.focus());
            return;
        }
        setErrors({});

        const cleanParts = (replacedParts || [])
            .filter(p => String(p.description || '').trim())
            .map(p => ({
                partNumber: String(p.partNumber || '').trim().toUpperCase(),
                description: String(p.description || '').trim(),
                kbbSerial: String(p.kbbSerial || '').trim().toUpperCase(),
                kgbSerial: String(p.kgbSerial || '').trim().toUpperCase(),
            }));

        const arcOutcome = {
            code: outcomeCode,
            label: outcome.label,
            newSerial: outcome.requiresIdentity ? newSerial.trim().toUpperCase() : '',
            newImei1: outcome.requiresIdentity ? newImei1.trim() : '',
            newImei2: outcome.requiresIdentity ? newImei2.trim() : '',
            replacedParts: outcome.requiresParts ? cleanParts : [],
            report: report.trim(),
            // Cihaz kimliği değiştiyse kabuldeki bilgiler kayıtta saklanır
            previousSerial: outcome.requiresIdentity ? (repair.serial || '') : '',
            previousImei1: outcome.requiresIdentity ? (repair.imei1 || '') : '',
            previousImei2: outcome.requiresIdentity ? (repair.imei2 || '') : '',
            recordedAt: new Date().toISOString(),
            recordedBy: currentUser?.name || 'Bilinmeyen Kullanıcı',
            status: 'final',
        };

        const updates = {
            status: arcOutcomeStatus(outcomeCode),
            appleRepairId: gsxNo.trim(),
            shipmentCode: shipmentCode.trim(),
            arcOutcome,
            repairClosingNote: report.trim(),
            historyNote: `Cihaz Apple Onarım Merkezi'nden teslim alındı. ${summarizeArcOutcome(arcOutcome)}`
        };

        // Birim/anakart değiştiyse kaydın cihaz kimliği güncellenir
        if (outcome.requiresIdentity) {
            updates.serial = arcOutcome.newSerial;
            if (arcOutcome.newImei1) updates.imei1 = arcOutcome.newImei1;
            if (arcOutcome.newImei2) updates.imei2 = arcOutcome.newImei2;
        }

        // Merkezde değişen parçalar arcOutcome.replacedParts içinde durur.
        // repair.parts'a yazılmaz; orası teşhiste girilen bütün birim kaydını
        // (arızalı cihaz seri no dahil) tutar ve ezilmemelidir.

        setSaving(true);
        try {
            await updateRepair(repairId, updates);
            showToast(`Sonuç kaydedildi. Kayıt "${updates.status}" durumuna alındı.`, 'success');
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const handleQuoteReceived = async () => {
        const { value: amount } = await Swal.fire({
            title: 'Teklif Alındı',
            input: 'number',
            inputLabel: 'Müşteriye iletilecek teklif tutarı (TL)',
            inputPlaceholder: '0.00',
            showCancelButton: true,
            confirmButtonColor: '#0071e3',
            cancelButtonText: 'Vazgeç',
            confirmButtonText: 'Kaydet'
        });

        if (amount) {
            await updateRepair(repairId, {
                status: 'Müşteri Onayı Bekliyor',
                quoteAmount: amount,
                historyNote: `Onarım merkezinden teklif geldi: ${amount} TL. Müşteri onayı bekleniyor.`
            });
            showToast('Kayıt "Onay Bekliyor" durumuna alındı.', 'info');
        }
    };

    const handleQuoteResolution = async (isApproved) => {
        if (isApproved) {
            await updateRepair(repairId, {
                status: "Apple'a Gönderildi",
                historyNote: 'Müşteri teklifi onayladı. Onarım merkezi sürecine devam ediliyor.'
            });
            showToast('Onay kaydedildi, süreç devam ediyor.', 'success');
        } else {
            await updateRepair(repairId, {
                status: 'İade Bekleniyor',
                historyNote: 'Müşteri teklifi reddetti. Onarım merkezinden iade istendi.'
            });
            showToast('Red kaydedildi, cihaz iade bekleniyor durumuna alındı.', 'info');
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const data = await uploadMedia(file);
            if (data?.url) {
                const isAfter = repair.status.includes('Hazır') || repair.status.includes('Teslim');
                const field = isAfter ? 'afterImages' : 'beforeImages';
                await updateRepair(repairId, { [field]: [...(repair[field] || []), data.url] });
                showToast('Lojistik görseli kaydedildi.', 'success');
            }
        } catch (error) {
            console.error(error);
            showToast('Görsel yüklenemedi.', 'error');
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const removePhoto = async (index, field) => {
        const next = [...(repair[field] || [])];
        next.splice(index, 1);
        await updateRepair(repairId, { [field]: next });
    };

    if (!repair) return null;

    const photos = [
        ...(repair.beforeImages || []).map((url, idx) => ({ url, idx, field: 'beforeImages', label: 'Gönderim öncesi' })),
        ...(repair.afterImages || []).map((url, idx) => ({ url, idx, field: 'afterImages', label: 'Merkezden dönüş' })),
    ];

    return (
        <div className="fixed inset-0 z-[120] bg-[#1d1d1f]/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={fieldId('title')}
                tabIndex={-1}
                className="bg-[#f5f5f7] w-full max-w-4xl rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] outline-none"
            >
                {/* Başlık */}
                <header className="bg-white px-6 sm:px-7 py-5 border-b border-gray-200 flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0">
                            <Truck size={20} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3]">Bütün Birim Posta</p>
                            <h2 id={fieldId('title')} className="text-[17px] font-semibold text-[#1d1d1f] truncate">
                                Cihaz Lojistik &amp; Takip
                            </h2>
                            <p className="text-[12px] font-medium text-gray-500 truncate">
                                <span className="font-mono">#{repair.id}</span> · {repair.device} · {repair.customer}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Pencereyi kapat"
                        className="h-10 w-10 shrink-0 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-5">
                    {errorList.length > 0 && (
                        <div
                            ref={errorSummaryRef}
                            tabIndex={-1}
                            role="alert"
                            className="rounded-2xl border border-[#c30000]/25 bg-[#fff5f5] px-5 py-4 outline-none focus-visible:ring-4 focus-visible:ring-[#c30000]/20"
                        >
                            <p className="flex items-center gap-2 text-[13px] font-semibold text-[#c30000]">
                                <AlertCircle size={15} aria-hidden="true" />
                                Devam etmek için {errorList.length} alanı düzeltin
                            </p>
                            <ul className="mt-2 ml-6 list-disc space-y-1 text-[12px] font-medium text-[#8a0000]">
                                {errorList.map((msg, i) => <li key={i}>{msg}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* 1 · Kayıt künyesi */}
                    <FieldGroup index="1" title="Kayıt Künyesi" hint="Kabulde alınan cihaz ve müşteri bilgileri." icon={FileText}>
                        <dl className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            <InfoRow label="Müşteri" value={repair.customer} />
                            <InfoRow label="Telefon" value={repair.customerPhone} mono />
                            <InfoRow label="Cihaz" value={repair.device} />
                            <InfoRow label="Seri No" value={repair.serial || repair.serialNumber} mono />
                            {repair.imei1 && <InfoRow label="IMEI 1" value={repair.imei1} mono />}
                            {repair.imei2 && <InfoRow label="IMEI 2" value={repair.imei2} mono />}
                            <InfoRow label="Garanti" value={repair.warrantyStatus} />
                            <InfoRow label="Durum" value={repair.status} />
                        </dl>
                        <div className="mt-5 pt-4 border-t border-gray-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Müşteri Şikâyeti</p>
                            <p className="text-[13px] text-gray-700 leading-relaxed mt-1">
                                {repair.issue || 'Belirtilmedi'}
                            </p>
                        </div>
                    </FieldGroup>

                    {/* 2 · Gönderi ve takip */}
                    <FieldGroup index="2" title="Gönderi ve Takip" hint="Kargo takip numarası ve merkezin onarım numarası." icon={Truck}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor={fieldId('shipment')} className="block text-[12px] font-semibold text-[#1d1d1f] mb-2">
                                    Kargo takip numarası
                                </label>
                                <input
                                    id={fieldId('shipment')}
                                    type="text"
                                    className={`${inputBase} h-12 px-4 font-mono font-semibold uppercase`}
                                    placeholder="Takip no"
                                    value={shipmentCode}
                                    onChange={(e) => { setShipmentCode(e.target.value.toUpperCase()); setErrors(prev => ({ ...prev, shipmentCode: undefined })); }}
                                    aria-invalid={errors.shipmentCode ? 'true' : undefined}
                                    aria-describedby={errors.shipmentCode ? fieldId('shipment-error') : undefined}
                                />
                                {errors.shipmentCode && <FieldError id={fieldId('shipment-error')}>{errors.shipmentCode}</FieldError>}
                            </div>
                            <div>
                                <label htmlFor={fieldId('gsx')} className="block text-[12px] font-semibold text-[#1d1d1f] mb-2">
                                    Onarım merkezi numarası (GSX)
                                </label>
                                <input
                                    id={fieldId('gsx')}
                                    type="text"
                                    className={`${inputBase} h-12 px-4 font-mono font-semibold uppercase`}
                                    placeholder="Onarım no"
                                    value={gsxNo}
                                    onChange={(e) => setGsxNo(e.target.value.toUpperCase())}
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={handleStartTracking}
                                className={`${ghostButton} bg-[#0071e3] text-white hover:bg-[#0077ed]`}
                            >
                                <Truck size={15} aria-hidden="true" /> Takibi Başlat
                            </button>
                            {shipmentCode && (
                                <a
                                    href={`https://www.ups.com/track?tracknum=${encodeURIComponent(shipmentCode)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${ghostButton} bg-white text-[#0071e3] border border-[#0071e3]/30 hover:bg-[#0071e3]/5`}
                                >
                                    <ExternalLink size={15} aria-hidden="true" /> Kargo Durumu
                                </a>
                            )}
                        </div>
                    </FieldGroup>

                    {/* 3 · Onarım merkezi sonucu */}
                    {canReceive && (
                        <FieldGroup
                            index="3"
                            title="Onarım Merkezinde Ne Yapıldı?"
                            hint="Cihaz merkezden döndüğünde yapılan işlemi doğrulayın. Seçime göre ek alanlar açılır."
                            icon={Wrench}
                            required
                        >
                            <div
                                role="radiogroup"
                                aria-label="Onarım merkezinde yapılan işlem"
                                aria-describedby={errors.code ? fieldId('code-error') : undefined}
                                className="grid grid-cols-1 md:grid-cols-2 gap-3"
                            >
                                {ARC_OUTCOMES.map(opt => {
                                    const selected = outcomeCode === opt.code;
                                    const tone = TONES[opt.tone] || TONES.info;
                                    return (
                                        <label
                                            key={opt.code}
                                            className={`relative flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#0071e3]/25 ${selected
                                                ? `${tone.border} ${tone.bg}`
                                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'}`}
                                        >
                                            <input
                                                type="radio"
                                                name={fieldId('outcome')}
                                                value={opt.code}
                                                checked={selected}
                                                onChange={() => handleOutcomeChange(opt.code)}
                                                className="sr-only"
                                            />
                                            <span
                                                aria-hidden="true"
                                                className={`mt-0.5 w-[18px] h-[18px] shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-all ${selected ? 'border-[#0071e3] bg-[#0071e3]' : 'border-gray-300 bg-white'}`}
                                            >
                                                {selected && <Check size={11} strokeWidth={3.5} className="text-white" />}
                                            </span>
                                            <span className="min-w-0">
                                                <span className={`block text-[13px] font-semibold ${selected ? tone.text : 'text-[#1d1d1f]'}`}>
                                                    {opt.label}
                                                </span>
                                                <span className="block text-[11px] text-gray-500 mt-0.5 leading-snug">{opt.hint}</span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            {errors.code && <FieldError id={fieldId('code-error')}>{errors.code}</FieldError>}

                            {/* Cihaz kimliği — birim ya da anakart değiştiyse */}
                            {outcome?.requiresIdentity && (
                                <div className="mt-5 rounded-xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-4">
                                    <h4 className="text-[12px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                                        <Smartphone size={14} className="text-[#0071e3]" aria-hidden="true" />
                                        Yeni Cihaz Kimliği
                                    </h4>
                                    <p className="text-[11px] text-gray-600 mt-1 leading-snug">
                                        Kaydın cihaz kimliği bu bilgilerle güncellenir. Kabuldeki eski bilgiler
                                        {' '}(<span className="font-mono">{repair.serial || '—'}</span>) kayıt geçmişinde saklanır.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div className="md:col-span-2">
                                            <label htmlFor={fieldId('newSerial')} className="block text-[12px] font-semibold text-[#1d1d1f] mb-2">
                                                {outcome.identityLabel} <span className="text-[#c30000]" aria-hidden="true">*</span>
                                            </label>
                                            <input
                                                id={fieldId('newSerial')}
                                                type="text"
                                                className={`${inputBase} h-12 px-4 font-mono font-semibold uppercase`}
                                                placeholder="Seri numarası"
                                                value={newSerial}
                                                onChange={(e) => { setNewSerial(e.target.value.toUpperCase()); setErrors(prev => ({ ...prev, newSerial: undefined })); }}
                                                aria-required="true"
                                                aria-invalid={errors.newSerial ? 'true' : undefined}
                                                aria-describedby={errors.newSerial ? fieldId('newSerial-error') : undefined}
                                            />
                                            {errors.newSerial && <FieldError id={fieldId('newSerial-error')}>{errors.newSerial}</FieldError>}
                                        </div>

                                        <div>
                                            <label htmlFor={fieldId('newImei1')} className="block text-[12px] font-semibold text-[#1d1d1f] mb-2">
                                                IMEI 1 {requireImei && <span className="text-[#c30000]" aria-hidden="true">*</span>}
                                            </label>
                                            <input
                                                id={fieldId('newImei1')}
                                                type="text"
                                                inputMode="numeric"
                                                className={`${inputBase} h-12 px-4 font-mono font-semibold`}
                                                placeholder={requireImei ? 'IMEI 1' : 'Cihazda IMEI yoksa boş bırakın'}
                                                value={newImei1}
                                                onChange={(e) => { setNewImei1(e.target.value.replace(/\D/g, '')); setErrors(prev => ({ ...prev, newImei1: undefined })); }}
                                                aria-required={requireImei ? 'true' : undefined}
                                                aria-invalid={errors.newImei1 ? 'true' : undefined}
                                                aria-describedby={errors.newImei1 ? fieldId('newImei1-error') : undefined}
                                            />
                                            {errors.newImei1 && <FieldError id={fieldId('newImei1-error')}>{errors.newImei1}</FieldError>}
                                        </div>

                                        <div>
                                            <label htmlFor={fieldId('newImei2')} className="block text-[12px] font-semibold text-[#1d1d1f] mb-2">
                                                IMEI 2 {requireImei && <span className="text-[#c30000]" aria-hidden="true">*</span>}
                                            </label>
                                            <input
                                                id={fieldId('newImei2')}
                                                type="text"
                                                inputMode="numeric"
                                                className={`${inputBase} h-12 px-4 font-mono font-semibold`}
                                                placeholder={requireImei ? 'IMEI 2' : 'Cihazda IMEI yoksa boş bırakın'}
                                                value={newImei2}
                                                onChange={(e) => { setNewImei2(e.target.value.replace(/\D/g, '')); setErrors(prev => ({ ...prev, newImei2: undefined })); }}
                                                aria-required={requireImei ? 'true' : undefined}
                                                aria-invalid={errors.newImei2 ? 'true' : undefined}
                                                aria-describedby={errors.newImei2 ? fieldId('newImei2-error') : undefined}
                                            />
                                            {errors.newImei2 && <FieldError id={fieldId('newImei2-error')}>{errors.newImei2}</FieldError>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Değişen parçalar — onarılıp iade edildiyse */}
                            {outcome?.requiresParts && (
                                <div className="mt-5 rounded-xl border border-gray-200 bg-[#f5f5f7]/50 p-4">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <h4 className="text-[12px] font-semibold text-[#1d1d1f] flex items-center gap-2">
                                            <Box size={14} className="text-[#0071e3]" aria-hidden="true" />
                                            Merkezde Değişen Parçalar <span className="text-[#c30000]" aria-hidden="true">*</span>
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={addPart}
                                            className={`${ghostButton} h-9 px-4 text-[12px] bg-white text-[#0071e3] border border-[#0071e3]/30 hover:bg-[#0071e3]/5`}
                                        >
                                            <Plus size={14} aria-hidden="true" /> Parça Ekle
                                        </button>
                                    </div>

                                    {replacedParts.length === 0 ? (
                                        <p className="text-[12px] font-medium text-gray-500 text-center py-5 border border-dashed border-gray-300 rounded-xl bg-white">
                                            Henüz parça eklenmedi.
                                        </p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {replacedParts.map((part, index) => (
                                                <li key={index}>
                                                    <fieldset className="rounded-xl border border-gray-200 bg-white p-4">
                                                        <legend className="sr-only">{index + 1}. değişen parça</legend>
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-w-0">
                                                                <div>
                                                                    <label htmlFor={fieldId(`p-${index}-desc`)} className="block text-[11px] font-semibold text-gray-600 mb-1">
                                                                        Parça tanımı <span className="text-[#c30000]" aria-hidden="true">*</span>
                                                                    </label>
                                                                    <input
                                                                        id={fieldId(`p-${index}-desc`)}
                                                                        type="text"
                                                                        className={`${inputBase} h-10 px-3 font-semibold`}
                                                                        placeholder="Örn: Ekran modülü"
                                                                        value={part.description || ''}
                                                                        onChange={(e) => updatePart(index, 'description', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label htmlFor={fieldId(`p-${index}-pn`)} className="block text-[11px] font-semibold text-gray-600 mb-1">
                                                                        Parça no <span className="font-medium text-gray-400">— opsiyonel</span>
                                                                    </label>
                                                                    <input
                                                                        id={fieldId(`p-${index}-pn`)}
                                                                        type="text"
                                                                        className={`${inputBase} h-10 px-3 font-mono text-[12px] uppercase`}
                                                                        placeholder="P/N"
                                                                        value={part.partNumber || ''}
                                                                        onChange={(e) => updatePart(index, 'partNumber', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label htmlFor={fieldId(`p-${index}-kbb`)} className="block text-[11px] font-semibold text-[#b25e00] mb-1">
                                                                        Sökülen parça seri <span className="font-medium text-gray-400">— opsiyonel</span>
                                                                    </label>
                                                                    <input
                                                                        id={fieldId(`p-${index}-kbb`)}
                                                                        type="text"
                                                                        className={`${inputBase} h-10 px-3 font-mono text-[12px] uppercase`}
                                                                        value={part.kbbSerial || ''}
                                                                        onChange={(e) => updatePart(index, 'kbbSerial', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label htmlFor={fieldId(`p-${index}-kgb`)} className="block text-[11px] font-semibold text-[#1e7e34] mb-1">
                                                                        Takılan parça seri <span className="font-medium text-gray-400">— opsiyonel</span>
                                                                    </label>
                                                                    <input
                                                                        id={fieldId(`p-${index}-kgb`)}
                                                                        type="text"
                                                                        className={`${inputBase} h-10 px-3 font-mono text-[12px] uppercase`}
                                                                        value={part.kgbSerial || ''}
                                                                        onChange={(e) => updatePart(index, 'kgbSerial', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removePart(index)}
                                                                className="w-9 h-9 shrink-0 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#c30000] hover:border-[#c30000]/30 hover:bg-[#fff5f5] flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#c30000]/20"
                                                            >
                                                                <Trash2 size={15} aria-hidden="true" />
                                                                <span className="sr-only">{index + 1}. parçayı kaldır</span>
                                                            </button>
                                                        </div>
                                                    </fieldset>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {errors.replacedParts && <FieldError id={fieldId('parts-error')}>{errors.replacedParts}</FieldError>}
                                </div>
                            )}
                        </FieldGroup>
                    )}

                    {/* 4 · Servis sonuç raporu */}
                    {canReceive && (
                        <FieldGroup
                            index="4"
                            title="Servis Sonuç Raporu"
                            hint="Müşteriye teslim formunda görünür. Yapılan işlemi anlaşılır bir dille özetleyin."
                            icon={ClipboardList}
                            required
                        >
                            <label htmlFor={fieldId('report')} className="sr-only">Servis sonuç raporu</label>
                            <textarea
                                id={fieldId('report')}
                                className={`${inputBase} p-4 min-h-[112px] leading-relaxed resize-y`}
                                placeholder="Onarım merkezinden gelen sonucu ve cihazın teslim durumunu yazın…"
                                value={report}
                                onChange={(e) => { setReport(e.target.value); setErrors(prev => ({ ...prev, report: undefined })); }}
                                aria-required="true"
                                aria-invalid={errors.report ? 'true' : undefined}
                                aria-describedby={errors.report ? fieldId('report-error') : fieldId('report-hint')}
                            />
                            {errors.report
                                ? <FieldError id={fieldId('report-error')}>{errors.report}</FieldError>
                                : (
                                    <p id={fieldId('report-hint')} className="mt-2 text-[11px] text-gray-500 leading-snug">
                                        {outcome
                                            ? `Müşteri formunda ayrıca şu açıklama yer alacak: “${outcome.customerText}”`
                                            : 'Sonuç seçtiğinizde müşteriye gösterilecek açıklama burada önizlenir.'}
                                    </p>
                                )}
                        </FieldGroup>
                    )}

                    {/* 5 · Görsel arşiv */}
                    <FieldGroup
                        index={canReceive ? '5' : '3'}
                        title="Lojistik Görsel Arşivi"
                        hint="Gönderim öncesi ve merkezden dönüş fotoğrafları."
                        icon={Camera}
                        action={
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className={`${ghostButton} h-9 px-4 text-[12px] shrink-0 bg-white text-[#0071e3] border border-[#0071e3]/30 hover:bg-[#0071e3]/5 disabled:opacity-50`}
                            >
                                {uploading ? <Clock size={14} className="animate-spin" aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                                Görsel Ekle
                            </button>
                        }
                    >
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                        {photos.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-300 bg-[#f5f5f7]/60 px-5 py-6 text-center">
                                <Camera size={22} className="mx-auto text-gray-400 mb-2" aria-hidden="true" />
                                <p className="text-[12px] font-medium text-gray-500">Henüz lojistik görseli eklenmedi.</p>
                            </div>
                        ) : (
                            <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {photos.map((photo) => (
                                    <li key={`${photo.field}-${photo.idx}`} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-[#f5f5f7]">
                                        <img src={photo.url} alt={`${photo.label} görseli`} className="w-full aspect-video object-cover" />
                                        <span className="absolute inset-x-0 bottom-0 bg-[#1d1d1f]/70 text-white text-[9px] font-semibold text-center py-0.5">
                                            {photo.label}
                                        </span>
                                        <div className="absolute inset-0 bg-[#1d1d1f]/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <a
                                                href={photo.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-white/25 backdrop-blur-sm rounded-lg text-white hover:bg-white/40 outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                                            >
                                                <ExternalLink size={13} aria-hidden="true" />
                                                <span className="sr-only">Görseli aç</span>
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(photo.idx, photo.field)}
                                                className="p-2 bg-[#c30000]/85 rounded-lg text-white hover:bg-[#c30000] outline-none focus-visible:ring-4 focus-visible:ring-[#c30000]/40"
                                            >
                                                <Trash2 size={13} aria-hidden="true" />
                                                <span className="sr-only">Görseli sil</span>
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </FieldGroup>
                </div>

                {/* Alt bar */}
                <footer className="bg-white px-5 sm:px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setShowNotificationModal(true)}
                            className={`${ghostButton} bg-white text-[#1d1d1f] border border-gray-200 hover:bg-[#f5f5f7]`}
                        >
                            <Mail size={15} aria-hidden="true" /> Durum Bildir
                        </button>
                        {repair.status === 'Müşteri Onayı Bekliyor' ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleQuoteResolution(true)}
                                    className={`${ghostButton} bg-[#e6f4ea] text-[#1e7e34] border border-[#1e7e34]/20 hover:bg-[#d7ecdd]`}
                                >
                                    <CheckCircle size={15} aria-hidden="true" /> Teklif Onaylandı
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuoteResolution(false)}
                                    className={`${ghostButton} bg-[#fff5f5] text-[#c30000] border border-[#c30000]/20 hover:bg-[#ffe9e9]`}
                                >
                                    <X size={15} aria-hidden="true" /> Teklif Reddedildi
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={handleQuoteReceived}
                                className={`${ghostButton} bg-white text-[#b25e00] border border-[#ff9500]/30 hover:bg-[#ff9500]/8`}
                            >
                                <DollarSign size={15} aria-hidden="true" /> Teklif Geldi
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={saving}
                            className={`${ghostButton} bg-white text-[#1d1d1f] border border-gray-200 hover:bg-[#f5f5f7] disabled:opacity-50`}
                        >
                            <Save size={15} aria-hidden="true" /> Taslak Kaydet
                        </button>
                        {canReceive && (
                            <button
                                type="button"
                                onClick={handleReceiveFromARC}
                                disabled={saving}
                                className={`${ghostButton} bg-[#0071e3] text-white hover:bg-[#0077ed] disabled:opacity-50`}
                            >
                                <CheckCircle size={15} aria-hidden="true" />
                                {saving ? 'Kaydediliyor…' : 'Sonucu Kaydet ve Teslim Al'}
                            </button>
                        )}
                    </div>
                </footer>
            </div>

            {showNotificationModal && (
                <CustomerNotificationModal
                    repair={repair}
                    onClose={() => setShowNotificationModal(false)}
                    onActionComplete={() => {
                        setShowNotificationModal(false);
                        onClose();
                    }}
                />
            )}
        </div>
    );
};

export default AppleLogisticsModal;
