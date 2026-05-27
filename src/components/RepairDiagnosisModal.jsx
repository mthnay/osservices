/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from 'react';
import { X, Save, AlertCircle, Wrench, Plus, Trash2, DollarSign, Mail, ArrowRight, ArrowLeft, ChevronRight, Activity, Zap, RotateCcw, Check, Sparkles, CheckCircle } from 'lucide-react';
import CustomerNotificationModal from './CustomerNotificationModal';
import { useAppContext } from '../context/AppContext';
import ConfirmationModal from './ConfirmationModal';
import AISuggestionCard from './AISuggestionCard';

const RepairDiagnosisModal = ({ repair, onClose, onSave }) => {
    const { inventory, usePart, showToast, updateInventoryItem, addInventoryItem, API_URL } = useAppContext(); // Get inventory and usePart action
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        repairType: '', // En üstte olacak
        tests: '', // Tanı testleri notu
        notes: '', // Teknisyen notu
        parts: [] // Parçalar (Array)
    });
    const [repairId, setRepairId] = useState('');
    const [showHelper, setShowHelper] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiDiagnosis, setAiDiagnosis] = useState(null);
    
    // Return States
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    const [customReturnReason, setCustomReturnReason] = useState('');

    const RETURN_REASONS = [
        "Arıza Tekrarlanamadı (No Trouble Found)",
        "Arıza Raporuyla (DOA) iade",
        "Müşteri Teklifi Reddetti",
        "Ekonomik Onarım Mümkün Değil (BER)",
        "Yetkisiz Müdahale Tespit Edildi",
        "Yedek Parça Temin Edilemiyor",
        "Müşteri İsteğiyle İade"
    ];

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const repairTypes = [
        { id: 'carry-in', label: 'Bizzat Teslim (Mağaza İçi)', target: 'in-store' },
        { id: 'returnbefore', label: 'Değiştirmeden Önce İade', target: 'in-store' },
        { id: 'mail-in', label: 'Bütün Birim Posta (Apple Merkezi)', target: 'apple-center' },
        { id: 'approval', label: 'Müşteri Onayı Bekleyen (Teklifli)', target: 'approval-pending' },
        { id: 'service', label: 'Onarım Olmayan Servis', target: 'ready-pickup' }
    ];

    const [quoteAmount, setQuoteAmount] = useState('');

    const [partSearch, setPartSearch] = useState('');
    const [showPartDropdown, setShowPartDropdown] = useState(false);

    const filteredInventory = inventory.filter(i => {
        const searchSafe = partSearch.toLowerCase();
        return i.category !== 'loaner' && 
            ((i.name || '').toLowerCase().includes(searchSafe) || 
            (i.partNumber || '').toLowerCase().includes(searchSafe) ||
            (i.id || '').toLowerCase().includes(searchSafe) ||
            (i.sku || '').toLowerCase().includes(searchSafe));
    });

    const addPartOrdered = () => {
        if (!partSearch.trim()) return;

        const existing = inventory.find(i => 
            (i.name || '').toLowerCase() === partSearch.toLowerCase() || 
            (i.partNumber || '').toLowerCase() === partSearch.toLowerCase()
        );

        if (existing) {
            addPartFromInventory(existing);
            return;
        }

        if (formData.parts.length >= 5) {
            showToast('En fazla 5 parça ekleyebilirsiniz.', 'warning');
            return;
        }

        setFormData({
            ...formData,
            parts: [...formData.parts, { 
                inventoryId: `NEW-${Date.now()}`,
                partNumber: '', 
                description: '', 
                kbbSerial: '', 
                kgbSerial: '', 
                needsOrder: true,
                isNewInventoryItem: true,
                availableSerials: [] 
            }]
        });
        
        setPartSearch('');
        setShowPartDropdown(false);
    };

    const addPartFromInventory = (item) => {
        if (formData.parts.length >= 5) {
            showToast('En fazla 5 parça ekleyebilirsiniz.', 'warning');
            return;
        }
        
        setFormData({
            ...formData,
            parts: [...formData.parts, { 
                inventoryId: item.id,
                partNumber: item.partNumber, 
                description: item.name, 
                kbbSerial: '', 
                kgbSerial: '', 
                needsOrder: item.quantity <= 0, // Eğer stok yoksa sipariş gerekir
                availableSerials: item.kgbSerials || [] 
            }]
        });
        
        setPartSearch('');
        setShowPartDropdown(false);
    };

    const removePart = (index) => {
        const newParts = formData.parts.filter((_, i) => i !== index);
        setFormData({ ...formData, parts: newParts });
    };

    const updatePart = (index, field, value) => {
        const newParts = [...formData.parts];
        newParts[index][field] = value;
        setFormData({ ...formData, parts: newParts });
    };

    const handleNext = () => {
        if (!formData.repairType || !formData.notes) {
            showToast('Lütfen onarım türünü seçiniz ve teknisyen notunu giriniz.', 'warning');
            return;
        }
        if (formData.repairType === 'approval' && !quoteAmount) {
            showToast('Lütfen teklif tutarını giriniz.', 'warning');
            return;
        }

        // Parça validasyonu - Eğer sipariş edilecekse KGB seri no (yeni parça) zorunlu değil
        const incompletePart = formData.parts.find(p => (!p.needsOrder && !p.kgbSerial) || !p.kbbSerial);
        if (incompletePart) {
            showToast('Lütfen eklenen parçalar için gerekli seri numaralarını giriniz.', 'warning');
            return;
        }

        setStep(2);
    };

    const handleFinalSave = async () => {
        if (!repairId) {
            showToast('Lütfen Onarım Numarasını giriniz.', 'warning');
            return;
        }

        // Consume or Add parts
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
                continue; // Yeni eklenen parça için stok düşme işlemi yapılmaz (zaten 0)
            }

            const inventoryItem = inventory.find(i => i.id === part.inventoryId);
            if (inventoryItem) {
                const success = await usePart(inventoryItem.id, 1); // Varsayılan sistem, seriyi silme kısmını da aşağıda kendimiz halledebiliriz ama usePart quantity düşürür
                
                // Seriyi de inventory'den düşelim
                if (success && part.kgbSerial) {
                    const updatedKgbSerials = (inventoryItem.kgbSerials || []).filter(s => s !== part.kgbSerial);
                    if (updateInventoryItem) {
                        updateInventoryItem(inventoryItem._id || inventoryItem.id, { kgbSerials: updatedKgbSerials });
                    }
                }
                
                if (!success) {
                    // Trigger custom confirmation modal instead of window.confirm
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
            showToast("Lütfen bir iade nedeni seçiniz.", "warning");
            return;
        }

        const finalReason = returnReason === 'Diğer' ? customReturnReason : returnReason;

        // Stok geri iade mantığı (Eğer teşhis esnasında parça eklendiyse)
        if (formData.parts.length > 0) {
            formData.parts.forEach(part => {
                const invItem = inventory.find(i => i.id === part.inventoryId);
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
        }

        onSave({
            ...formData,
            repairId: repairId || `R-${Math.floor(Math.random() * 100000)}`,
            originalRepair: repair,
            targetView: 'ready-pickup',
            repairType: 'direct-return',
            notes: returnReason.includes('DOA') 
                ? `DOA RAPORU: ${customReturnReason || 'Detay girilmedi.'}`
                : finalReason + (customReturnReason ? ` - Not: ${customReturnReason}` : ''),
            parts: [] // Parçalar iade edildiği için boşaltıyoruz
        });
        onClose();
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
        setFormData({
            ...formData,
            notes: diagnosis.techNote,
            tests: (formData.tests ? formData.tests + '\n' : '') + `AI Analizi: ${diagnosis.steps.join(', ')}`
        });
        setAiDiagnosis(null);
        showToast('AI önerileri forma uygulandı.', 'success');
    };

    const finalizeSave = () => {
        let targetView = 'in-store';
        const selectedType = repairTypes.find(t => t.id === formData.repairType);
        if (selectedType) {
            targetView = selectedType.target;
        }

        onSave({
            ...formData,
            repairId,
            quoteAmount,
            originalRepair: repair,
            targetView
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content w-full max-w-3xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0 backdrop-blur-lg">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3 tracking-tight">
                            <div className="w-10 h-10 bg-apple-blue rounded-md flex items-center justify-center shadow-lg shadow-blue-200">
                                <Wrench size={20} className="text-white" />
                            </div>
                            Teknik İnceleme & Tanı
                        </h3>
                        <p className="text-xs font-medium text-gray-400 mt-1 pl-14">
                            {repair.device} - {repair.customer}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white rounded-full hover:bg-gray-100 border border-gray-200 transition-all shadow-sm">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    {step === 1 ? (
                        <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
                            {/* 1. Onarım Türü Seçimi (En Üstte) */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 text-xs uppercase tracking-wide mb-3">
                                    <Activity size={12} className="text-apple-blue" />
                                    Onarım Türü Seçin <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {repairTypes.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setFormData({ ...formData, repairType: type.id })}
                                            className={`p-4 rounded-md border text-left transition-all duration-200 group relative overflow-hidden ${formData.repairType === type.id
                                                ? 'border-apple-blue bg-blue-50/50 text-apple-blue shadow-md shadow-blue-100 ring-1 ring-blue-100s'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 text-gray-600'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between z-10 relative">
                                                <span className="text-sm font-bold block">{type.label}</span>
                                                {formData.repairType === type.id && <div className="w-2 h-2 rounded-full bg-apple-blue shadow-[0_0_10px_rgba(0,113,227,0.5)]"></div>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Teklif Tutarı (Sadece Müşteri Onayı Bekleyen seçilirse) */}
                            {formData.repairType === 'approval' && (
                                <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-6 rounded-md border border-orange-200/60 animate-in zoom-in-95 duration-300 shadow-sm">
                                    <label className="block text-sm font-bold text-orange-900 mb-2">Müşteriye Sunulacak Teklif Tutarı (TL) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" size={20} strokeWidth={2.5} />
                                        <input
                                            type="number"
                                            className="w-full pl-12 p-3.5 bg-white border border-orange-200 rounded-md text-xl font-semibold text-orange-900 focus:ring-4 focus:ring-orange-100 focus:border-orange-300 outline-none transition-all shadow-inner"
                                            placeholder="0.00"
                                            value={quoteAmount}
                                            onChange={e => setQuoteAmount(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-[10px] text-orange-600 mt-2 font-bold opacity-80 pl-1">Bu tutar onaylandığında onarım süreci başlatılacaktır.</p>
                                </div>
                            )}

                            {/* 2. Tanı Testleri (Opsiyonel) */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-xs font-semibold text-gray-400 text-xs uppercase tracking-wide">Tanı Testleri ve Gözlemler <span className="font-medium opacity-50">(Opsiyonel)</span></label>
                                    <button 
                                        onClick={handleAIDiagnose}
                                        disabled={aiLoading}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${aiLoading ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-100 hover:scale-105 active:scale-95'}`}
                                    >
                                        {aiLoading ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                                                Analiz Ediliyor...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={12} />
                                                AI Asistanı ile Çözüm Üret
                                            </>
                                        )}
                                    </button>
                                </div>
                                
                                {aiDiagnosis && (
                                    <AISuggestionCard 
                                        diagnosis={aiDiagnosis} 
                                        onApply={applyAISuggestion} 
                                        onClose={() => setAiDiagnosis(null)} 
                                    />
                                )}

                                <textarea
                                    className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-md focus:ring-4 focus:ring-gray-100 focus:border-gray-300 outline-none min-h-[100px] text-sm font-medium transition-all resize-none"
                                    placeholder="Yapılan testler, gözlemler ve tanı sonuçları..."
                                    value={formData.tests}
                                    onChange={e => setFormData({ ...formData, tests: e.target.value })}
                                />
                            </div>

                            {/* 3. Parçalar Bölümü */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 text-xs uppercase tracking-wide">
                                        <Zap size={12} className="text-amber-500" />
                                        Envanterden Parça Seç ({formData.parts.length}/5)
                                    </label>
                                </div>
                                
                                <div className="relative z-20">
                                    <input 
                                        type="text" 
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-md text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                                        placeholder="Eklemek istediğiniz parçayı envanterde arayın (P/N veya İsim)..."
                                        value={partSearch}
                                        onChange={(e) => {
                                            setPartSearch(e.target.value);
                                            setShowPartDropdown(true);
                                        }}
                                        onFocus={() => setShowPartDropdown(true)}
                                    />
                                    {showPartDropdown && partSearch.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                                            {filteredInventory.length > 0 ? (
                                                filteredInventory.map(item => (
                                                    <div 
                                                        key={item.id} 
                                                        onClick={() => addPartFromInventory(item)}
                                                        className="p-4 hover:bg-blue-50 border-b border-gray-50 cursor-pointer flex justify-between items-center transition-colors group"
                                                    >
                                                        <div>
                                                            <h5 className="font-bold text-gray-900 group-hover:text-blue-700">{item.name}</h5>
                                                            <p className="text-[10px] font-mono text-gray-500">{item.partNumber}</p>
                                                        </div>
                                                        <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-lg ${item.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            Stok: {item.quantity}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-2">
                                                    <div className="p-3 text-center text-gray-400 text-xs font-bold border-b border-gray-50 mb-1">
                                                        Aradığınız parça bulunamadı
                                                    </div>
                                                </div>
                                            )}
                                            <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                                                <button
                                                    onClick={addPartOrdered}
                                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold text-xs uppercase tracking-wide transition-all shadow-md active:scale-95"
                                                >
                                                    <Plus size={14} /> "{partSearch}" Stokta Yok, Depodan Sipariş Et
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {formData.parts.length > 0 && (
                                    <div className="space-y-3 mt-4">
                                        {formData.parts.map((part, index) => (
                                            <div key={index} className="bg-white p-5 rounded-md border border-gray-200 relative group animate-in slide-in-from-bottom-4 shadow-sm hover:shadow-md transition-shadow">
                                                <button
                                                    onClick={() => removePart(index)}
                                                    className="absolute top-[-10px] right-[-10px] w-8 h-8 flex items-center justify-center bg-white text-red-500 rounded-full shadow-lg border border-red-100 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:scale-110 z-10"
                                                    title="Parçayı Sil"
                                                >
                                                    <Trash2 size={14} />
                                                </button>

                                                <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-3">
                                                    <div className="flex-1 mr-4">
                                                        {part.isNewInventoryItem ? (
                                                            <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-tighter mb-1">Parça Tanımı</span>
                                                                    <input 
                                                                        type="text"
                                                                        className="w-full h-9 px-3 bg-indigo-50/50 border border-indigo-100 rounded-md text-sm font-bold text-indigo-900 outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-inner"
                                                                        value={part.description}
                                                                        onChange={(e) => updatePart(index, 'description', e.target.value)}
                                                                        placeholder="Parça Tanımı (Örn: iPhone 13 Ekran)"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-tighter mb-1">Parça No (P/N)</span>
                                                                    <input 
                                                                        type="text"
                                                                        className="w-full h-8 px-3 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-mono font-bold text-gray-600 outline-none uppercase focus:border-blue-400 transition-all"
                                                                        value={part.partNumber}
                                                                        onChange={(e) => updatePart(index, 'partNumber', e.target.value)}
                                                                        placeholder="P/N (Opsiyonel)"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <h4 className="font-semibold text-gray-900">{part.description}</h4>
                                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase font-mono font-bold tracking-widest">{part.partNumber}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-200 transition-colors">
                                                        <input 
                                                            type="checkbox" 
                                                            className="hidden" 
                                                            checked={part.needsOrder}
                                                            onChange={(e) => updatePart(index, 'needsOrder', e.target.checked)}
                                                        />
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${part.needsOrder ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                                                            {part.needsOrder && <Check size={10} strokeWidth={4} />}
                                                        </div>
                                                        <span className={`text-[10px] font-semibold uppercase tracking-tight ${part.needsOrder ? 'text-indigo-700' : 'text-slate-500'}`}>Depodan Sipariş Et</span>
                                                    </label>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* KGB - Yeni Parça (Stoktan Seçilecek) */}
                                                    <div className="flex flex-col">
                                                        <div className="text-[10px] uppercase font-semibold tracking-widest text-emerald-600 mb-2 flex items-center justify-between h-[15px]">
                                                            <span>YENİ PARÇA (KGB) SERİ NO</span>
                                                            <span className="opacity-50">{part.needsOrder ? 'Sipariş Bekleniyor' : 'Stoktan Seç'}</span>
                                                        </div>
                                                        {part.needsOrder ? (
                                                            <div className="w-full h-[46px] px-4 flex items-center bg-gray-50 border border-dashed border-gray-300 rounded-md text-xs font-bold text-gray-400 italic">
                                                                Sipariş sonrası girilecek...
                                                            </div>
                                                        ) : (
                                                            <select
                                                                className="w-full h-[46px] px-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-400 outline-none transition-all cursor-pointer appearance-none"
                                                                value={part.kgbSerial}
                                                                onChange={(e) => updatePart(index, 'kgbSerial', e.target.value)}
                                                            >
                                                                <option value="" disabled>-- Stoktan KGB Seçiniz --</option>
                                                                {part.availableSerials && part.availableSerials.length > 0 ? (
                                                                    part.availableSerials.map((serial, sIdx) => (
                                                                        <option key={sIdx} value={serial}>{serial}</option>
                                                                    ))
                                                                ) : (
                                                                    <option value="" disabled>Bu parçanın stokta serisi yok!</option>
                                                                )}
                                                            </select>
                                                        )}
                                                    </div>

                                                    {/* KBB - Arızalı Parça (Elle Girilecek) */}
                                                    <div className="flex flex-col">
                                                        <div className="text-[10px] uppercase font-semibold tracking-widest text-orange-600 mb-2 flex items-center justify-between h-[15px]">
                                                            <span>ESKİ/ARIZALI PARÇA (KBB) SERİ NO</span>
                                                            <span className="opacity-50">Üzerinden Oku</span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            className="w-full h-[46px] px-3 bg-orange-50 border border-orange-200 text-orange-900 rounded-md text-sm font-bold font-mono focus:ring-2 focus:ring-orange-400 outline-none uppercase transition-all"
                                                            placeholder="Müşteri Cihazından Çıkan Seri No"
                                                            value={part.kbbSerial}
                                                            onChange={(e) => updatePart(index, 'kbbSerial', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 4. Teknisyen Notu (Zorunlu) */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 text-xs uppercase tracking-wide mb-3">Teknisyen Notu <span className="text-red-500">*</span></label>
                                <textarea
                                    className="w-full p-4 bg-white border border-gray-200 rounded-md focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none min-h-[120px] text-sm font-medium shadow-sm transition-all resize-none"
                                    placeholder="Detaylı teknisyen notunu giriniz..."
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 text-center space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-200 border-4 border-white">
                                <Save size={40} className="text-white" strokeWidth={2.5} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">Onarımı Kaydet</h3>
                                <p className="text-gray-500 font-medium max-w-sm mx-auto">
                                    İşlemi tamamlamak için lütfen oluşturulan <strong>Onarım Numarasını</strong> girin.
                                </p>
                            </div>

                            <div className="max-w-xs mx-auto pt-4 relative group">
                                <input
                                    type="text"
                                    className="w-full p-5 text-center text-2xl font-mono tracking-[0.2em] bg-white border-2 border-gray-200 rounded-md focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none uppercase font-bold text-gray-800 transition-all shadow-sm group-hover:shadow-md"
                                    placeholder="R-123***"
                                    value={repairId}
                                    onChange={e => setRepairId(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-white/80 backdrop-blur-md px-8 py-5 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0 z-10">
                    {step === 1 ? (
                        <>
                            <button
                                onClick={() => setShowHelper(true)}
                                className="mr-auto flex items-center gap-2 px-5 py-3 text-apple-blue hover:bg-blue-50 border-2 border-blue-100 hover:border-blue-200 rounded-md text-xs font-bold transition-all shadow-sm"
                            >
                                <Mail size={16} /> <span className="hidden sm:inline">Teklif & Bildirim (Helper)</span>
                            </button>
                            <button
                                onClick={() => setShowReturnModal(true)}
                                className="mr-2 flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-md text-xs font-bold transition-all"
                            >
                                <RotateCcw size={16} /> <span className="hidden sm:inline">İşlemsiz İade</span>
                            </button>
                            <button onClick={onClose} className="px-6 py-3 text-gray-500 hover:bg-gray-100 rounded-md text-sm font-bold transition-colors">
                                İptal
                            </button>
                            <button
                                onClick={handleNext}
                                className="pl-8 pr-6 py-3 bg-gray-900 hover:bg-black text-white rounded-md text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                Devam Et <ChevronRight size={18} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setStep(1)} className="px-6 py-3 text-gray-500 hover:bg-gray-100 rounded-md text-sm font-bold transition-all flex items-center gap-2 group">
                                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Geri
                            </button>
                            <button
                                onClick={handleFinalSave}
                                className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-bold shadow-lg shadow-green-200 hover:shadow-green-300 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Save size={18} />
                                Kaydı Tamamla
                            </button>
                        </>
                    )}
                </div>
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
                        onClose();
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

            {/* Return Reason Modal Over Main Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-8 animate-in fade-in">
                    <div className="bg-white p-8 rounded-[36px] w-full max-w-lg shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 bg-red-50 rounded-md flex items-center justify-center text-red-500">
                                <RotateCcw size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">İade Sebebi</h3>
                                <p className="text-gray-500 text-sm font-medium">Cihazı neden işlemsiz iade ediyorsunuz?</p>
                            </div>
                        </div>

                        <div className="space-y-2 mb-8 mt-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {RETURN_REASONS.map(reason => (
                                <label key={reason} className={`flex items-center gap-3 p-4 rounded-md border cursor-pointer transition-all ${returnReason === reason ? 'bg-red-50 border-red-200 text-red-700' : 'border-gray-100 hover:bg-gray-50 text-gray-600'}`}>
                                    <input
                                        type="radio"
                                        name="returnReason"
                                        value={reason}
                                        checked={returnReason === reason}
                                        onChange={(e) => setReturnReason(e.target.value)}
                                        className="w-5 h-5 accent-red-600"
                                    />
                                    <span className="text-sm font-bold">{reason}</span>
                                </label>
                            ))}
                            <label className={`flex items-center gap-3 p-4 rounded-md border cursor-pointer transition-all ${returnReason === 'Diğer' ? 'bg-red-50 border-red-200 text-red-700' : 'border-gray-100 hover:bg-gray-50 text-gray-600'}`}>
                                <input
                                    type="radio"
                                    name="returnReason"
                                    value="Diğer"
                                    checked={returnReason === 'Diğer'}
                                    onChange={(e) => {
                                        setReturnReason(e.target.value);
                                        setCustomReturnReason('');
                                    }}
                                    className="w-5 h-5 accent-red-600"
                                />
                                <span className="text-sm font-bold">Diğer</span>
                            </label>

                            {(returnReason === 'Diğer' || returnReason === 'Arıza Tekrarlanamadı (No Trouble Found)' || returnReason.includes('DOA')) && (
                                <div className="animate-in slide-in-from-top-2 p-1">
                                    <div className="flex items-center gap-2 mb-2 ml-1">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                            {returnReason.includes('DOA') ? 'RESMİ DOA RAPOR METNİ (ZORUNLU)' : 'DETAYLI AÇIKLAMA'}
                                        </span>
                                    </div>
                                    <textarea
                                        placeholder={returnReason === 'Diğer' ? "İade sebebini detaylıca yazınız..." : returnReason.includes('DOA') ? "Cihazdaki arızayı ve DOA gerekçesini teknik detaylarla buraya yazınız..." : "Yapılan testleri ve gözlemleri detaylıca yazınız..."}
                                        className={`w-full p-4 bg-gray-50 border-2 ${returnReason.includes('DOA') ? (customReturnReason.length > 10 ? 'border-green-200 focus:border-green-400' : 'border-red-200 focus:border-red-400') : 'border-blue-100 focus:border-blue-400'} rounded-2xl mt-1 outline-none focus:bg-white transition-all font-medium text-sm resize-none shadow-inner min-h-[120px]`}
                                        value={customReturnReason}
                                        onChange={(e) => setCustomReturnReason(e.target.value)}
                                    ></textarea>
                                    <p className="text-[10px] text-gray-400 mt-2 ml-1 leading-relaxed">
                                        {returnReason.includes('DOA') 
                                            ? "Bu rapor servis formunda 'Resmi Arıza Raporu' başlığıyla kırmızı çerçeve içinde basılacaktır." 
                                            : "Bu açıklama servis formunda ve kayıt detaylarında görüntülenecektir."}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowReturnModal(false)}
                                className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleDirectReturn}
                                disabled={returnReason.includes('DOA') && customReturnReason.trim().length < 10}
                                className={`flex-[1.5] py-4 text-white font-bold rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                                    returnReason.includes('DOA') && customReturnReason.trim().length < 10
                                    ? 'bg-gray-300 shadow-none cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                }`}
                            >
                                <CheckCircle size={20} />
                                İade Kararını Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RepairDiagnosisModal;
