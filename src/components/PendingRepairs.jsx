import React, { useState, useMemo } from 'react';
import { Clock, User, ChevronRight, AlertCircle, Calendar, ArrowRight, Eye, Search, Filter, LayoutGrid, List as ListIcon, MoreHorizontal, Truck, Check, Fingerprint, Activity, ClipboardList, PackageSearch } from 'lucide-react';
import MyPhoneIcon from './LocalIcons';
import RepairDiagnosisModal from './RepairDiagnosisModal';
import RepairHistoryModal from './RepairHistoryModal';
import { useAppContext } from '../context/AppContext';
import { appConfirm } from '../utils/alert';
// eslint-disable-next-line no-unused-vars
import { getProductImage, getSafeRepairImageUrl } from '../utils/productImages';

const StatusBadge = ({ status }) => {
    const config = {
        'Beklemede': 'bg-[#f5f5f7] text-[#1d1d1f] border-gray-200',
        'İnceleniyor': 'bg-[#e8f2ff] text-[#0071e3] border-[#0071e3]/10',
        'Parça Bekleniyor': 'bg-[#fff4e5] text-[#b25e00] border-[#b25e00]/10',
        'Onarımda': 'bg-[#f2e8ff] text-[#8e24aa] border-[#8e24aa]/10',
        'Cihaz Hazır': 'bg-[#e6f4ea] text-[#1e7e34] border-[#1e7e34]/10',
        'Transferde': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    };
    const style = config[status] || 'bg-gray-100 text-gray-600 border-gray-200';
    return (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${style} uppercase tracking-tight`}>
            {status}
        </span>
    );
};

const PendingRepairs = ({ setActiveTab }) => {
    const { repairs, updateRepair, currentUser, searchQuery, setSearchQuery, API_URL } = useAppContext();
    const [selectedRepair, setSelectedRepair] = useState(null);
    const [selectedHistoryRepair, setSelectedHistoryRepair] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'board'

    // Status Columns for Board View
    const BOARD_COLUMNS = [
        { id: 'Beklemede', label: 'Yeni Kayıt', color: 'bg-gray-400' },
        { id: 'İşlemde', label: 'Atölyede İşlemde', color: 'bg-blue-500' },
        { id: 'Parça Bekleniyor', label: 'Parça Bekleniyor', color: 'bg-orange-500' }
    ];

    const isSlaBreached = (repair) => {
        if (!repair.date) return false;
        const parseDate = (dateStr) => {
            if (!dateStr) return new Date();
            const parts = dateStr.split('.');
            if (parts.length >= 3) {
                const day = parts[0];
                const month = parts[1];
                const yearTime = parts[2].split(' ');
                const year = yearTime[0];
                return new Date(`${year}-${month}-${day}`);
            }
            const d = new Date(dateStr); return isNaN(d) ? new Date() : d;
        };
        const repairDate = parseDate(repair.date);
        const diffTime = Math.abs(new Date() - repairDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) > 3;
    };

    const filteredRepairs = useMemo(() => {
        return repairs.filter(r =>
            (r.device?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.serial?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [repairs, searchQuery]);

    const handleDragStart = (e, repairId) => e.dataTransfer.setData('repairId', repairId);
    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e, status) => {
        e.preventDefault();
        const repairId = e.dataTransfer.getData('repairId');
        const repair = repairs.find(r => r.id === repairId);
        if (repair && repair.status !== status) {
            updateRepair(repairId, { status, historyNote: `Durum panodan "${status}" olarak güncellendi.` });
        }
    };

    const getRepairsForColumn = (columnId) => {
        if (columnId === 'Hazır') return filteredRepairs.filter(r => ['Hazır', 'Cihaz Hazır', 'İade Hazır'].includes(r.status));
        return filteredRepairs.filter(r => r.status === columnId);
    };

    const pendingCount = filteredRepairs.filter(r => r.status === 'Beklemede').length;
    const incomingTransfers = filteredRepairs.filter(r => r.status === 'Transferde');

    const handleAcceptTransfer = (repair) => {
        updateRepair(repair.id, {
            status: 'Beklemede',
            historyNote: `Cihaz mağazaya ulaştı ve sistem tarafından teslim alındı. (İşlem yapan: ${currentUser?.name || 'Sistem'})`
        });
    };

    const handleSaveDiagnosis = async (result) => {
        let newStatus = 'İşlemde';
        if (result.parts?.some(p => p.needsOrder)) newStatus = "Parça Bekleniyor";
        if (result.targetView === 'apple-center') newStatus = "Apple'a Gönderildi";
        if (result.targetView === 'approval-pending') newStatus = "Müşteri Onayı Bekliyor";
        if (result.targetView === 'ready-pickup') newStatus = result.repairType === 'direct-return' ? "İade Hazır" : "Cihaz Hazır";

        const updates = {
            status: newStatus,
            type: result.targetView,
            diagnosisNotes: result.notes,
            tests: result.tests,
            parts: result.parts,
            repairType: result.repairType || result.originalRepair.repairType,
            quoteAmount: result.quoteAmount,
            appleRepairId: result.targetView === 'apple-center' ? result.repairId : (result.originalRepair.appleRepairId || ''),
            repairId: result.repairId || result.originalRepair.repairId,
            historyNote: `${result.targetView === 'apple-center' ? 'Apple Onarım Merkezi' : 'Mağaza İçi'} onarım süreci başlatıldı.`
        };

        updateRepair(result.originalRepair.id, updates);
        setSelectedRepair(null);
        if (await appConfirm(`Teşhis Kaydedildi!<br><br>Görünümü değiştirmek ister misiniz?`)) {
            setActiveTab(result.targetView);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* GSX Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        <span>Servis İşlemleri</span>
                        <ChevronRight size={10} />
                        <span className="text-[#0071e3]">Servis Kuyruğu & İş Akışı</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Kuyruk Yönetimi</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[#f5f5f7] p-1 rounded-xl border border-gray-200">
                        <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-[#0071e3] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <ListIcon size={18} />
                        </button>
                        <button onClick={() => setViewMode('board')} className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white text-[#0071e3] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                    
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Seri no, isim veya kayıt ara..." 
                            className="pl-10 pr-4 py-2.5 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all outline-none w-64 text-sm font-medium text-[#1d1d1f]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Kuyruktaki Cihaz', value: pendingCount, icon: ClipboardList, color: 'text-[#1d1d1f]' },
                    { label: 'Gelen Transferler', value: incomingTransfers.length, icon: Truck, color: 'text-[#0071e3]' },
                    { label: 'SLA İhlalleri', value: filteredRepairs.filter(isSlaBreached).length, icon: AlertCircle, color: 'text-[#e30000]' },
                    { label: 'Aktif Onarımlar', value: filteredRepairs.filter(r => r.status === 'Onarımda').length, icon: Activity, color: 'text-[#8e24aa]' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-gray-50 ${stat.color}`}>
                            <stat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-xl font-bold text-[#1d1d1f]">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Incoming Transfers */}
            {incomingTransfers.length > 0 && (
                <div className="bg-[#0071e3]/5 border border-[#0071e3]/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Truck className="text-[#0071e3]" size={24} />
                            <h3 className="font-bold text-[#1d1d1f]">Gelen Lojistik & Transferler</h3>
                        </div>
                        <span className="px-2 py-1 bg-[#0071e3] text-white text-[10px] font-bold rounded-full">{incomingTransfers.length} Bekliyor</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {incomingTransfers.map(repair => (
                            <div key={repair.id} className="bg-white/80 backdrop-blur-sm border border-white rounded-xl p-4 flex items-center justify-between group hover:border-[#0071e3]/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-100">
                                        <img src={getSafeRepairImageUrl(repair.image, repair.productGroup, repair.device, API_URL)} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-[#1d1d1f]">{repair.device}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">#{repair.id} • {repair.customer}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleAcceptTransfer(repair)} className="px-4 py-1.5 bg-white border border-gray-200 text-xs font-bold text-[#0071e3] rounded-lg hover:bg-[#0071e3] hover:text-white transition-all active:scale-95 shadow-sm">
                                    Teslim Al
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Content View */}
            {viewMode === 'list' ? (
                <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#f5f5f7] border-b border-gray-200">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kayıt Bilgisi</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Müşteri & Cihaz</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Şikayet Özeti</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Durum</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Eylem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRepairs.filter(r => ['Beklemede', 'İşlemde', 'Parça Bekleniyor'].includes(r.status)).map(repair => (
                                    <tr key={repair.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedHistoryRepair(repair)}>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-[#1d1d1f] flex items-center gap-2">
                                                    #{repair.id}
                                                    {isSlaBreached(repair) && <AlertCircle size={14} className="text-[#e30000]" />}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">{repair.date}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
                                                    <img src={getSafeRepairImageUrl(repair.image, repair.productGroup, repair.device, API_URL)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-[#1d1d1f] truncate">{repair.device}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium truncate">{repair.customer}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="max-w-[200px]">
                                                <p className="text-[11px] font-medium text-gray-600 line-clamp-2 leading-tight">
                                                    {repair.issue || "Belirtilmedi"}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <StatusBadge status={repair.status} />
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button className="p-2 text-gray-400 hover:text-[#0071e3] hover:bg-[#0071e3]/5 rounded-lg transition-all">
                                                <ChevronRight size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredRepairs.length === 0 && (
                            <div className="py-20 text-center">
                                <PackageSearch className="mx-auto text-gray-200 mb-4" size={48} />
                                <h3 className="text-lg font-bold text-gray-900">Sonuç Bulunamadı</h3>
                                <p className="text-sm text-gray-500">Aramanıza uygun aktif bir servis kaydı bulunmuyor.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex gap-6 overflow-x-auto pb-8 items-start min-h-[600px] custom-scrollbar">
                    {BOARD_COLUMNS.map(column => (
                        <div key={column.id} className="min-w-[300px] w-[300px] flex flex-col gap-4" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, column.id)}>
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${column.color}`}></span>
                                    {column.label}
                                </h3>
                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{getRepairsForColumn(column.id).length}</span>
                            </div>
                            
                            <div className="space-y-3">
                                {getRepairsForColumn(column.id).map(repair => (
                                    <div 
                                        key={repair.id} draggable onDragStart={(e) => handleDragStart(e, repair.id)} onClick={() => setSelectedHistoryRepair(repair)}
                                        className={`bg-white p-4 rounded-[20px] border ${isSlaBreached(repair) ? 'border-[#e30000]/30 shadow-[#e30000]/5' : 'border-gray-100'} shadow-sm hover:shadow-xl hover:border-[#0071e3]/20 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">#{repair.id}</span>
                                            {isSlaBreached(repair) && <span className="text-[8px] font-black text-white bg-[#e30000] px-2 py-0.5 rounded-full animate-pulse">SLA!</span>}
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                                                <img src={getSafeRepairImageUrl(repair.image, repair.productGroup, repair.device, API_URL)} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-[#1d1d1f] line-clamp-1">{repair.device}</h4>
                                                <p className="text-[10px] text-gray-500 font-medium mt-1 truncate">{repair.customer}</p>
                                                <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">{repair.date}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {getRepairsForColumn(column.id).length === 0 && (
                                    <div className="h-24 border-2 border-dashed border-gray-100 rounded-[20px] flex items-center justify-center text-[10px] font-bold text-gray-300 uppercase tracking-widest bg-gray-50/30">
                                        Boş
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {selectedRepair && <RepairDiagnosisModal repair={selectedRepair} onClose={() => setSelectedRepair(null)} onSave={handleSaveDiagnosis} />}
            {selectedHistoryRepair && (
                <RepairHistoryModal 
                    repair={selectedHistoryRepair} 
                    onClose={() => setSelectedHistoryRepair(null)} 
                    onDiagnose={(r) => { setSelectedHistoryRepair(null); setSelectedRepair(r); }} 
                />
            )}
        </div>
    );
};

export default PendingRepairs;

