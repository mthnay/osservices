import React, { useState, useMemo } from 'react';
import {
    Clock, Check, X, DollarSign, AlertCircle, User, MessageCircle, 
    ArrowRight, Eye, Send, Bell, ChevronRight, Activity, Zap, ClipboardCheck,
    Search, Mail, Phone, Calculator, Info
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import DeviceImage from './DeviceImage';
import CustomerNotificationModal from './CustomerNotificationModal';
import RepairHistoryModal from './RepairHistoryModal';
import RepairDiagnosisModal from './RepairDiagnosisModal';

const ApprovalPending = ({ setActiveTab }) => {
    const { repairs, updateRepair, showToast, searchQuery, API_URL, setSearchQuery } = useAppContext();
    const [selectedRepair, setSelectedRepair] = useState(null);
    const [selectedHistoryRepair, setSelectedHistoryRepair] = useState(null);
    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [diagnosisRepair, setDiagnosisRepair] = useState(null);

    const pendingApprovalList = useMemo(() => {
        return repairs.filter(r => {
            const isPending = r.status === 'Müşteri Onayı Bekliyor';
            const matchesSearch = !searchQuery || 
                (r.device?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 r.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 r.id?.toLowerCase().includes(searchQuery.toLowerCase()));
            return isPending && matchesSearch;
        });
    }, [repairs, searchQuery]);

    const handleApproval = (repair, isApproved) => {
        if (isApproved) {
            setDiagnosisRepair({
                ...repair,
                pendingStatus: 'İşlemde',
                historyNote: 'Müşteri onayı alındı. İşlem başlatılıyor.'
            });
        } else {
            setDiagnosisRepair({
                ...repair,
                pendingStatus: 'İade Edildi',
                historyNote: 'Müşteri reddetti. İade işlemleri başlatılıyor.'
            });
        }
    };

    const handleSaveDiagnosis = (diagnosisData) => {
        const { targetView, originalRepair, ...rest } = diagnosisData;
        let newStatus = 'İşlemde';
        if (rest.parts?.some(p => p.needsOrder)) newStatus = "Parça Bekleniyor";
        if (targetView === 'apple-center') newStatus = "Apple'a Gönderildi";
        if (targetView === 'ready-pickup') newStatus = "İade Hazır";

        updateRepair(originalRepair.id, {
            ...rest,
            status: newStatus,
            type: targetView,
            appleRepairId: targetView === 'apple-center' ? rest.repairId : (originalRepair.appleRepairId || ''),
            historyNote: originalRepair.historyNote || rest.historyNote || 'Müşteri onayı sonrası kayıt güncellendi.'
        });

        setDiagnosisRepair(null);
        showToast(targetView === 'ready-pickup' ? 'İade işlemi hazırlandı.' : 'Kayıt ilgili merkeze aktarıldı.', 'success');
        
        if (setActiveTab) {
            if (targetView === 'ready-pickup') setActiveTab('ready-pickup');
            else if (targetView === 'in-store') setActiveTab('in-store');
            else if (targetView === 'apple-center') setActiveTab('apple-center');
            else setActiveTab('archive');
        }
    };

    const handleNotify = (repair) => {
        setSelectedRepair(repair);
        setShowNotifyModal(true);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* GSX Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        <span>Onarım Yönetimi</span>
                        <ChevronRight size={10} />
                        <span className="text-[#0071e3]">Onay Bekleyenler</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Teklif Onay Masası</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Müşteri veya kayıt ara..." 
                            className="pl-10 pr-4 py-2.5 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all outline-none w-64 text-sm font-medium text-[#1d1d1f]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bekleyen Onay</p>
                        <p className="text-xl font-bold text-[#1d1d1f]">{pendingApprovalList.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                        <Send size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Son Bildirim</p>
                        <p className="text-xl font-bold text-[#1d1d1f]">{pendingApprovalList.filter(r => r.lastNotified).length}</p>
                    </div>
                </div>
            </div>

            {/* Service Queue Table */}
            <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f5f5f7] border-b border-gray-200">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kayıt</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cihaz & Müşteri</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teklif Tutarı</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bildirim Durumu</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pendingApprovalList.map(repair => (
                                <tr key={repair.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedHistoryRepair(repair)}>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-[#1d1d1f]">#{repair.id}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">{repair.date?.split(' ')[0]}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
                                                <DeviceImage image={repair.image} productGroup={repair.productGroup} device={repair.device} apiUrl={API_URL} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-[#1d1d1f] truncate">{repair.device}</p>
                                                <p className="text-[10px] text-gray-500 font-medium truncate">{repair.customer}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <Calculator size={14} className="text-gray-300" />
                                            <span className="text-sm font-black text-[#1d1d1f]">₺{Number(repair.quoteAmount || 0).toLocaleString('tr-TR')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600">
                                                <Send size={10} /> {repair.lastNotified || 'Bildirim Yok'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 mt-1">
                                                <Info size={10} /> {repair.lastNotifyChannel || 'Sistem'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleNotify(repair); }}
                                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                                title="Tekrar Bildir"
                                            >
                                                <Mail size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleApproval(repair, true); }}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1"
                                            >
                                                <Check size={12} strokeWidth={3} /> ONAY
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleApproval(repair, false); }}
                                                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-[10px] font-bold rounded-lg transition-all active:scale-95 flex items-center gap-1"
                                            >
                                                <X size={12} strokeWidth={3} /> RED
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {pendingApprovalList.length === 0 && (
                        <div className="py-24 text-center">
                            <ClipboardCheck className="mx-auto text-gray-200 mb-4" size={56} />
                            <h3 className="text-lg font-bold text-gray-900">Tertemiz Liste</h3>
                            <p className="text-sm text-gray-500">Müşteri onayı bekleyen bir kayıt bulunmuyor.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showNotifyModal && selectedRepair && (
                <CustomerNotificationModal repair={selectedRepair} onClose={() => setShowNotifyModal(false)} onActionComplete={() => { setShowNotifyModal(false); setSelectedRepair(null); }} />
            )}
            {selectedHistoryRepair && (
                <RepairHistoryModal repair={selectedHistoryRepair} onClose={() => setSelectedHistoryRepair(null)} />
            )}
            {diagnosisRepair && (
                <RepairDiagnosisModal repair={diagnosisRepair} onClose={() => setDiagnosisRepair(null)} onSave={handleSaveDiagnosis} />
            )}
        </div>
    );
};

export default ApprovalPending;
