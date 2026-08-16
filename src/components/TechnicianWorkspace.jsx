import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    X, CheckCircle, Clock, AlertTriangle, Check,
    Save, Play, Pause, RotateCcw, Box, Wrench, FileText, ChevronRight, Activity, Zap, AlertCircle, Users,
    Camera, Plus, Trash2, ArrowRight, ShieldCheck, Microscope, Info, Lock, Eye, EyeOff
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
// eslint-disable-next-line no-unused-vars
import { appPrompt, appAlert } from '../utils/alert';
import DeviceImage from './DeviceImage';

const TechnicianWorkspace = ({ repairId, onClose, setActiveTab }) => {
    const { 
        // eslint-disable-next-line no-unused-vars
        repairs, updateRepair, completeJob, currentUser, inventory, 
        // eslint-disable-next-line no-unused-vars
        updateInventoryItem, usePart, processStockMovement, showToast, 
        // eslint-disable-next-line no-unused-vars
        technicians, sendWhatsApp, uploadMedia, API_URL, verifyTechnicianPassword
    } = useAppContext();

    const [repair, setRepair] = useState(null);
    const [repairClosingNote, setRepairClosingNote] = useState('');
    const [timer, setTimer] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState('');
    // eslint-disable-next-line no-unused-vars
    const [customReturnReason, setCustomReturnReason] = useState('');
    const [uploading, setUploading] = useState(false);
    const [localSerials, setLocalSerials] = useState({});
    // Teknisyen şifre doğrulama modalı state'leri
    const [pwModal, setPwModal] = useState({ open: false, tech: null });
    const [pwInput, setPwInput] = useState('');
    const [pwShow, setPwShow] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwVerifying, setPwVerifying] = useState(false);

    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [quoteItems, setQuoteItems] = useState([{ name: '', price: '' }]);
    // eslint-disable-next-line no-unused-vars
    const [quoteNotes, setQuoteNotes] = useState('');

    const fileInputRef = useRef(null);

    const RETURN_REASONS = [
        "Arıza Tekrarlanamadı (NTF)",
        "Müşteri Teklifi Reddetti",
        "Ekonomik Onarım Mümkün Değil (BER)",
        "Yetkisiz Müdahale Tespit Edildi",
        "Yedek Parça Temin Edilemiyor",
        "Müşteri İsteğiyle İade"
    ];

    const DEFAULT_STEPS = [
        { id: 1, label: 'Kozmetik ve Fonksiyonel Ön Kontrol', checked: false },
        { id: 2, label: 'Güvenlik Vidaları ve Vida Sökümü', checked: false },
        { id: 3, label: 'Flex Kabloları ve Batarya İzolasyonu', checked: false },
        { id: 4, label: 'Arızalı Parça Sökümü ve KBB Kaydı', checked: false },
        { id: 5, label: 'Yeni Parça Montajı ve KGB Eşleşmesi', checked: false },
        { id: 6, label: 'PSA Yenileme ve Sıvı Koruma Uygulama', checked: false },
        { id: 7, label: 'Cihaz Kapama ve Tork Ayarlı Vidalama', checked: false },
        { id: 8, label: 'Kalite Kontrol (QC) Testleri Tamamlandı', checked: false },
    ];

    const [steps, setSteps] = useState([]);

    const lastLoadedRepairId = useRef(null);

    useEffect(() => {
        const found = repairs.find(r => r.id === repairId || r._id === repairId);
        if (found) {
            setRepair(found);
            
            // Onarım değiştiğinde veya ilk yüklemede checklist ve seri numaralarını yükle (yarışı önlemek için)
            const currentId = found.id || found._id;
            if (lastLoadedRepairId.current !== currentId) {
                if (found.steps && found.steps.length > 0) {
                    setSteps(found.steps.map(s => ({ ...s, checked: s.checked ?? s.completed ?? false })));
                } else {
                    setSteps(DEFAULT_STEPS);
                }
                
                const serials = {};
                (found.parts || []).forEach((p, idx) => {
                    serials[`${idx}_kbb`] = p.kbbSerial || '';
                    serials[`${idx}_kgb`] = p.kgbSerial || '';
                });
                setLocalSerials(serials);
                
                lastLoadedRepairId.current = currentId;
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [repairId, repairs]);

    useEffect(() => {
        let interval;
        if (isTimerRunning) {
            interval = setInterval(() => setTimer(prev => prev + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Teknisyen doğrulama modalı
    const verifyAndAssignTech = (tech) => {
        setPwInput('');
        setPwError('');
        setPwShow(false);
        setPwModal({ open: true, tech });
    };

    const submitPassword = async () => {
        const tech = pwModal.tech;
        if (!tech) return;
        if (!pwInput.trim()) {
            setPwError('Lütfen şifrenizi girin.');
            return;
        }
        setPwVerifying(true);
        setPwError('');
        const isValid = await verifyTechnicianPassword(tech.id || tech._id, pwInput);
        setPwVerifying(false);

        if (isValid) {
            setPwModal({ open: false, tech: null });
            setPwInput('');
            showToast('Teknisyen doğrulandı, onarım başlatıldı.', 'success');
            updateRepair(repairId, {
                technician: tech.name,
                status: 'Onarımda',
                historyNote: `${tech.name} şifre doğrulayarak onarımı başlattı.`
            });
        } else {
            setPwError('Girdiğiniz şifre hatalı. Lütfen tekrar deneyin.');
        }
    };

    const toggleStep = (id) => {
        if (!isTimerRunning && repair.technician) {
            setIsTimerRunning(true);
            showToast('Onarım süreci otomatik başlatıldı.', 'info');
        }
        if (!repair.technician) {
            appAlert('Lütfen önce bir teknisyen seçerek onarımı başlatın.', 'warning');
            return;
        }
        const newSteps = steps.map(s => s.id === id ? { ...s, checked: !s.checked } : s);
        setSteps(newSteps);
        updateRepair(repairId, { steps: newSteps });
    };

    const getUpdatedParts = useCallback(() => {
        if (!repair || !repair.parts) return [];
        return repair.parts.map((p, idx) => ({
            ...p,
            kgbSerial: localSerials[`${idx}_kgb`] || p.kgbSerial || '',
            kbbSerial: localSerials[`${idx}_kbb`] || p.kbbSerial || '',
            storeId: repair.storeId
        }));
    }, [repair, localSerials]);

    const handleComplete = async () => {
        if (!steps.every(s => s.checked)) {
            appAlert('Lütfen tüm onarım adımlarını tamamlayın.', 'warning');
            return;
        }
        if (!repairClosingNote.trim()) {
            appAlert('Lütfen onarım raporunu/notlarını doldurun.', 'warning');
            return;
        }

        const updatedParts = getUpdatedParts();
        // Bütün birim kayıtlarında KGB serisi yoktur; seri takibi cihaz bazlıdır
        const incompletePart = updatedParts.find(p => !p.isWholeUnit && !p.kgbSerial?.trim());

        if (incompletePart) {
            appAlert(`${incompletePart.description} için KGB seri numarası zorunludur.`, 'error');
            return;
        }

        const duration = formatTime(timer);
        
        showToast('Stok hareketleri işleniyor...', 'info');
        const stockSuccess = await processStockMovement(repairId, updatedParts);
        
        if (!stockSuccess) {
            appAlert('Stok hareketleri işlenirken bir hata oluştu. Lütfen bağlantınızı kontrol edin.', 'error');
            return;
        }

        const success = await updateRepair(repairId, {
            status: 'Cihaz Hazır',
            parts: updatedParts,
            repairClosingNote: `${repairClosingNote}\n\n[Süre: ${duration}]`,
            repairDuration: duration,
            historyNote: `Onarım tamamlandı ve stok hareketleri işlendi. (${duration})`
        });

        if (success) {
            completeJob(currentUser?.id);
            onClose();
            if (setActiveTab) setActiveTab('ready-pickup');
            showToast('Onarım başarıyla sonuçlandırıldı ve stoklar güncellendi.', 'success');
        }
    };

    if (!repair) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-[#f5f5f7] flex flex-col animate-fade-in">
            {/* GSX Top Bar */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-[#1d1d1f] text-white p-2 rounded-lg">
                        <Wrench size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Servis Atölyesi</span>
                            <ChevronRight size={10} className="text-gray-300" />
                            <span className="text-[10px] font-bold text-[#0071e3] uppercase tracking-widest">Aktif Onarım</span>
                        </div>
                        <h2 className="text-sm font-bold text-[#1d1d1f]">#{repair.id} • {repair.device}</h2>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">İşlem Süresi</span>
                        <span className={`text-xl font-mono font-black ${isTimerRunning ? 'text-[#0071e3]' : 'text-gray-300'}`}>{formatTime(timer)}</span>
                    </div>
                    <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isTimerRunning ? 'bg-red-500 text-white' : 'bg-[#0071e3] text-white'}`}>
                        {isTimerRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-[#1d1d1f] transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Service Info & Steps */}
                <div className="w-[400px] border-r border-gray-200 bg-white flex flex-col shrink-0 overflow-y-auto">
                    <div className="p-6 border-b border-gray-50 bg-[#fbfbfd]">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm">
                                <DeviceImage image={repair.image} productGroup={repair.productGroup} device={repair.device} apiUrl={API_URL} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#1d1d1f]">{repair.customer}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{repair.serial}</p>
                                <div className="mt-2 flex gap-2">
                                    <span className="px-2 py-0.5 bg-blue-50 text-[#0071e3] text-[9px] font-bold rounded uppercase border border-blue-100">Mağaza İçi</span>
                                    {repair.technician && <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[9px] font-bold rounded uppercase border border-green-100">👨‍🔧 {repair.technician}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                <Info size={10} /> Müşteri Şikayeti
                            </h4>
                            <p className="text-[11px] font-medium text-gray-600 leading-relaxed italic">"{repair.issue}"</p>
                        </div>
                    </div>

                    {/* Kayıt Detayları (tüm kayıt bilgileri) */}
                    <div className="px-6 py-5 border-b border-gray-50 space-y-2.5">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                            <Info size={10} /> Kayıt Detayları
                        </h4>
                        {[
                            { label: 'Telefon', value: repair.customerPhone || '—' },
                            { label: 'S/N', value: repair.serial || repair.serialNumber || '—' },
                            { label: 'IMEI 1', value: repair.imei1, show: !!repair.imei1 },
                            { label: 'IMEI 2', value: repair.imei2, show: !!repair.imei2 },
                            { label: 'Garanti', value: repair.warrantyStatus || 'Belirtilmedi' },
                            { label: 'Cihazımı Bul', value: repair.findMyOff ? 'Kapalı' : 'Açık' },
                            { label: 'Veri Yedeği', value: repair.backupTaken ? 'Alındı' : 'Yok' },
                            { label: 'Ürün Grubu', value: repair.productGroup || repair.device?.split(' ')[0] || '—' },
                            { label: 'Teklif Tutarı', value: repair.quoteAmount ? `${repair.quoteAmount} ₺` : '—' },
                            { label: 'Fatura No', value: repair.invoiceNumber || '—' },
                            { label: 'Kayıt Tarihi', value: repair.date || '—' },
                        ].filter(r => r.show !== false).map((r, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px] gap-3">
                                <span className="font-bold text-gray-400 uppercase tracking-tight shrink-0">{r.label}</span>
                                <span className="font-semibold text-gray-800 font-mono truncate text-right" title={r.value}>{r.value}</span>
                            </div>
                        ))}
                        {repair.customerAddress && (
                            <div className="pt-2 mt-2 border-t border-gray-50">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight block mb-1">Adres</span>
                                <p className="text-[11px] font-medium text-gray-600 leading-snug">{repair.customerAddress}</p>
                            </div>
                        )}
                        {repair.visualCondition && repair.visualCondition.length > 0 && (
                            <div className="pt-2 mt-2 border-t border-gray-50 flex flex-wrap gap-1.5">
                                {repair.visualCondition.map((v, i) => (
                                    <span key={i} className="text-[9px] px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-100 font-bold">{v}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-6 space-y-2">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Onarım Akışı Checklist</h4>
                        {steps.map((step, idx) => (
                            <div 
                                key={step.id} onClick={() => toggleStep(step.id)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4 ${step.checked ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-lg shadow-[#0071e3]/10' : 'bg-white border-gray-100 hover:border-[#0071e3]/30'}`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${step.checked ? 'bg-white text-[#0071e3] border-white' : 'border-gray-200 text-transparent'}`}>
                                    <Check size={14} strokeWidth={4} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-[8px] font-bold uppercase ${step.checked ? 'text-blue-100' : 'text-gray-400'}`}>Adım {idx + 1}</span>
                                    <span className="text-[11px] font-bold tracking-tight">{step.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content: Workbench */}
                <div className="flex-1 overflow-y-auto p-10 bg-[#f5f5f7]">
                    {!repair.technician ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-2xl border border-white text-center">
                                <div className="w-20 h-20 bg-[#f5f5f7] text-[#0071e3] rounded-[24px] flex items-center justify-center mx-auto mb-6">
                                    <Users size={40} />
                                </div>
                                <h2 className="text-2xl font-bold text-[#1d1d1f] mb-2">Workbench Erişimi</h2>
                                <p className="text-sm text-gray-400 font-medium mb-8">İşlemi başlatan teknisyeni seçiniz.</p>
                                <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
                                    {technicians.map(tech => (
                                        <button 
                                            key={tech.id} 
                                            onClick={() => verifyAndAssignTech(tech)}
                                            className="w-full p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between hover:border-[#0071e3] hover:bg-[#0071e3]/5 transition-all group active:scale-[0.98]"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl">{tech.avatar || '👨‍🔧'}</span>
                                                <span className="font-bold text-[#1d1d1f]">{tech.name}</span>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-300 group-hover:text-[#0071e3]" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-8">
                            {/* Apple Parts Pairing Section */}
                            {repair.parts && repair.parts.length > 0 && (
                                <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-8">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-[#f5f5f7] rounded-xl text-[#0071e3]">
                                                <Box size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-[#1d1d1f]">Apple Parça Eşleştirme (KBB/KGB)</h3>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Orijinal Parça Entegrasyonu</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold border border-green-100">
                                            <ShieldCheck size={14} /> GÜVENLİ AKTARIM
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {repair.parts.map((part, idx) => part.isWholeUnit ? (
                                            /* Bütün birim: parça sökülmez, seri takibi cihaz üzerinden yapılır */
                                            <div key={idx} className="p-6 bg-[#fbfbfd] rounded-2xl border border-gray-100">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-[11px] font-black text-[#1d1d1f] uppercase">{part.description}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#bf5b04] bg-[#ff9500]/10 border border-[#ff9500]/25 px-2 py-0.5 rounded">
                                                        Bütün Birim · {part.partNumber}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-1.5">
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase ml-1">Arızalı Cihaz Seri</p>
                                                        <p className="h-12 px-4 flex items-center bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase text-gray-600">
                                                            {part.faultyDeviceSerial || '—'}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase ml-1">Gelen Cihaz Seri</p>
                                                        <p className="h-12 px-4 flex items-center bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase text-gray-600">
                                                            {part.replacementDeviceSerial || '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div key={idx} className="p-6 bg-[#fbfbfd] rounded-2xl border border-gray-100">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-[11px] font-black text-[#1d1d1f] uppercase">{part.description}</span>
                                                    <span className="text-[10px] font-mono text-gray-400 font-bold">P/N: {part.partNumber}</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">KBB (Eski Seri)</label>
                                                        <input 
                                                            type="text" placeholder="SERİ NO OKUTUN"
                                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-[#0071e3] outline-none transition-all uppercase"
                                                            value={localSerials[`${idx}_kbb`] || ''}
                                                            onChange={(e) => setLocalSerials({...localSerials, [`${idx}_kbb`]: e.target.value.toUpperCase()})}
                                                            onBlur={() => updateRepair(repairId, { parts: repair.parts.map((p, i) => i === idx ? {...p, kbbSerial: localSerials[`${idx}_kbb`]} : p) })}
                                                        />
                                                    </div>
                                                    <div className="mt-5">
                                                        <ArrowRight size={20} className="text-[#0071e3]/30" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">KGB (Yeni Seri)</label>
                                                        <input 
                                                            type="text" placeholder="YENİ SERİ NO"
                                                            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-[#0071e3] outline-none transition-all uppercase"
                                                            value={localSerials[`${idx}_kgb`] || ''}
                                                            onChange={(e) => setLocalSerials({...localSerials, [`${idx}_kgb`]: e.target.value.toUpperCase()})}
                                                            onBlur={() => updateRepair(repairId, { parts: repair.parts.map((p, i) => i === idx ? {...p, kgbSerial: localSerials[`${idx}_kgb`]} : p) })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Repair Report & Media */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-8 flex flex-col">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-[#f5f5f7] rounded-xl text-[#0071e3]">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-[#1d1d1f]">Onarım Notları</h3>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Teknisyen Raporu</p>
                                        </div>
                                    </div>
                                    <textarea 
                                        className="flex-1 w-full p-6 bg-[#fbfbfd] border border-gray-100 rounded-2xl text-sm font-medium focus:border-[#0071e3] outline-none transition-all resize-none min-h-[200px]"
                                        placeholder="Yapılan işlemler, parça değişim detayları ve nihai durumu yazınız..."
                                        value={repairClosingNote}
                                        onChange={(e) => setRepairClosingNote(e.target.value)}
                                    />
                                </div>

                                <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-[#f5f5f7] rounded-xl text-[#0071e3]">
                                                <Camera size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-[#1d1d1f]">Görsel Kanıtlar</h3>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Maks. 5 Fotoğraf</p>
                                            </div>
                                        </div>
                                        <button onClick={() => fileInputRef.current.click()} disabled={uploading} className="p-2.5 bg-[#0071e3] text-white rounded-xl hover:bg-[#0077ed] transition-all shadow-lg shadow-[#0071e3]/20">
                                            <Plus size={20} />
                                        </button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={async (e) => {
                                            const files = Array.from(e.target.files);
                                            if (files.length === 0) return;
                                            setUploading(true);
                                            try {
                                                const uploadedUrls = [];
                                                for (const file of files) {
                                                    const res = await uploadMedia(file);
                                                    uploadedUrls.push(res.url);
                                                }
                                                const newImages = [...(repair.repairImages || []), ...uploadedUrls];
                                                await updateRepair(repairId, { repairImages: newImages });
                                                showToast(`${files.length} fotoğraf başarıyla yüklendi.`, 'success');
                                            } catch (err) {
                                                appAlert(err.message, 'error');
                                            } finally {
                                                setUploading(false);
                                            }
                                        }} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(repair.repairImages || []).map((url, i) => (
                                            <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                                <DeviceImage
                                                    image={url}
                                                    productGroup={repair.productGroup}
                                                    device={repair.device}
                                                    apiUrl={API_URL}
                                                    alt={`Onarım görseli ${i + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button onClick={async () => {
                                                        const newImages = repair.repairImages.filter((_, idx) => idx !== i);
                                                        await updateRepair(repairId, { repairImages: newImages });
                                                    }} className="p-2 bg-red-500 text-white rounded-lg"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {(!repair.repairImages || repair.repairImages.length === 0) && (
                                            <div className="col-span-2 py-10 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl">
                                                <Camera size={32} className="mb-2 opacity-20" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Fotoğraf Eklenmemiş</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-8">
                                <button onClick={() => setShowReturnModal(true)} className="flex-1 py-5 bg-white border border-gray-200 text-red-500 font-bold rounded-[24px] hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center gap-2">
                                    <RotateCcw size={20} /> İADE İŞLEMİ
                                </button>
                                <button onClick={() => setShowQuoteModal(true)} className="flex-1 py-5 bg-white border border-gray-200 text-[#0071e3] font-bold rounded-[24px] hover:bg-blue-50 hover:border-blue-100 transition-all flex items-center justify-center gap-2">
                                    <Plus size={20} /> EK TEKLİF OLUŞTUR
                                </button>
                                <button onClick={handleComplete} className="flex-[2] py-5 bg-[#0071e3] text-white font-bold rounded-[24px] shadow-2xl shadow-[#0071e3]/30 hover:bg-[#0077ed] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg">
                                    <CheckCircle size={24} /> ONARIMI TAMAMLA
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Teknisyen Şifre Doğrulama Modalı */}
            {pwModal.open && (
                <div className="fixed inset-0 z-[120] bg-[#1d1d1f]/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => !pwVerifying && setPwModal({ open: false, tech: null })}>
                    <div className="bg-white w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
                        {/* Başlık */}
                        <div className="px-8 pt-8 pb-6 text-center">
                            <div className="w-16 h-16 mx-auto bg-[#f5f5f7] rounded-2xl flex items-center justify-center text-3xl mb-4 border border-gray-100">
                                {pwModal.tech?.avatar || '👨‍🔧'}
                            </div>
                            <span className="text-[10px] font-bold text-[#0071e3] uppercase tracking-widest">Teknisyen Doğrulaması</span>
                            <h3 className="text-xl font-bold text-[#1d1d1f] mt-1">{pwModal.tech?.name}</h3>
                            <p className="text-sm text-gray-500 font-medium mt-2">Onarımı başlatmak için şifrenizi girin.</p>
                        </div>

                        {/* Şifre alanı */}
                        <div className="px-8">
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={pwShow ? 'text' : 'password'}
                                    autoFocus
                                    value={pwInput}
                                    onChange={(e) => { setPwInput(e.target.value); if (pwError) setPwError(''); }}
                                    onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
                                    placeholder="Şifreniz"
                                    className={`w-full pl-12 pr-12 py-4 bg-[#f5f5f7] border rounded-2xl text-base font-semibold text-[#1d1d1f] outline-none transition-all focus:bg-white ${pwError ? 'border-red-300 focus:ring-4 focus:ring-red-500/10' : 'border-transparent focus:ring-4 focus:ring-[#0071e3]/10 focus:border-[#0071e3]'}`}
                                />
                                <button type="button" onClick={() => setPwShow(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                    {pwShow ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {pwError && (
                                <p className="text-xs text-red-500 font-bold mt-2 ml-1 flex items-center gap-1.5">
                                    <AlertCircle size={13} /> {pwError}
                                </p>
                            )}
                        </div>

                        {/* Butonlar */}
                        <div className="p-8 flex gap-3">
                            <button onClick={() => setPwModal({ open: false, tech: null })} disabled={pwVerifying} className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-50">
                                İptal
                            </button>
                            <button onClick={submitPassword} disabled={pwVerifying} className="flex-[1.6] py-3.5 bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold rounded-2xl shadow-lg shadow-[#0071e3]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60">
                                {pwVerifying ? 'Doğrulanıyor...' : (<><ShieldCheck size={18} /> Doğrula ve Başlat</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quote Modal */}
            {showQuoteModal && (
                <div className="fixed inset-0 z-[110] bg-[#1d1d1f]/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-scale-up">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-[#0071e3] rounded-2xl">
                                    <Plus size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[#1d1d1f]">Ek Parça / İşçilik Teklifi</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Müşteri Onayına Gönderilecek</p>
                                </div>
                            </div>
                            <button onClick={() => setShowQuoteModal(false)} className="p-2 text-gray-400 hover:text-[#1d1d1f]"><X size={24} /></button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[400px] overflow-y-auto">
                            {quoteItems.map((item, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <input type="text" placeholder="Parça veya İşçilik Adı" className="flex-[3] p-4 bg-[#f5f5f7] border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-[#0071e3] outline-none transition-all" value={item.name} onChange={(e) => setQuoteItems(quoteItems.map((it, i) => i === idx ? {...it, name: e.target.value} : it))} />
                                    <input type="number" placeholder="Tutar (₺)" className="flex-1 p-4 bg-[#f5f5f7] border-transparent rounded-xl text-sm font-bold focus:bg-white focus:border-[#0071e3] outline-none transition-all" value={item.price} onChange={(e) => setQuoteItems(quoteItems.map((it, i) => i === idx ? {...it, price: e.target.value} : it))} />
                                    <button onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))} className="p-4 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                                </div>
                            ))}
                            <button onClick={() => setQuoteItems([...quoteItems, { name: '', price: '' }])} className="w-full py-4 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 font-bold hover:border-[#0071e3] hover:text-[#0071e3] transition-all">+ YENİ SATIR EKLE</button>
                        </div>
                        <div className="p-8 bg-gray-50 flex items-center justify-between">
                            <div className="text-2xl font-black text-[#1d1d1f]">₺{quoteItems.reduce((a, b) => a + (Number(b.price) || 0), 0).toLocaleString('tr-TR')}</div>
                            <button onClick={() => { updateRepair(repairId, { status: 'Müşteri Onayı Bekliyor', quoteAmount: quoteItems.reduce((a, b) => a + (Number(b.price) || 0), 0).toString() }); onClose(); }} className="px-8 py-4 bg-[#0071e3] text-white font-bold rounded-2xl shadow-xl shadow-[#0071e3]/20">TEKLİFİ GÖNDER</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {showReturnModal && (
                <div className="fixed inset-0 z-[110] bg-[#1d1d1f]/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-[32px] p-8 shadow-2xl">
                        <h3 className="text-xl font-bold text-[#1d1d1f] mb-6 flex items-center gap-2">
                            <AlertCircle className="text-red-500" /> İade Gerekçesi
                        </h3>
                        <div className="space-y-3 mb-8">
                            {RETURN_REASONS.map(reason => (
                                <button key={reason} onClick={() => setReturnReason(reason)} className={`w-full p-4 rounded-xl border text-left text-sm font-bold transition-all ${returnReason === reason ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-100'}`}>
                                    {reason}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowReturnModal(false)} className="flex-1 py-4 text-gray-400 font-bold">İptal</button>
                            <button onClick={() => { updateRepair(repairId, { status: 'İade Hazır', historyNote: `Cihaz iade edildi: ${returnReason}` }); onClose(); }} className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl">İADE ET</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechnicianWorkspace;
