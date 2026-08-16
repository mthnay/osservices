import React, { useState, useMemo } from 'react';
import { 
    Search, Filter, Clock, CheckCircle, AlertCircle, Play, MoreVertical, 
    User, Phone, Wrench, Truck, Package, ChevronRight, Calendar, 
    Save, ArrowRight, Zap, Box, Eye, Activity, ClipboardList, 
    PackageSearch, MapPin, Globe, Share2, Info
} from 'lucide-react';
import TechnicianWorkspace from './TechnicianWorkspace';
import SwapWorkspace from './SwapWorkspace';
import AppleLogisticsModal from './AppleLogisticsModal';
import RepairHistoryModal from './RepairHistoryModal';
import PartArrivalModal from './PartArrivalModal';
import { useAppContext } from '../context/AppContext';
import DeviceImage from './DeviceImage';

const StatusBadge = ({ status }) => {
    const config = {
        'Beklemede': 'bg-[#f5f5f7] text-[#1d1d1f] border-gray-200',
        'İnceleniyor': 'bg-[#e8f2ff] text-[#0071e3] border-[#0071e3]/10',
        'Parça Bekleniyor': 'bg-[#fff4e5] text-[#b25e00] border-[#b25e00]/10',
        'Onarımda': 'bg-[#f2e8ff] text-[#8e24aa] border-[#8e24aa]/10',
        'İşlemde': 'bg-[#f2e8ff] text-[#8e24aa] border-[#8e24aa]/10',
        'Cihaz Hazır': 'bg-[#e6f4ea] text-[#1e7e34] border-[#1e7e34]/10',
        'Transferde': 'bg-indigo-50 text-indigo-700 border-indigo-100',
        "Apple'a Gönderildi": 'bg-purple-50 text-purple-700 border-purple-100',
    };
    const style = config[status] || 'bg-gray-100 text-gray-600 border-gray-200';
    return (
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${style} uppercase tracking-tight whitespace-nowrap`}>
            {status}
        </span>
    );
};

const RepairCenter = ({ type, setActiveTab }) => {
    const { repairs, API_URL, searchQuery, setSearchQuery } = useAppContext();

    const [activeRepairId, setActiveRepairId] = useState(null);
    const [logisticsModalId, setLogisticsModalId] = useState(null);
    const [selectedHistoryRepair, setSelectedHistoryRepair] = useState(null);
    const [showPartArrivalId, setShowPartArrivalId] = useState(null);

    const filteredRepairs = useMemo(() => {
        return repairs.filter(r => {
            const matchesSearch = !searchQuery || 
                (r.device?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 r.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 r.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 r.serial?.toLowerCase().includes(searchQuery.toLowerCase()));
            
            if (!matchesSearch) return false;

            if (type === 'in-store') {
                return r.type !== 'apple-center' && 
                       !['Beklemede', 'Tamamlandı', 'Teslim Edildi', 'Cihaz Hazır', 'Müşteri Onayı Bekliyor', 'İade Hazır', 'İade Edildi', 'Transferde'].includes(r.status);
            }
            if (type === 'apple-center') {
                const terminalStatuses = ['Tamamlandı', 'Teslim Edildi', 'Cihaz Hazır', 'İade Hazır', 'İade Edildi'];
                return (r.type === 'apple-center' || r.status === "Apple'a Gönderildi") && !terminalStatuses.includes(r.status);
            }
            return true;
        });
    }, [repairs, searchQuery, type]);

    const stats = useMemo(() => ({
        active: filteredRepairs.length,
        urgent: filteredRepairs.filter(r => r.priority === 'High' || r.status === 'Parça Bekleniyor').length,
        processing: filteredRepairs.filter(r => r.status === 'İşlemde' || r.status === 'Onarımda').length,
        avgDays: 2.4 // Mock
    }), [filteredRepairs]);

    const handleManageRepair = (repairId) => {
        if (type === 'in-store') {
            setActiveRepairId(repairId);
        } else if (type === 'apple-center') {
            setLogisticsModalId(repairId);
        }
    };

    return (
        <div className="page-shell space-y-6 animate-fade-in">
            {/* GSX Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        <span>Onarım Yönetimi</span>
                        <ChevronRight size={10} />
                        <span className="text-[#0071e3]">{type === 'in-store' ? 'Mağaza İçi Servis' : 'Apple Lojistik Merkezi'}</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">
                        {type === 'in-store' ? 'Teknik Servis Masası' : 'Cihaz Lojistik & Takip'}
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Kayıt, seri no veya müşteri..." 
                            className="pl-10 pr-4 py-2.5 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all outline-none w-64 text-sm font-medium text-[#1d1d1f]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: type === 'in-store' ? 'Aktif Onarım' : 'Bekleyen Lojistik', value: stats.active, icon: Activity, color: 'text-[#0071e3]' },
                    { label: 'Kritik Durum', value: stats.urgent, icon: AlertCircle, color: 'text-[#e30000]' },
                    { label: 'İşlem Başlatılan', value: stats.processing, icon: Play, color: 'text-[#8e24aa]' },
                    { label: 'Ort. İşlem Süresi', value: stats.avgDays + ' Gün', icon: Clock, color: 'text-gray-400' }
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

            {/* Service Queue Table — yalnızca bu alan kayar, başlık ve özetler sabit kalır */}
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                <div className="page-scroll overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-[#f5f5f7] border-b border-gray-200">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kayıt Bilgisi</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cihaz & Müşteri</th>
                                {type === 'apple-center' ? (
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lojistik Verileri</th>
                                ) : (
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Atanan Teknisyen</th>
                                )}
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Durum</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRepairs.map(repair => (
                                <tr key={repair.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedHistoryRepair(repair)}>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-[#1d1d1f] flex items-center gap-2">
                                                #{repair.id}
                                                {repair.priority === 'High' && <Zap size={14} className="text-orange-500 fill-orange-500" />}
                                            </span>
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
                                        {type === 'apple-center' ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                                    <Truck size={10} className="text-purple-500" /> {repair.shipmentCode || 'Takip No Bekleniyor'}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                                    <Globe size={10} /> {repair.appleRepairId || 'GSX ID Yok'}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-50 text-[#0071e3] flex items-center justify-center text-[10px] font-black border border-blue-100 shadow-sm">
                                                    {(repair.technician || 'A').charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[11px] font-bold text-gray-600">{repair.technician || 'Atama Bekliyor'}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5">
                                        <StatusBadge status={repair.status} />
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleManageRepair(repair.id); }}
                                            className="px-4 py-1.5 bg-[#1d1d1f] hover:bg-black text-white text-[10px] font-bold rounded-lg transition-all shadow-md active:scale-95"
                                        >
                                            YÖNET
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
                            <p className="text-sm text-gray-500">Bu bölümde aktif bir servis kaydı bulunmuyor.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {activeRepairId && (() => {
                const activeRepair = repairs.find(r => r.id === activeRepairId);
                if (!activeRepair) return null;
                return activeRepair.serviceType === 'exchange' ? (
                    <SwapWorkspace repairId={activeRepairId} onClose={() => setActiveRepairId(null)} setActiveTab={setActiveTab} />
                ) : (
                    <TechnicianWorkspace repairId={activeRepairId} onClose={() => setActiveRepairId(null)} setActiveTab={setActiveTab} />
                );
            })()}

            {logisticsModalId && <AppleLogisticsModal repairId={logisticsModalId} onClose={() => setLogisticsModalId(null)} />}
            {selectedHistoryRepair && <RepairHistoryModal repair={selectedHistoryRepair} onClose={() => setSelectedHistoryRepair(null)} />}
            {showPartArrivalId && <PartArrivalModal repairId={showPartArrivalId} onClose={() => setShowPartArrivalId(null)} />}
        </div>
    );
};

export default RepairCenter;

