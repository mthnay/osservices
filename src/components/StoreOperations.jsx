import React, { useMemo, useState } from 'react';
import { 
    ChevronRight, AlertCircle, X, MapPin, Activity, Clock, 
    CheckCircle, Award, TrendingUp, Users, Zap, RotateCcw, 
    ArrowUpRight, Target
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
// eslint-disable-next-line no-unused-vars
import { hasPermission } from '../utils/permissions';

const StoreOperations = () => {
    // eslint-disable-next-line no-unused-vars
    const { repairs, allRepairs, servicePoints, technicians, users } = useAppContext();
    const [selectedStoreDetails, setSelectedStoreDetails] = useState(null);

    const storeStatusData = useMemo(() => {
        const sourceRepairs = allRepairs || repairs;
        
        return servicePoints.map(sp => {
            const storeRepairs = sourceRepairs.filter(r => String(r.storeId) === String(sp.id));
            const activeRepairs = storeRepairs.filter(r => !['Tamamlandı', 'Teslim Edildi', 'İptal', 'İade Edildi'].includes(r.status));
            const completedRepairs = storeRepairs.filter(r => ['Tamamlandı', 'Teslim Edildi', 'Cihaz Hazır'].includes(r.status));
            
            // Critical Repairs (Over 14 days or pending diagnosis)
            const criticalRepairs = activeRepairs.filter(r => {
                if (r.status?.includes('Bekliyor')) return true;
                if (!r.date) return false;
                const [d, m, y] = r.date.split(' ')[0].split('.');
                if (!d || !m || !y) return false;
                const repairDate = new Date(y, m - 1, d);
                const daysPass = Math.floor((new Date() - repairDate) / (1000 * 60 * 60 * 24));
                return daysPass > 14; 
            });

            // Performance Metrics
            let totalMinutes = 0;
            let countWithTime = 0;
            completedRepairs.forEach(r => {
                if (r.startedAt && r.completedAt) {
                    const diff = (new Date(r.completedAt) - new Date(r.startedAt)) / (1000 * 60);
                    if (diff > 0) {
                        totalMinutes += diff;
                        countWithTime++;
                    }
                }
            });

            const avgTime = countWithTime > 0 ? Math.round(totalMinutes / countWithTime) : 0;
            const successRate = storeRepairs.length > 0 
                ? Math.round((completedRepairs.length / storeRepairs.length) * 100) 
                : 0;

            const storeTechs = technicians.filter(t => String(t.storeId) === String(sp.id));

            return {
                ...sp,
                pendingCount: activeRepairs.length,
                criticalCount: criticalRepairs.length,
                activeRepairs,
                criticalRepairs,
                completedCount: completedRepairs.length,
                avgTime,
                successRate,
                techCount: storeTechs.length
            };
        }).sort((a,b) => b.pendingCount - a.pendingCount);
    }, [servicePoints, allRepairs, repairs, technicians]);

    const calculateTechStats = (techName, storeRepairs) => {
        const techRepairs = storeRepairs.filter(r => r.technician === techName);
        const completed = techRepairs.filter(r => ['Tamamlandı', 'Teslim Edildi', 'Cihaz Hazır'].includes(r.status));
        
        let totalMin = 0;
        let timeCount = 0;
        completed.forEach(r => {
            if (r.startedAt && r.completedAt) {
                const diff = (new Date(r.completedAt) - new Date(r.startedAt)) / (1000 * 60);
                if (diff > 0) { totalMin += diff; timeCount++; }
            }
        });

        const avg = timeCount > 0 ? Math.round(totalMin / timeCount) : 0;
        const efficiency = techRepairs.length > 0 ? Math.round((completed.length / techRepairs.length) * 100) : 0;

        return { completed: completed.length, avg, efficiency };
    };

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* GSX Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        <span>Yönetim Paneli</span>
                        <ChevronRight size={10} />
                        <span className="text-[#0071e3]">Mağaza Operasyonları</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Global Operasyon İzleme</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center gap-3">
                        <Activity size={16} className="text-green-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Canlı Sistem Aktif</span>
                    </div>
                </div>
            </div>

            {/* Store Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {storeStatusData.map(sp => (
                    <div 
                        key={sp.id} 
                        onClick={() => setSelectedStoreDetails(sp)}
                        className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm hover:border-[#0071e3] hover:shadow-xl hover:shadow-[#0071e3]/5 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        {/* Status Glow */}
                        <div className={`absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-20 -mr-12 -mt-12 transition-colors ${sp.criticalCount > 0 ? 'bg-red-500' : 'bg-[#0071e3]'}`}></div>

                        <div className="flex items-start justify-between mb-8 relative">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] flex items-center justify-center text-[#1d1d1f] group-hover:bg-[#0071e3] group-hover:text-white transition-all">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-[#1d1d1f]">{sp.name}</h4>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ship-To: {sp.shipTo || 'N/A'}</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${sp.criticalCount > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                {sp.criticalCount > 0 ? 'DİKKAT GEREKLİ' : 'OPERASYONEL'}
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-4 bg-[#f5f5f7] rounded-2xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Aktif İş Yükü</p>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-black text-[#1d1d1f]">{sp.pendingCount}</span>
                                    <span className="text-[10px] font-bold text-gray-400 mb-1.5">CİHAZ</span>
                                </div>
                            </div>
                            <div className="p-4 bg-[#f5f5f7] rounded-2xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Verimlilik</p>
                                <div className="flex items-end gap-2">
                                    <span className={`text-2xl font-black ${sp.successRate > 80 ? 'text-green-600' : 'text-orange-500'}`}>%{sp.successRate}</span>
                                    <ArrowUpRight size={16} className={sp.successRate > 80 ? 'text-green-600 mb-1.5' : 'text-orange-500 mb-1.5'} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    {[...Array(Math.min(sp.techCount, 3))].map((_, i) => (
                                        <div key={i} className="w-7 h-7 rounded-full bg-white border-2 border-[#f5f5f7] flex items-center justify-center text-[10px]">👨‍🔧</div>
                                    ))}
                                    {sp.techCount > 3 && <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] font-bold">+{sp.techCount - 3}</div>}
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{sp.techCount} Teknisyen</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[#0071e3] font-bold text-xs">
                                Detaylar <ChevronRight size={14} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Store Details Modal */}
            {selectedStoreDetails && (
                <div className="fixed inset-0 z-[110] bg-[#1d1d1f]/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={() => setSelectedStoreDetails(null)}>
                    <div className="bg-white w-full max-w-5xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col animate-scale-in max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-10 border-b border-gray-100 flex items-center justify-between bg-[#f5f5f7]/50">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[24px] bg-white shadow-sm flex items-center justify-center text-[#0071e3]">
                                    <MapPin size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[#1d1d1f] uppercase tracking-tight">{selectedStoreDetails.name}</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Operasyonel Performans Verileri</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStoreDetails(null)} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-full text-gray-400 hover:text-[#1d1d1f] hover:shadow-md transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-10">
                            {/* Performance Analytics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <Clock size={20} className="text-[#0071e3] mb-4" />
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ort. Onarım Hızı</p>
                                    <p className="text-2xl font-black text-[#1d1d1f] mt-1">{selectedStoreDetails.avgTime} <span className="text-xs text-gray-400">DK</span></p>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <Target size={20} className="text-green-500 mb-4" />
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Başarı Oranı</p>
                                    <p className="text-2xl font-black text-[#1d1d1f] mt-1">%{selectedStoreDetails.successRate}</p>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <Users size={20} className="text-orange-500 mb-4" />
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aktif İş Yükü</p>
                                    <p className="text-2xl font-black text-[#1d1d1f] mt-1">{selectedStoreDetails.pendingCount} <span className="text-xs text-gray-400">CİHAZ</span></p>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <Zap size={20} className="text-purple-500 mb-4" />
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Biten (Ay)</p>
                                    <p className="text-2xl font-black text-[#1d1d1f] mt-1">{selectedStoreDetails.completedCount}</p>
                                </div>
                            </div>

                            {/* Technician Breakdown */}
                            <div className="bg-white rounded-[32px] border border-gray-200 overflow-hidden">
                                <div className="px-8 py-6 bg-[#f5f5f7] border-b border-gray-200 flex justify-between items-center">
                                    <h4 className="text-sm font-black text-[#1d1d1f] uppercase tracking-widest flex items-center gap-2">
                                        <Award size={18} className="text-[#0071e3]" /> Teknisyen Performans Tablosu
                                    </h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-white border-b border-gray-50">
                                                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teknisyen</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Biten İş</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ort. Süre</th>
                                                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Verimlilik</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {technicians.filter(t => String(t.storeId) === String(selectedStoreDetails.id)).map(tech => {
                                                const stats = calculateTechStats(tech.name, allRepairs || repairs);
                                                return (
                                                    <tr key={tech.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-8 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xl">{tech.avatar || '👨‍🔧'}</span>
                                                                <div>
                                                                    <p className="text-xs font-bold text-[#1d1d1f]">{tech.name}</p>
                                                                    <p className="text-[9px] text-gray-400 font-bold uppercase">{tech.specialty}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs font-bold text-[#1d1d1f]">{stats.completed}</td>
                                                        <td className="px-6 py-4 text-xs font-bold text-[#0071e3]">{stats.avg} dk</td>
                                                        <td className="px-8 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-3">
                                                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-[#0071e3] rounded-full" style={{ width: `${stats.efficiency}%` }}></div>
                                                                </div>
                                                                <span className="text-[10px] font-black text-[#1d1d1f]">%{stats.efficiency}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Critical Repairs List */}
                            {selectedStoreDetails.criticalCount > 0 && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                                        <AlertCircle size={18} /> Gecikmiş / Kritik Onarımlar ({selectedStoreDetails.criticalCount})
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedStoreDetails.criticalRepairs.map(r => (
                                            <div key={r.id} className="p-4 bg-red-50 border border-red-100 rounded-2xl flex justify-between items-center group hover:bg-red-100 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-red-600 shadow-sm font-bold text-xs">#{r.id}</div>
                                                    <div>
                                                        <p className="text-xs font-bold text-[#1d1d1f]">{r.device}</p>
                                                        <p className="text-[10px] text-red-500 font-medium">{r.customer}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-bold text-red-400 uppercase">{r.status || 'Bekliyor'}</p>
                                                    <p className="text-[10px] font-black text-red-600 mt-0.5">{r.date?.split(' ')[0]}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoreOperations;
