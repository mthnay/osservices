import React, { useState, useMemo } from 'react';
import { 
    Archive as ArchiveIcon, Search, FileText, User, Calendar, Eye, 
    Download, Filter, CheckCircle, ChevronDown, Store, CalendarDays, 
    CalendarClock, ChevronRight, Activity, Clock, Box, ShieldCheck,
    SearchCode, Database, Globe
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import DeviceImage from './DeviceImage';
import RepairHistoryModal from './RepairHistoryModal';
import BatchExportModal from './BatchExportModal';
import { hasPermission } from '../utils/permissions';

const Archive = () => {
    const { repairs, servicePoints, currentUser, API_URL } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRepair, setSelectedRepair] = useState(null);
    const [showBatchExport, setShowBatchExport] = useState(false);

    const archivedRepairs = useMemo(() => {
        return repairs.filter(r => {
            const isArchived = ['Teslim Edildi', 'İade Edildi', 'Tamamlandı'].includes(r.status);
            if (!isArchived) return false;
            if (!searchTerm.trim()) return true;
            const searchLower = searchTerm.toLowerCase().trim();
            return (
                (r.customer && r.customer.toLowerCase().includes(searchLower)) ||
                (r.id && r.id.toString().toLowerCase().includes(searchLower)) ||
                (r.device && r.device.toLowerCase().includes(searchLower)) ||
                (r.serial && r.serial.toLowerCase().includes(searchLower))
            );
        });
    }, [repairs, searchTerm]);

    const groupedData = useMemo(() => {
        const grouped = {};
        const allowedStores = hasPermission(currentUser, 'view_all_stores')
            ? servicePoints
            : servicePoints.filter(sp => String(sp.id) === String(currentUser?.storeId));

        allowedStores.forEach(sp => { grouped[sp.name] = {}; });

        archivedRepairs.forEach(repair => {
            const store = servicePoints.find(sp => sp.id === repair.storeId);
            const storeName = store ? store.name : 'Genel Arşiv';

            const dateStr = repair.history?.find(h => h.status === 'Teslim Edildi' || h.status === 'İade Edildi')?.date || repair.date || '';
            let year = '2024';
            let month = 'Belirsiz';
            let week = '1. Hafta';

            if (dateStr) {
                const parts = dateStr.split(' ')[0].split('.');
                if (parts.length === 3) {
                    year = parts[2];
                    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                    month = months[parseInt(parts[1], 10) - 1] || 'Ocak';
                    week = `${Math.ceil(parseInt(parts[0], 10) / 7)}. Hafta`;
                }
            }

            if (!grouped[storeName]) grouped[storeName] = {};
            if (!grouped[storeName][year]) grouped[storeName][year] = {};
            if (!grouped[storeName][year][month]) grouped[storeName][year][month] = {};
            if (!grouped[storeName][year][month][week]) grouped[storeName][year][month][week] = [];
            grouped[storeName][year][month][week].push(repair);
        });
        return grouped;
    }, [archivedRepairs, servicePoints, currentUser]);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* GSX Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        <span>Servis Yönetimi</span>
                        <ChevronRight size={10} />
                        <span className="text-[#0071e3]">Cihaz Arşivi</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Servis Kayıt Kütüphanesi</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Müşteri, SN veya Takip No..." 
                            className="pl-10 pr-4 py-2.5 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all outline-none w-64 text-sm font-medium text-[#1d1d1f]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowBatchExport(true)}
                        className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-[#1d1d1f] transition-all shadow-sm flex items-center gap-2 px-4"
                    >
                        <Download size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">Dışa Aktar</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gray-50 text-gray-400">
                        <Database size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Toplam Kayıt</p>
                        <p className="text-xl font-bold text-[#1d1d1f]">{archivedRepairs.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-50 text-green-600">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Başarılı Teslimat</p>
                        <p className="text-xl font-bold text-[#1d1d1f]">{archivedRepairs.filter(r => r.status === 'Teslim Edildi').length}</p>
                    </div>
                </div>
            </div>

            {/* Archive View */}
            <div className="space-y-6">
                {Object.entries(groupedData).map(([storeName, years]) => (
                    <div key={storeName} className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 bg-[#f5f5f7] border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <Store size={20} className="text-[#1d1d1f]" />
                                </div>
                                <div>
                                    <h3 className="font-black text-[#1d1d1f] text-lg uppercase tracking-tight">{storeName}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lokasyon Arşivi</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-black text-gray-500">
                                {Object.values(years).reduce((acc, months) => acc + Object.values(months).reduce((sum, weeks) => sum + Object.values(weeks).flat().length, 0), 0)} KAYIT
                            </span>
                        </div>

                        <div className="p-6 space-y-4">
                            {Object.entries(years).sort((a,b) => b[0] - a[0]).map(([year, months]) => (
                                <details key={year} className="group/year bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm" open>
                                    <summary className="flex items-center justify-between p-4 bg-gray-50/50 cursor-pointer select-none">
                                        <div className="flex items-center gap-3">
                                            <CalendarDays className="text-[#0071e3]" size={18} />
                                            <h4 className="font-bold text-[#1d1d1f]">{year} Dönemi</h4>
                                        </div>
                                        <ChevronDown className="text-gray-300 group-open/year:rotate-180 transition-all" size={18} />
                                    </summary>
                                    
                                    <div className="p-4 space-y-4">
                                        {Object.entries(months).map(([month, weeks]) => (
                                            <div key={month} className="border border-gray-50 rounded-xl overflow-hidden bg-[#fbfbfd]">
                                                <div className="px-4 py-2 border-b border-gray-50 flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-[#1d1d1f] uppercase tracking-widest">{month}</span>
                                                    <span className="text-[9px] font-bold text-gray-400">{Object.values(weeks).flat().length} Teslimat</span>
                                                </div>
                                                
                                                <div className="divide-y divide-gray-50 bg-white">
                                                    {Object.values(weeks).flat().map(repair => (
                                                        <div key={repair.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedRepair(repair)}>
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
                                                                    <DeviceImage image={repair.image} productGroup={repair.productGroup} device={repair.device} apiUrl={API_URL} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-[#1d1d1f]">#{repair.id} • {repair.customer}</p>
                                                                    <p className="text-[10px] text-gray-400 font-medium">{repair.device}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <div className="text-right hidden md:block">
                                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Teslim Tarihi</p>
                                                                    <p className="text-[10px] font-black text-green-600">{repair.history?.find(h => h.status === 'Teslim Edildi' || h.status === 'İade Edildi')?.date?.split(' ')[0] || repair.date?.split(' ')[0]}</p>
                                                                </div>
                                                                <button className="p-2 bg-gray-50 text-gray-400 rounded-lg group-hover:text-[#0071e3] group-hover:bg-blue-50 transition-all">
                                                                    <Eye size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {selectedRepair && <RepairHistoryModal repair={selectedRepair} onClose={() => setSelectedRepair(null)} />}
            {showBatchExport && <BatchExportModal onClose={() => setShowBatchExport(false)} />}
        </div>
    );
};

export default Archive;
