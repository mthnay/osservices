import React, { useState, useEffect } from 'react';
import {
    X, CheckCircle, Clock, AlertTriangle,
    Save, Play, Pause, RotateCcw, Box, Wrench, FileText, ChevronRight, Activity, Zap, RefreshCcw, Truck, PackageCheck, Send, UserCheck, ArrowRightLeft
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { appPrompt, appAlert } from '../utils/alert';
import { getSafeRepairImageUrl } from '../utils/productImages';
import Swal from 'sweetalert2';

const SwapWorkspace = ({ repairId, onClose, setActiveTab }) => {
    const { repairs, updateRepair, completeJob, currentUser, API_URL } = useAppContext();
    const [repair, setRepair] = useState(null);
    const [repairClosingNote, setRepairClosingNote] = useState('');
    const [timer, setTimer] = useState(0); 
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Değişim / Sipariş Adımları
    const DEFAULT_STEPS = [
        { id: 1, label: 'Apple Siparişi Geçildi (GSX)', checked: false, icon: Box },
        { id: 2, label: 'Değişim Cihazı Kargoya Verildi', checked: false, icon: Truck },
        { id: 3, label: 'Ürün Mağazaya Ulaştı', checked: false, icon: PackageCheck },
        { id: 4, label: 'Müşteri Bilgilendirildi (SMS/Email)', checked: false, icon: Send },
        { id: 5, label: 'Eski Cihaz İade Alındı', checked: false, icon: ArrowRightLeft },
        { id: 6, label: 'Yeni Cihaz Müşteriye Teslim Edildi', checked: false, icon: UserCheck },
    ];

    const [steps, setSteps] = useState(() => {
        const found = repairs.find(r => r.id === repairId);
        if (found?.steps && found.steps.length > 0) {
            return found.steps;
        }
        return DEFAULT_STEPS;
    });

    useEffect(() => {
        const found = repairs.find(r => r.id === repairId);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRepair(found);

        let interval;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [repairId, isTimerRunning, repairs]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleStep = (id) => {
        const newSteps = steps.map(step =>
            step.id === id ? { ...step, checked: !step.checked } : step
        );
        setSteps(newSteps);
        updateRepair(repairId, { steps: newSteps });
    };

    const handleComplete = () => {
        const allChecked = steps.every(s => s.checked);
        if (!allChecked) {
            Swal.fire({
                title: 'Eksik Adımlar!',
                text: 'Lütfen tüm sipariş ve kargo adımlarını tamamlayınız.',
                icon: 'warning',
                confirmButtonColor: '#9333ea'
            });
            return;
        }

        const incompletePart = repair.parts?.find(p => p.needsOrder || !p.kgbSerial);
        if (incompletePart) {
            Swal.fire({
                title: 'KGB Seri No Eksik',
                text: `Lütfen ${incompletePart.description} için yeni seri numarasını (KGB) giriniz.`,
                icon: 'warning',
                confirmButtonColor: '#9333ea'
            });
            return;
        }

        if (!repairClosingNote.trim()) {
            Swal.fire({
                title: 'İşlem Notu Gerekli',
                text: 'Lütfen işlem sonrası teknik notunuzu veya raporu giriniz.',
                icon: 'warning',
                confirmButtonColor: '#9333ea'
            });
            return;
        }

        const duration = formatTime(timer);
        updateRepair(repairId, {
            status: 'Cihaz Hazır',
            repairClosingNote: `${repairClosingNote}\n\n[İşlem Süresi: ${duration}]`,
            steps,
            repairDuration: duration,
            historyNote: `Değişim İşlemi Tamamlandı (${duration}): ${repairClosingNote}`
        });

        completeJob(currentUser?.id || 'T1');

        Swal.fire({
            title: 'Başarılı!',
            text: 'Değişim süreci başarıyla tamamlandı ve cihaz teslimata hazır hale getirildi.',
            icon: 'success',
            timer: 3000,
            showConfirmButton: false
        });
        onClose();

        if (setActiveTab) {
            setActiveTab('ready-pickup');
        }
    };

    const handleReport = async () => {
        const report = await appPrompt("Teknik raporunuzu giriniz:");
        if (report) {
            const newHistory = [...(repair.history || []), { status: repair.status, date: new Date().toLocaleString(), streamType: 'report', text: report, note: `[RAPOR] ${report}` }];
            updateRepair(repair.id, { history: newHistory });
            appAlert("Rapor eklendi.", "success");
        }
    };

    const handleAlert = async () => {
        const alertNote = await appPrompt("Sorunu bildirin:");
        if (alertNote) {
            const newHistory = [...(repair.history || []), { status: repair.status, date: new Date().toLocaleString(), streamType: 'alert', text: alertNote, note: `⚠️ [SORUN] ${alertNote}` }];
            updateRepair(repair.id, { history: newHistory });
            appAlert("Sorun bildirildi.", "error"); 
        }
    };

    if (!repair) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white/95 rounded-lg w-full max-w-7xl h-[92vh] flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden shadow-2xl relative border border-white/50 animate-scale-up">

                {/* Sol Panel - Sipariş & Değişim Adımları */}
                <div className="w-full lg:w-1/3 bg-gray-50/80 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col shrink-0 lg:shrink lg:h-full">
                    <div className="p-8 border-b border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-white text-gray-900 px-3 py-1 rounded-md text-xs font-mono font-bold shadow-sm border border-gray-100">{repair.id}</span>
                            <span className="bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-bold uppercase shadow-sm shadow-purple-200">Değişim / Swap</span>
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 leading-tight mb-2 tracking-tight">{repair.device}</h2>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-100">
                                <span className="font-bold uppercase">S/N: {repair.serial || repair.serialNumber || 'YOK'}</span>
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 font-medium">{repair.customer}</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="flex items-center gap-2 mb-6 text-xs font-semibold uppercase text-gray-400">
                            <RefreshCcw size={16} className="text-purple-500" />
                            Sipariş & Değişim Adımları
                        </div>
                        <div className="space-y-3">
                            {steps.map((step, index) => (
                                <label key={step.id} className={`flex items-center gap-4 p-5 rounded-lg border cursor-pointer transition-all ${step.checked ? 'bg-purple-600 border-purple-600 shadow-lg text-white' : 'bg-white border-gray-100 hover:border-purple-200'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step.checked ? 'bg-white text-purple-600 border-white' : 'border-gray-200 text-gray-400'}`}>
                                        {step.checked ? <CheckCircle size={16} strokeWidth={4} /> : <step.icon size={16} />}
                                    </div>
                                    <input type="checkbox" checked={step.checked} onChange={() => toggleStep(step.id)} className="hidden" />
                                    <div className="flex flex-col">
                                        <span className={`text-[9px] font-semibold uppercase opacity-60 ${step.checked ? 'text-purple-100' : 'text-gray-400'}`}>ADIM {index + 1}</span>
                                        <span className="text-sm font-bold">{step.label}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Parça & Ürün Durumu */}
                    {repair.parts && repair.parts.length > 0 && (
                        <div className="p-6 border-t border-gray-100 bg-white">
                            <h4 className="text-[10px] font-semibold uppercase text-gray-400 mb-4 flex items-center gap-2">
                                <Box size={14} className="text-purple-500" />
                                Parça & Ürün Durumu
                            </h4>
                            <div className="space-y-2">
                                {repair.parts.map((p, i) => (
                                    <div key={i} className="flex flex-col p-3 bg-gray-50 rounded-md border border-gray-100">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-gray-700 truncate">{p.description}</span>
                                            {p.kgbSerial ? (
                                                <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-semibold uppercase tracking-tighter shrink-0">GİRİLDİ</span>
                                            ) : (
                                                <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold uppercase tracking-tighter shrink-0">EKSİK</span>
                                            )}
                                        </div>
                                        <span className="text-[9px] font-mono text-gray-400">{p.kgbSerial || 'Giriş bekleniyor...'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Orta Panel */}
                <div className="flex-1 flex flex-col relative bg-white/50 backdrop-blur-md">
                    <div className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-10">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-semibold text-gray-400 text-xs uppercase tracking-wide"><Clock size={8} /> SÜRE</span>
                                <span className={`text-3xl font-mono font-bold ${isTimerRunning ? 'text-gray-900' : 'text-gray-300'}`}>{formatTime(timer)}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full">
                                <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isTimerRunning ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                    {isTimerRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleReport} className="px-4 py-2 bg-white border border-gray-200 rounded-md text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">Rapor</button>
                            <button onClick={handleAlert} className="px-4 py-2 bg-orange-50 border border-orange-100 rounded-md text-xs font-bold text-orange-600 hover:bg-orange-100 transition-all">Sorun</button>
                        </div>
                    </div>

                    <div className="flex-1 p-10 overflow-y-auto flex flex-col items-center justify-center">
                        <div className="relative mb-6 group">
                            <div className="absolute inset-0 bg-purple-500 blur-[40px] opacity-10 rounded-full group-hover:opacity-20 transition-all duration-700"></div>
                            <img src={getSafeRepairImageUrl(repair.image, repair.productGroup, repair.device, API_URL)} className="w-56 h-56 object-cover rounded-lg shadow-2xl border-4 border-white transform transition-transform group-hover:scale-105" alt="Device" />
                        </div>
                        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{repair.device}</h1>
                        <p className="text-base text-gray-500 font-medium mb-10 max-w-md text-center">{repair.issue || repair.issueDescription}</p>

                        {/* KGB Giriş Alanı - Küçük ve Altta */}
                        {repair.parts && repair.parts.length > 0 && repair.parts.some(p => !p.kgbSerial || p.needsOrder) && (
                            <div className="w-full max-w-lg mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white border-2 border-purple-50 rounded-lg p-5 shadow-xl shadow-purple-500/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                                            <Box size={16} />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="text-[11px] font-semibold text-gray-900 uppercase">KGB Seri No Tanımla</h4>
                                            <p className="text-[9px] text-gray-400 font-bold text-xs uppercase tracking-wide">Eksik seri numaralarını giriniz</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {repair.parts.filter(p => !p.kgbSerial || p.needsOrder).map((part, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-md border border-gray-100">
                                                <div className="flex-1 text-left min-w-0">
                                                    <h5 className="text-[10px] font-semibold text-gray-800 truncate">{part.description}</h5>
                                                    <span className="text-[8px] text-gray-400 font-mono tracking-tighter">{part.partNumber}</span>
                                                </div>
                                                <div className="w-40 relative">
                                                    <input 
                                                        type="text"
                                                        placeholder="Seri No Okutun"
                                                        className="w-full h-9 px-3 bg-white border border-gray-200 rounded-md text-[10px] font-semibold font-mono text-purple-900 outline-none focus:border-purple-600 transition-all uppercase"
                                                        value={part.kgbSerial || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value.toUpperCase().replace(/\s/g, '');
                                                            const updatedParts = repair.parts.map(p => p.inventoryId === part.inventoryId ? { ...p, kgbSerial: val, needsOrder: val.length < 5 } : p);
                                                            updateRepair(repairId, { parts: updatedParts });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ Panel */}
                <div className="w-full lg:w-1/4 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col shrink-0 lg:shrink lg:h-full overflow-y-auto">
                    <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-[9px] font-semibold uppercase text-gray-400 mb-2 flex items-center gap-2"><FileText size={14} /> Teknisyen Notları</h3>
                        <p className="text-xs font-semibold text-gray-500 leading-relaxed">{repair.diagnosisNotes || repair.notes || 'Not girilmemiş.'}</p>
                    </div>
                    <div className="flex-1 p-8 flex flex-col">
                        <h4 className="text-[9px] font-semibold uppercase text-gray-400 mb-3">İşlem Notu (Rapor)</h4>
                        <textarea
                            placeholder="Değişim süreci notları..."
                            className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-md p-5 outline-none focus:border-purple-500 focus:bg-white text-xs font-bold leading-relaxed resize-none"
                            value={repairClosingNote}
                            onChange={(e) => setRepairClosingNote(e.target.value)}
                        ></textarea>
                    </div>
                    <div className="p-8 border-t border-gray-100">
                        <button onClick={handleComplete} className="w-full py-4 bg-gray-900 text-white rounded-lg font-semibold text-sm hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 tracking-tight">
                            <Save size={18} /> İŞLEMİ TAMAMLA
                        </button>
                    </div>
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-md text-gray-300 hover:text-gray-900 transition-colors"><X size={24} /></button>
                </div>
            </div>
        </div>
    );
};

export default SwapWorkspace;
