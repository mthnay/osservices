import React, { useState, useId, useRef, useEffect, useMemo } from 'react';
import {
    Save, Wrench, Plus, Trash2, Mail, ArrowLeft, ChevronRight, Activity, Zap,
    RotateCcw, Check, Sparkles, CheckCircle, AlertCircle, Package, X, Search, ClipboardList
} from 'lucide-react';
import CustomerNotificationModal from './CustomerNotificationModal';
import { useAppContext } from '../context/AppContext';
import ConfirmationModal from './ConfirmationModal';
import AISuggestionCard from './AISuggestionCard';

const REPAIR_TYPES = [
    { id: 'carry-in', label: 'Bizzat Teslim (Mağaza İçi)', hint: 'Cihaz mağazada onarılacak', target: 'in-store' },
    { id: 'returnbefore', label: 'Değiştirmeden Önce İade', hint: 'Değişim öncesi müşteriye iade', target: 'in-store' },
    { id: 'mail-in', label: 'Bütün Birim Posta', hint: 'Apple Onarım Merkezi’ne gönderilecek', target: 'apple-center' },
    { id: 'approval', label: 'Müşteri Onayı Bekleyen', hint: 'Teklif müşteri onayına sunulacak', target: 'approval-pending' },
    { id: 'service', label: 'Onarım Olmayan Servis', hint: 'Onarım gerektirmeyen işlem', target: 'ready-pickup' }
];

const RETURN_REASONS = [
    'Arıza Tekrarlanamadı (No Trouble Found)',
    'Arıza Raporuyla (DOA) iade',
    'Müşteri Teklifi Reddetti',
    'Ekonomik Onarım Mümkün Değil (BER)',
    'Yetkisiz Müdahale Tespit Edildi',
    'Yedek Parça Temin Edilemiyor',
    'Müşteri İsteğiyle İade'
];

const MAX_PARTS = 5;

// Bölüm başlığı: numaralı adım + açıklama (GSX form dili)
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

/**
 * Teşhis akışı. `embedded` modda kendi başlığı ve aksiyon çubuğuyla sayfa içi bir bölüm olarak,
 * aksi hâlde RepairDiagnosisModal içinde tam ekran diyalog olarak çalışır.
 */
const RepairDiagnosisPanel = ({ repair, onSave, onCancel, embedded = false }) => {
    const { inventory, usePart, showToast, updateInventoryItem, addInventoryItem, API_URL } = useAppContext();
    const uid = useId();
    const fieldId = (name) => `${uid}-${name}`;

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        repairType: '',
        tests: '',
        notes: '',
        parts: []
    });
    const [repairId, setRepairId] = useState('');
    const [quoteAmount, setQuoteAmount] = useState('');
    const [errors, setErrors] = useState({});
    const [showHelper, setShowHelper] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiDiagnosis, setAiDiagnosis] = useState(null);

    // İade akışı
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [customReturnReason, setCustomReturnReason] = useState('');

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Parça arama (combobox)
    const [partSearch, setPartSearch] = useState('');
    const [showPartDropdown, setShowPartDropdown] = useState(false);
    const [activeOption, setActiveOption] = useState(-1);
    const comboRef = useRef(null);
    const errorSummaryRef = useRef(null);
    const repairIdInputRef = useRef(null);

    const filteredInventory = useMemo(() => {
        const q = partSearch.toLowerCase();
        return (inventory || []).filter(i => i.category !== 'loaner' && (
            (i.name || '').toLowerCase().includes(q) ||
            (i.partNumber || '').toLowerCase().includes(q) ||
            (i.id || '').toLowerCase().includes(q) ||
            (i.sku || '').toLowerCase().includes(q)
        ));
    }, [inventory, partSearch]);

    const dropdownOpen = showPartDropdown && partSearch.trim().length > 0;

    // Dışarı tıklanınca öneri listesini kapat
    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e) => {
            if (comboRef.current && !comboRef.current.contains(e.target)) {
                setShowPartDropdown(false);
                setActiveOption(-1);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [dropdownOpen]);

    // 2. adıma geçince onarım numarası alanına odaklan
    useEffect(() => {
        if (step === 2) repairIdInputRef.current?.focus();
    }, [step]);

    const errorList = Object.values(errors).filter(Boolean);

    const addPartOrdered = () => {
        if (!partSearch.trim()) return;

        const existing = (inventory || []).find(i =>
            (i.name || '').toLowerCase() === partSearch.toLowerCase() ||
            (i.partNumber || '').toLowerCase() === partSearch.toLowerCase()
        );

        if (existing) {
            addPartFromInventory(existing);
            return;
        }

        if (formData.parts.length >= MAX_PARTS) {
            showToast(`En fazla ${MAX_PARTS} parça ekleyebilirsiniz.`, 'warning');
            return;
        }

        setFormData(prev => ({
            ...prev,
            parts: [...prev.parts, {
                inventoryId: `NEW-${Date.now()}`,
                partNumber: '',
                description: '',
                kbbSerial: '',
                kgbSerial: '',
                needsOrder: true,
                isNewInventoryItem: true,
                availableSerials: []
            }]
        }));

        setPartSearch('');
        setShowPartDropdown(false);
        setActiveOption(-1);
    };

    const addPartFromInventory = (item) => {
        if (formData.parts.length >= MAX_PARTS) {
            showToast(`En fazla ${MAX_PARTS} parça ekleyebilirsiniz.`, 'warning');
            return;
        }

        setFormData(prev => ({
            ...prev,
            parts: [...prev.parts, {
                inventoryId: item.id,
                partNumber: item.partNumber,
                description: item.name,
                kbbSerial: '',
                kgbSerial: '',
                needsOrder: item.quantity <= 0, // Stok yoksa sipariş gerekir
                availableSerials: item.kgbSerials || []
            }]
        }));

        setPartSearch('');
        setShowPartDropdown(false);
        setActiveOption(-1);
    };

    const removePart = (index) => {
        setFormData(prev => ({ ...prev, parts: prev.parts.filter((_, i) => i !== index) }));
    };

    const updatePart = (index, field, value) => {
        setFormData(prev => {
            const parts = prev.parts.map((p, i) => (i === index ? { ...p, [field]: value } : p));
            return { ...prev, parts };
        });
    };

    // Combobox klavye desteği
    const handleComboKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setShowPartDropdown(true);
            setActiveOption(prev => Math.min(prev + 1, filteredInventory.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveOption(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeOption >= 0 && filteredInventory[activeOption]) {
                addPartFromInventory(filteredInventory[activeOption]);
            } else {
                addPartOrdered();
            }
        } else if (e.key === 'Escape') {
            setShowPartDropdown(false);
            setActiveOption(-1);
        }
    };

    const validateStep1 = () => {
        const next = {};
        if (!formData.repairType) next.repairType = 'Onarım türünü seçin.';
        if (!formData.notes.trim()) next.notes = 'Teknisyen notu zorunludur.';
        if (formData.repairType === 'approval' && !quoteAmount) next.quoteAmount = 'Teklif tutarını girin.';

        const incompleteIndex = formData.parts.findIndex(p => (!p.needsOrder && !p.kgbSerial) || !p.kbbSerial);
        if (incompleteIndex > -1) {
            next.parts = `${incompleteIndex + 1}. parçanın seri numarası eksik.`;
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleNext = () => {
        if (!validateStep1()) {
            // Hata özeti okuyucular tarafından duyurulsun
            requestAnimationFrame(() => errorSummaryRef.current?.focus());
            return;
        }
        setStep(2);
    };

    const finalizeSave = () => {
        const selectedType = REPAIR_TYPES.find(t => t.id === formData.repairType);
        onSave({
            ...formData,
            repairId,
            quoteAmount,
            originalRepair: repair,
            targetView: selectedType ? selectedType.target : 'in-store'
        });
    };

    const handleFinalSave = async () => {
        if (!repairId.trim()) {
            setErrors({ repairId: 'Onarım numarası zorunludur.' });
            repairIdInputRef.current?.focus();
            return;
        }
        setErrors({});

        // Parçaları stoktan düş veya envantere sipariş olarak ekle
        for (const part of formData.parts) {
            if (part.isNewInventoryItem) {
                await addInventoryItem({
                    id: part.partNumber || `P-${Date.now().toString().slice(-6)}`,
                    name: part.description,
                    partNumber: part.partNumber,
                    quantity: 0,
                    category: 'parts',
                    notes: 'Onarım teşhis aşamasında depodan sipariş olarak otomatik eklendi.'
                });
                continue; // Yeni eklenen parçada stok düşülmez (zaten 0)
            }

            const inventoryItem = (inventory || []).find(i => i.id === part.inventoryId);
            if (inventoryItem) {
                // usePart bir hook değil, context'ten gelen stok düşme aksiyonu
                // eslint-disable-next-line react-hooks/rules-of-hooks
                const success = await usePart(inventoryItem.id, 1);

                // Kullanılan seriyi envanterden çıkar
                if (success && part.kgbSerial && updateInventoryItem) {
                    const updatedKgbSerials = (inventoryItem.kgbSerials || []).filter(s => s !== part.kgbSerial);
                    updateInventoryItem(inventoryItem._id || inventoryItem.id, { kgbSerials: updatedKgbSerials });
                }

                if (!success) {
                    return new Promise((resolve) => {
                        setConfirmModal({
                            isOpen: true,
                            title: 'Stok Hatası',
                            message: `"${inventoryItem.name}" stoğu düşülemedi veya yetersiz. Yine de devam edilsin mi?`,
                            confirmText: 'Devam Et',
                            cancelText: 'Vazgeç',
                            onConfirm: () => {
                                finalizeSave();
                                resolve();
                            }
                        });
                    });
                }
            }
        }
        finalizeSave();
    };

    const handleDirectReturn = () => {
        if (!returnReason) {
            showToast('Lütfen bir iade nedeni seçiniz.', 'warning');
            return;
        }

        const finalReason = returnReason === 'Diğer' ? customReturnReason : returnReason;

        // Teşhis esnasında parça eklendiyse stoğa geri al
        formData.parts.forEach(part => {
            const invItem = (inventory || []).find(i => i.id === part.inventoryId);
            if (invItem) {
                const updatedSerials = [...(invItem.kgbSerials || [])];
                if (part.kgbSerial && !updatedSerials.includes(part.kgbSerial)) {
                    updatedSerials.push(part.kgbSerial);
                }
                updateInventoryItem(invItem._id || invItem.id, {
                    quantity: (invItem.quantity || 0) + 1,
                    kgbSerials: updatedSerials
                });
            }
        });

        onSave({
            ...formData,
            repairId: repairId || `R-${Math.floor(Math.random() * 100000)}`,
            originalRepair: repair,
            targetView: 'ready-pickup',
            repairType: 'direct-return',
            notes: returnReason.includes('DOA')
                ? `DOA RAPORU: ${customReturnReason || 'Detay girilmedi.'}`
                : finalReason + (customReturnReason ? ` - Not: ${customReturnReason}` : ''),
            parts: [] // Parçalar stoğa döndüğü için boşaltılıyor
        });
        setShowReturnModal(false);
        onCancel?.();
    };

    const handleAIDiagnose = async () => {
        if (!repair.issue) {
            showToast('Müşteri şikayeti bulunamadığı için analiz yapılamıyor.', 'warning');
            return;
        }

        setAiLoading(true);
        setAiDiagnosis(null);

        try {
            const response = await fetch(`${API_URL}/ai/diagnose`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    deviceModel: repair.device,
                    issueDescription: repair.issue
                })
            });

            const data = await response.json();
            if (data.success) {
                setAiDiagnosis(data.diagnosis);
            } else {
                showToast(data.message || 'AI analizi başarısız oldu.', 'error');
            }
        } catch (error) {
            console.error('AI Error:', error);
            showToast('Sunucu ile iletişim kurulamadı.', 'error');
        } finally {
            setAiLoading(false);
        }
    };

    const applyAISuggestion = (diagnosis) => {
        setFormData(prev => ({
            ...prev,
            notes: diagnosis.techNote,
            tests: (prev.tests ? prev.tests + '\n' : '') + `AI Analizi: ${diagnosis.steps.join(', ')}`
        }));
        setAiDiagnosis(null);
        showToast('AI önerileri forma uygulandı.', 'success');
    };

    const inputBase = 'w-full bg-white border border-gray-300 rounded-xl text-sm text-[#1d1d1f] placeholder:text-gray-400 outline-none transition-all focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15';
    const ghostButton = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-[13px] font-semibold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25';

    return (
        <div className={embedded ? '' : 'p-6 sm:p-8 bg-[#f5f5f7]'}>
            {/* Adım göstergesi */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <ol className="flex items-center gap-2" aria-label="Teşhis adımları">
                    {[{ n: 1, label: 'Teknik Teşhis' }, { n: 2, label: 'Kaydı Tamamla' }].map(({ n, label }) => {
                        const isCurrent = step === n;
                        const isDone = step > n;
                        return (
                            <li key={n} className="flex items-center gap-2">
                                <span
                                    aria-current={isCurrent ? 'step' : undefined}
                                    className={`inline-flex items-center gap-2 h-8 pl-2 pr-3.5 rounded-full text-[11px] font-bold uppercase tracking-wide border transition-colors ${isCurrent
                                        ? 'bg-[#0071e3] text-white border-[#0071e3]'
                                        : isDone
                                            ? 'bg-white text-[#0071e3] border-[#0071e3]/30'
                                            : 'bg-white text-gray-500 border-gray-200'}`}
                                >
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isCurrent ? 'bg-white/20' : 'bg-[#f5f5f7]'}`}>
                                        {isDone ? <Check size={11} strokeWidth={3} aria-hidden="true" /> : n}
                                    </span>
                                    {label}
                                    {isDone && <span className="sr-only">tamamlandı</span>}
                                </span>
                                {n === 1 && <ChevronRight size={14} className="text-gray-300" aria-hidden="true" />}
                            </li>
                        );
                    })}
                </ol>
                <p className="text-[11px] font-medium text-gray-500">
                    <span className="font-semibold text-[#1d1d1f]">{repair.device}</span> · #{repair.id}
                </p>
            </div>

            {/* Hata özeti */}
            {errorList.length > 0 && (
                <div
                    ref={errorSummaryRef}
                    tabIndex={-1}
                    role="alert"
                    className="mb-5 rounded-2xl border border-[#c30000]/25 bg-[#fff5f5] px-5 py-4 outline-none focus-visible:ring-4 focus-visible:ring-[#c30000]/20"
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

            {step === 1 ? (
                <div className="space-y-5">
                    {/* 1 · Onarım türü */}
                    <FieldGroup index="1" title="Onarım Türü" hint="Kaydın hangi iş akışına gireceğini belirler." icon={Activity} required>
                        <div
                            role="radiogroup"
                            aria-label="Onarım türü"
                            aria-describedby={errors.repairType ? fieldId('repairType-error') : undefined}
                            className="grid grid-cols-1 md:grid-cols-2 gap-3"
                        >
                            {REPAIR_TYPES.map(type => {
                                const selected = formData.repairType === type.id;
                                return (
                                    <label
                                        key={type.id}
                                        className={`relative flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#0071e3]/25 ${selected
                                            ? 'border-[#0071e3] bg-[#0071e3]/5 shadow-[0_1px_3px_rgba(0,113,227,0.15)]'
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'}`}
                                    >
                                        <input
                                            type="radio"
                                            name={fieldId('repairType')}
                                            value={type.id}
                                            checked={selected}
                                            onChange={() => {
                                                setFormData(prev => ({ ...prev, repairType: type.id }));
                                                setErrors(prev => ({ ...prev, repairType: undefined }));
                                            }}
                                            className="sr-only"
                                        />
                                        <span
                                            aria-hidden="true"
                                            className={`mt-0.5 w-[18px] h-[18px] shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-all ${selected ? 'border-[#0071e3] bg-[#0071e3]' : 'border-gray-300 bg-white'}`}
                                        >
                                            {selected && <Check size={11} strokeWidth={3.5} className="text-white" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className={`block text-[13px] font-semibold ${selected ? 'text-[#0071e3]' : 'text-[#1d1d1f]'}`}>
                                                {type.label}
                                            </span>
                                            <span className="block text-[11px] text-gray-500 mt-0.5 leading-snug">{type.hint}</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        {errors.repairType && <FieldError id={fieldId('repairType-error')}>{errors.repairType}</FieldError>}

                        {/* Teklif tutarı — yalnızca müşteri onayı akışında */}
                        {formData.repairType === 'approval' && (
                            <div className="mt-4 rounded-xl border border-[#b25e00]/20 bg-[#fff8f0] p-4">
                                <label htmlFor={fieldId('quote')} className="block text-[12px] font-semibold text-[#8a4a00]">
                                    Müşteriye sunulacak teklif tutarı (TL) <span className="text-[#c30000]" aria-hidden="true">*</span>
                                </label>
                                <div className="relative mt-2">
                                    <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-[#b25e00]">₺</span>
                                    <input
                                        id={fieldId('quote')}
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        className={`${inputBase} h-12 pl-9 pr-4 text-[15px] font-semibold`}
                                        placeholder="0,00"
                                        value={quoteAmount}
                                        onChange={e => {
                                            setQuoteAmount(e.target.value);
                                            setErrors(prev => ({ ...prev, quoteAmount: undefined }));
                                        }}
                                        aria-required="true"
                                        aria-invalid={errors.quoteAmount ? 'true' : undefined}
                                        aria-describedby={`${fieldId('quote-hint')}${errors.quoteAmount ? ` ${fieldId('quote-error')}` : ''}`}
                                    />
                                </div>
                                {errors.quoteAmount
                                    ? <FieldError id={fieldId('quote-error')}>{errors.quoteAmount}</FieldError>
                                    : null}
                                <p id={fieldId('quote-hint')} className="text-[11px] text-[#8a4a00]/80 mt-2">
                                    Tutar onaylandığında onarım süreci otomatik başlatılır.
                                </p>
                            </div>
                        )}
                    </FieldGroup>

                    {/* 2 · Tanı testleri */}
                    <FieldGroup
                        index="2"
                        title="Tanı Testleri ve Gözlemler"
                        hint="Opsiyonel. Yapılan testleri ve bulguları kaydedin."
                        icon={ClipboardList}
                        action={
                            <button
                                type="button"
                                onClick={handleAIDiagnose}
                                disabled={aiLoading}
                                aria-busy={aiLoading}
                                className={`${ghostButton} h-9 px-4 text-[12px] shrink-0 border ${aiLoading
                                    ? 'bg-[#f5f5f7] text-gray-500 border-gray-200 cursor-wait'
                                    : 'bg-white text-[#0071e3] border-[#0071e3]/30 hover:bg-[#0071e3]/5'}`}
                            >
                                {aiLoading ? (
                                    <>
                                        <span aria-hidden="true" className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#0071e3] rounded-full animate-spin" />
                                        Analiz ediliyor…
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={14} aria-hidden="true" />
                                        AI ile çözüm üret
                                    </>
                                )}
                            </button>
                        }
                    >
                        {aiDiagnosis && (
                            <div className="mb-4">
                                <AISuggestionCard
                                    diagnosis={aiDiagnosis}
                                    onApply={applyAISuggestion}
                                    onClose={() => setAiDiagnosis(null)}
                                />
                            </div>
                        )}
                        <label htmlFor={fieldId('tests')} className="sr-only">Tanı testleri ve gözlemler</label>
                        <textarea
                            id={fieldId('tests')}
                            className={`${inputBase} p-4 min-h-[96px] leading-relaxed resize-y`}
                            placeholder="Yapılan testler, gözlemler ve tanı sonuçları…"
                            value={formData.tests}
                            onChange={e => setFormData(prev => ({ ...prev, tests: e.target.value }))}
                        />
                    </FieldGroup>

                    {/* 3 · Parçalar */}
                    <FieldGroup
                        index="3"
                        title="Kullanılan Parçalar"
                        hint={`Envanterden seçin ya da depodan sipariş açın. En fazla ${MAX_PARTS} parça.`}
                        icon={Zap}
                        action={
                            <span className="shrink-0 text-[11px] font-bold text-gray-500 bg-[#f5f5f7] border border-gray-200 rounded-full px-2.5 py-1" aria-live="polite">
                                {formData.parts.length}/{MAX_PARTS}
                            </span>
                        }
                    >
                        <div ref={comboRef} className="relative">
                            <label htmlFor={fieldId('partSearch')} className="block text-[12px] font-semibold text-[#1d1d1f] mb-2">
                                Envanterde parça ara
                            </label>
                            <div className="relative">
                                <Search size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    id={fieldId('partSearch')}
                                    type="text"
                                    role="combobox"
                                    aria-expanded={dropdownOpen}
                                    aria-controls={fieldId('partListbox')}
                                    aria-autocomplete="list"
                                    aria-activedescendant={activeOption >= 0 ? fieldId(`part-opt-${activeOption}`) : undefined}
                                    aria-describedby={fieldId('partSearch-hint')}
                                    autoComplete="off"
                                    className={`${inputBase} h-12 pl-11 pr-4 font-medium`}
                                    placeholder="Parça adı veya P/N…"
                                    value={partSearch}
                                    onChange={(e) => {
                                        setPartSearch(e.target.value);
                                        setShowPartDropdown(true);
                                        setActiveOption(-1);
                                    }}
                                    onFocus={() => setShowPartDropdown(true)}
                                    onKeyDown={handleComboKeyDown}
                                />
                            </div>
                            <p id={fieldId('partSearch-hint')} className="mt-1.5 text-[11px] text-gray-500">
                                Yukarı/aşağı okla gezinin, Enter ile ekleyin. Stokta yoksa sipariş oluşturabilirsiniz.
                            </p>

                            {dropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white border border-gray-200 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden">
                                    <ul
                                        id={fieldId('partListbox')}
                                        role="listbox"
                                        aria-label="Envanter sonuçları"
                                        className="max-h-60 overflow-y-auto custom-scrollbar"
                                    >
                                        {filteredInventory.length > 0 ? filteredInventory.map((item, idx) => (
                                            <li
                                                key={item.id}
                                                id={fieldId(`part-opt-${idx}`)}
                                                role="option"
                                                aria-selected={activeOption === idx}
                                                onMouseEnter={() => setActiveOption(idx)}
                                                onClick={() => addPartFromInventory(item)}
                                                className={`px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer flex justify-between items-center gap-3 ${activeOption === idx ? 'bg-[#0071e3]/5' : ''}`}
                                            >
                                                <span className="min-w-0">
                                                    <span className="block text-[13px] font-semibold text-[#1d1d1f] truncate">{item.name}</span>
                                                    <span className="block text-[11px] font-mono text-gray-500">{item.partNumber || '—'}</span>
                                                </span>
                                                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${item.quantity > 0
                                                    ? 'bg-[#e6f4ea] text-[#1e7e34] border-[#1e7e34]/15'
                                                    : 'bg-[#fff5f5] text-[#c30000] border-[#c30000]/15'}`}>
                                                    Stok: {item.quantity}
                                                </span>
                                            </li>
                                        )) : (
                                            <li className="px-4 py-4 text-center text-[12px] font-medium text-gray-500">
                                                Aradığınız parça envanterde bulunamadı
                                            </li>
                                        )}
                                    </ul>
                                    <div className="p-2 border-t border-gray-100 bg-[#f5f5f7]">
                                        <button
                                            type="button"
                                            onClick={addPartOrdered}
                                            className={`${ghostButton} w-full bg-[#1d1d1f] text-white hover:bg-black`}
                                        >
                                            <Plus size={15} aria-hidden="true" />
                                            <span className="truncate">“{partSearch}” için depodan sipariş aç</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {formData.parts.length === 0 ? (
                            <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-[#f5f5f7]/60 px-5 py-6 text-center">
                                <Package size={22} className="mx-auto text-gray-400 mb-2" aria-hidden="true" />
                                <p className="text-[12px] font-medium text-gray-500">Henüz parça eklenmedi. Parça kullanılmadıysa bu bölümü boş bırakabilirsiniz.</p>
                            </div>
                        ) : (
                            <ul className="mt-4 space-y-3">
                                {formData.parts.map((part, index) => (
                                    <li key={part.inventoryId + index}>
                                        <fieldset className="rounded-xl border border-gray-200 bg-white p-4">
                                            <legend className="sr-only">{index + 1}. parça</legend>

                                            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                                                <div className="flex-1 min-w-0">
                                                    {part.isNewInventoryItem ? (
                                                        <div className="space-y-2">
                                                            <div>
                                                                <label htmlFor={fieldId(`part-${index}-desc`)} className="block text-[11px] font-semibold text-gray-600 mb-1">
                                                                    Parça tanımı
                                                                </label>
                                                                <input
                                                                    id={fieldId(`part-${index}-desc`)}
                                                                    type="text"
                                                                    className={`${inputBase} h-10 px-3 font-semibold`}
                                                                    value={part.description}
                                                                    onChange={(e) => updatePart(index, 'description', e.target.value)}
                                                                    placeholder="Örn: iPhone 13 Ekran"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label htmlFor={fieldId(`part-${index}-pn`)} className="block text-[11px] font-semibold text-gray-600 mb-1">
                                                                    Parça no (P/N) <span className="font-medium text-gray-400">— opsiyonel</span>
                                                                </label>
                                                                <input
                                                                    id={fieldId(`part-${index}-pn`)}
                                                                    type="text"
                                                                    className={`${inputBase} h-9 px-3 font-mono text-[12px] uppercase`}
                                                                    value={part.partNumber}
                                                                    onChange={(e) => updatePart(index, 'partNumber', e.target.value)}
                                                                    placeholder="P/N"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <h4 className="text-[13px] font-semibold text-[#1d1d1f]">{part.description}</h4>
                                                            <span className="inline-block mt-1 text-[10px] font-mono font-bold tracking-wide uppercase text-gray-600 bg-[#f5f5f7] border border-gray-200 px-2 py-0.5 rounded">
                                                                {part.partNumber || '—'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-gray-200 bg-white px-3 h-9 hover:bg-gray-50 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#0071e3]/25">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only"
                                                            checked={part.needsOrder}
                                                            onChange={(e) => updatePart(index, 'needsOrder', e.target.checked)}
                                                        />
                                                        <span aria-hidden="true" className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${part.needsOrder ? 'bg-[#0071e3] border-[#0071e3] text-white' : 'bg-white border-gray-300'}`}>
                                                            {part.needsOrder && <Check size={10} strokeWidth={4} />}
                                                        </span>
                                                        <span className={`text-[11px] font-semibold ${part.needsOrder ? 'text-[#0071e3]' : 'text-gray-600'}`}>
                                                            Depodan sipariş
                                                        </span>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => removePart(index)}
                                                        className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#c30000] hover:border-[#c30000]/30 hover:bg-[#fff5f5] flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#c30000]/20"
                                                    >
                                                        <Trash2 size={15} aria-hidden="true" />
                                                        <span className="sr-only">{index + 1}. parçayı kaldır</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                                {/* KGB — takılan yeni parça */}
                                                <div>
                                                    <label htmlFor={fieldId(`part-${index}-kgb`)} className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#1e7e34] mb-1.5">
                                                        <span>Yeni parça (KGB) seri no</span>
                                                        <span className="font-medium text-gray-500">{part.needsOrder ? 'Sipariş bekleniyor' : 'Stoktan seç'}</span>
                                                    </label>
                                                    {part.needsOrder ? (
                                                        <p
                                                            id={fieldId(`part-${index}-kgb`)}
                                                            className="h-11 px-4 flex items-center rounded-xl border border-dashed border-gray-300 bg-[#f5f5f7] text-[12px] font-medium text-gray-500"
                                                        >
                                                            Sipariş sonrası girilecek
                                                        </p>
                                                    ) : (
                                                        <select
                                                            id={fieldId(`part-${index}-kgb`)}
                                                            className={`${inputBase} h-11 px-3 font-mono font-semibold`}
                                                            value={part.kgbSerial}
                                                            onChange={(e) => updatePart(index, 'kgbSerial', e.target.value)}
                                                            aria-required="true"
                                                            aria-invalid={!part.kgbSerial && errors.parts ? 'true' : undefined}
                                                        >
                                                            <option value="">— Stoktan KGB seçin —</option>
                                                            {(part.availableSerials || []).length > 0
                                                                ? part.availableSerials.map((serial, sIdx) => (
                                                                    <option key={sIdx} value={serial}>{serial}</option>
                                                                ))
                                                                : <option value="" disabled>Bu parçanın stokta serisi yok</option>}
                                                        </select>
                                                    )}
                                                </div>

                                                {/* KBB — cihazdan çıkan arızalı parça */}
                                                <div>
                                                    <label htmlFor={fieldId(`part-${index}-kbb`)} className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#b25e00] mb-1.5">
                                                        <span>Arızalı parça (KBB) seri no</span>
                                                        <span className="font-medium text-gray-500">Cihazdan oku</span>
                                                    </label>
                                                    <input
                                                        id={fieldId(`part-${index}-kbb`)}
                                                        type="text"
                                                        className={`${inputBase} h-11 px-3 font-mono font-semibold uppercase`}
                                                        placeholder="Cihazdan çıkan seri no"
                                                        value={part.kbbSerial}
                                                        onChange={(e) => updatePart(index, 'kbbSerial', e.target.value)}
                                                        aria-required="true"
                                                        aria-invalid={!part.kbbSerial && errors.parts ? 'true' : undefined}
                                                    />
                                                </div>
                                            </div>
                                        </fieldset>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {errors.parts && <FieldError id={fieldId('parts-error')}>{errors.parts}</FieldError>}
                    </FieldGroup>

                    {/* 4 · Teknisyen notu */}
                    <FieldGroup index="4" title="Teknisyen Notu" hint="Servis formunda ve kayıt geçmişinde görünür." icon={Wrench} required>
                        <label htmlFor={fieldId('notes')} className="sr-only">Teknisyen notu</label>
                        <textarea
                            id={fieldId('notes')}
                            className={`${inputBase} p-4 min-h-[112px] leading-relaxed resize-y`}
                            placeholder="Tespit edilen arıza, yapılan işlem ve sonuç…"
                            value={formData.notes}
                            onChange={e => {
                                setFormData(prev => ({ ...prev, notes: e.target.value }));
                                setErrors(prev => ({ ...prev, notes: undefined }));
                            }}
                            aria-required="true"
                            aria-invalid={errors.notes ? 'true' : undefined}
                            aria-describedby={errors.notes ? fieldId('notes-error') : undefined}
                        />
                        {errors.notes && <FieldError id={fieldId('notes-error')}>{errors.notes}</FieldError>}
                    </FieldGroup>
                </div>
            ) : (
                /* 2. adım — onarım numarası */
                <FieldGroup index="2" title="Onarım Numarası" hint="GSX/Apple tarafından üretilen onarım numarasını girin." icon={Save} required>
                    <div className="max-w-md">
                        <label htmlFor={fieldId('repairId')} className="block text-[12px] font-semibold text-[#1d1d1f] mb-2">
                            Onarım numarası
                        </label>
                        <input
                            id={fieldId('repairId')}
                            ref={repairIdInputRef}
                            type="text"
                            className={`${inputBase} h-14 px-4 text-center text-xl font-mono font-bold tracking-[0.15em] uppercase`}
                            placeholder="R-123456"
                            value={repairId}
                            onChange={e => {
                                setRepairId(e.target.value);
                                setErrors(prev => ({ ...prev, repairId: undefined }));
                            }}
                            aria-required="true"
                            aria-invalid={errors.repairId ? 'true' : undefined}
                            aria-describedby={`${fieldId('repairId-hint')}${errors.repairId ? ` ${fieldId('repairId-error')}` : ''}`}
                        />
                        {errors.repairId && <FieldError id={fieldId('repairId-error')}>{errors.repairId}</FieldError>}
                        <p id={fieldId('repairId-hint')} className="mt-2 text-[11px] text-gray-500">
                            Kaydı tamamladığınızda parçalar stoktan düşülür ve kayıt
                            {' '}<span className="font-semibold text-[#1d1d1f]">
                                {REPAIR_TYPES.find(t => t.id === formData.repairType)?.label || 'seçilen akış'}
                            </span>{' '}
                            akışına taşınır.
                        </p>
                    </div>
                </FieldGroup>
            )}

            {/* Aksiyon çubuğu */}
            {/* Gömülü modda inceleme ekranının kendi alt çubuğu var; sabitlemiyoruz */}
            <div className={`mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200/80 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${embedded ? '' : 'sm:sticky sm:bottom-0 sm:z-20'}`}>
                {step === 1 ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setShowHelper(true)}
                            className={`${ghostButton} bg-white text-[#0071e3] border border-[#0071e3]/30 hover:bg-[#0071e3]/5`}
                        >
                            <Mail size={15} aria-hidden="true" /> Teklif & bildirim
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowReturnModal(true)}
                            className={`${ghostButton} bg-white text-[#c30000] border border-[#c30000]/25 hover:bg-[#fff5f5]`}
                        >
                            <RotateCcw size={15} aria-hidden="true" /> İşlemsiz iade
                        </button>
                        <div className="flex items-center gap-2 ml-auto">
                            <button type="button" onClick={onCancel} className={`${ghostButton} text-gray-600 hover:bg-[#f5f5f7]`}>
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                onClick={handleNext}
                                className={`${ghostButton} bg-[#0071e3] text-white hover:bg-[#0077ed] shadow-[0_2px_8px_rgba(0,113,227,0.25)]`}
                            >
                                Devam et <ChevronRight size={16} aria-hidden="true" />
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={() => setStep(1)} className={`${ghostButton} text-gray-600 hover:bg-[#f5f5f7]`}>
                            <ArrowLeft size={16} aria-hidden="true" /> Teşhise dön
                        </button>
                        <div className="flex items-center gap-2 ml-auto">
                            <button type="button" onClick={onCancel} className={`${ghostButton} text-gray-600 hover:bg-[#f5f5f7]`}>
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalSave}
                                className={`${ghostButton} bg-[#1e7e34] text-white hover:bg-[#19692c] shadow-[0_2px_8px_rgba(30,126,52,0.25)]`}
                            >
                                <Save size={16} aria-hidden="true" /> Kaydı tamamla
                            </button>
                        </div>
                    </>
                )}
            </div>

            {showHelper && (
                <CustomerNotificationModal
                    repair={{
                        ...repair,
                        quoteAmount: quoteAmount || repair.quoteAmount || '0.00',
                        diagnosisNotes: formData.notes
                    }}
                    onClose={() => setShowHelper(false)}
                    onActionComplete={() => {
                        onSave({
                            ...formData,
                            repairId: repairId || `R-${Math.floor(Math.random() * 100000)}`,
                            quoteAmount: quoteAmount || repair.quoteAmount,
                            originalRepair: repair,
                            targetView: 'approval-pending'
                        });
                        onCancel?.();
                    }}
                />
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
            />

            {/* İade sebebi */}
            {showReturnModal && (
                <div className="fixed inset-0 z-[130] bg-black/40 flex items-center justify-center p-4 fade-in" role="presentation">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={fieldId('return-title')}
                        className="bg-white rounded-2xl w-full max-w-lg shadow-[0_30px_60px_rgba(0,0,0,0.3)] flex flex-col max-h-[90vh] animate-scale-up"
                    >
                        <div className="flex items-start gap-4 p-6 border-b border-gray-100">
                            <div className="w-11 h-11 rounded-xl bg-[#fff5f5] text-[#c30000] flex items-center justify-center shrink-0">
                                <RotateCcw size={20} aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <h3 id={fieldId('return-title')} className="text-[17px] font-semibold text-[#1d1d1f]">İade Sebebi</h3>
                                <p className="text-[12px] text-gray-500 mt-0.5">Cihaz neden işlemsiz iade ediliyor?</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowReturnModal(false)}
                                className="ml-auto w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-[#f5f5f7] flex items-center justify-center shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                            >
                                <X size={17} aria-hidden="true" />
                                <span className="sr-only">Kapat</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-2">
                            <div role="radiogroup" aria-label="İade sebebi" className="space-y-2">
                                {[...RETURN_REASONS, 'Diğer'].map(reason => {
                                    const selected = returnReason === reason;
                                    return (
                                        <label
                                            key={reason}
                                            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#c30000]/20 ${selected
                                                ? 'border-[#c30000]/40 bg-[#fff5f5]'
                                                : 'border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            <input
                                                type="radio"
                                                name={fieldId('returnReason')}
                                                value={reason}
                                                checked={selected}
                                                onChange={(e) => {
                                                    setReturnReason(e.target.value);
                                                    if (e.target.value === 'Diğer') setCustomReturnReason('');
                                                }}
                                                className="sr-only"
                                            />
                                            <span aria-hidden="true" className={`w-[18px] h-[18px] shrink-0 rounded-full border-[1.5px] flex items-center justify-center ${selected ? 'border-[#c30000] bg-[#c30000]' : 'border-gray-300 bg-white'}`}>
                                                {selected && <Check size={11} strokeWidth={3.5} className="text-white" />}
                                            </span>
                                            <span className={`text-[13px] font-semibold ${selected ? 'text-[#c30000]' : 'text-[#1d1d1f]'}`}>{reason}</span>
                                        </label>
                                    );
                                })}
                            </div>

                            {(returnReason === 'Diğer' || returnReason === 'Arıza Tekrarlanamadı (No Trouble Found)' || returnReason.includes('DOA')) && (
                                <div className="pt-2">
                                    <label htmlFor={fieldId('returnDetail')} className="block text-[11px] font-bold uppercase tracking-wide text-gray-600 mb-2">
                                        {returnReason.includes('DOA') ? 'Resmî DOA rapor metni (zorunlu)' : 'Detaylı açıklama'}
                                    </label>
                                    <textarea
                                        id={fieldId('returnDetail')}
                                        placeholder={returnReason === 'Diğer'
                                            ? 'İade sebebini detaylıca yazın…'
                                            : returnReason.includes('DOA')
                                                ? 'Cihazdaki arızayı ve DOA gerekçesini teknik detaylarla yazın…'
                                                : 'Yapılan testleri ve gözlemleri detaylıca yazın…'}
                                        className={`${inputBase} p-4 min-h-[110px] resize-y leading-relaxed`}
                                        value={customReturnReason}
                                        onChange={(e) => setCustomReturnReason(e.target.value)}
                                        aria-required={returnReason.includes('DOA') ? 'true' : undefined}
                                        aria-describedby={fieldId('returnDetail-hint')}
                                    />
                                    <p id={fieldId('returnDetail-hint')} className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                                        {returnReason.includes('DOA')
                                            ? 'Bu rapor servis formunda “Resmî Arıza Raporu” başlığıyla basılır. En az 10 karakter girin.'
                                            : 'Bu açıklama servis formunda ve kayıt detaylarında görüntülenir.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 p-6 border-t border-gray-100">
                            <button type="button" onClick={() => setShowReturnModal(false)} className={`${ghostButton} flex-1 text-gray-600 hover:bg-[#f5f5f7]`}>
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                onClick={handleDirectReturn}
                                disabled={returnReason.includes('DOA') && customReturnReason.trim().length < 10}
                                className={`${ghostButton} flex-[1.5] text-white ${returnReason.includes('DOA') && customReturnReason.trim().length < 10
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-[#c30000] hover:bg-[#a30000] shadow-[0_2px_8px_rgba(195,0,0,0.25)]'}`}
                            >
                                <CheckCircle size={16} aria-hidden="true" /> İade kararını kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RepairDiagnosisPanel;
