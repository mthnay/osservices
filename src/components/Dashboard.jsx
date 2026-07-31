// eslint-disable-next-line no-unused-vars
import React, { useMemo, useState } from 'react';
import { Clock, AlertCircle, CheckCircle, Package, Activity, TrendingUp, PieChart, ArrowUpRight, ArrowDownRight, MoreHorizontal, Wallet, Users, Zap, LayoutDashboard, Store, X, ChevronRight, ShieldAlert, Wrench, PlusCircle, RefreshCw, Trash2, ArrowLeftRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
// eslint-disable-next-line no-unused-vars
import { hasPermission, ROLES } from '../utils/permissions';

// eslint-disable-next-line no-unused-vars
const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, trend, trendValue }) => (
    <div className="gsx-card p-5 relative group flex flex-col justify-between min-h-[120px]">
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-[13px] font-semibold text-gray-600">{title}</h3>
            <div className={`p-1.5 rounded bg-gray-50 text-gray-500`}>
                <Icon size={16} />
            </div>
        </div>

        <div>
            <h3 className="text-2xl font-bold text-[#1d1d1f]">{value}</h3>
            {trend && (
                <div className={`flex items-center gap-1 text-[11px] font-medium mt-1 ${trend === 'up'
                        ? 'text-[#008000]'
                        : 'text-[#e30000]'
                    }`}>
                    {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {trendValue}
                </div>
            )}
        </div>
    </div>
);

const DonutChart = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0) || 1;
    let accumulatedAngle = 0;

    return (
        <div className="relative w-32 h-32 shrink-0 mx-auto">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                {data.map((item, index) => {
                    const angle = (item.value / total) * 360;
                    if (angle <= 0) return null;

                    const radius = 40;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
                    const strokeDashoffset = -1 * (accumulatedAngle / 360) * circumference;
                    // eslint-disable-next-line react-hooks/immutability
                    accumulatedAngle += angle;

                    return (
                        <circle
                            key={index} cx="50" cy="50" r={radius} fill="transparent"
                            stroke={item.color} strokeWidth="12" strokeLinecap="butt"
                            strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-300"
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-xl font-bold text-[#1d1d1f]">{total > 1 ? total : 0}</span>
                <span className="text-[9px] text-gray-500 uppercase font-medium mt-0.5">Toplam</span>
            </div>
        </div>
    );
};

// Denetim kaydı aksiyonunu görsel stile eşle
const getActivityStyle = (action = '') => {
    const a = action.toUpperCase();
    if (a.startsWith('CREATE') || a === 'STOCK_ADD') {
        return { label: 'Eklendi', icon: PlusCircle, color: 'text-green-600 bg-green-50', dot: 'bg-green-500' };
    }
    if (a.startsWith('DELETE') || a === 'STOCK_USE') {
        return { label: 'Çıkarıldı', icon: Trash2, color: 'text-red-600 bg-red-50', dot: 'bg-red-500' };
    }
    if (a.includes('TRANSFER')) {
        return { label: 'Transfer', icon: ArrowLeftRight, color: 'text-indigo-600 bg-indigo-50', dot: 'bg-indigo-500' };
    }
    if (a.startsWith('UPDATE')) {
        return { label: 'Güncellendi', icon: RefreshCw, color: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' };
    }
    return { label: 'İşlem', icon: Activity, color: 'text-gray-500 bg-gray-50', dot: 'bg-gray-400' };
};

const MODULE_LABELS = {
    REPAIR: 'Servis',
    INVENTORY: 'Stok',
    CUSTOMER: 'Müşteri',
    STORE_MANAGEMENT: 'Mağaza',
    AUTH: 'Oturum'
};

const formatActivityTime = (iso) => {
    if (!iso) return { time: '', date: '' };
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { time: '', date: '' };
    return {
        time: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        date: d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
    };
};

const StoreActivityFeed = ({ activities, showStore }) => {
    if (!activities || activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Activity size={36} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">Henüz veri hareketi bulunmuyor</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-50">
            {activities.map((act, i) => {
                const style = getActivityStyle(act.action);
                const Icon = style.icon;
                const { time, date } = formatActivityTime(act.createdAt);
                const moduleLabel = MODULE_LABELS[act.module] || act.module;
                return (
                    <div key={act._id || i} className="flex gap-3 px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white ${style.color}`}>
                            <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${style.color}`}>{style.label}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{moduleLabel}</span>
                                    {showStore && act.storeName && (
                                        <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                            <Store size={9} /> {act.storeName}
                                        </span>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-[10px] font-bold text-gray-400 block leading-tight">{time}</span>
                                    <span className="text-[8px] font-medium text-gray-300 block">{date}</span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-700 font-medium truncate">{act.details || act.action}</p>
                            {act.userName && act.userName !== 'Sistem' && (
                                <p className="text-[10px] text-gray-400 mt-0.5">{act.userName}</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const Dashboard = () => {
    // eslint-disable-next-line no-unused-vars
    const { repairs, allRepairs, inventory, currentUser, technicians, earnings, servicePoints, allServicePoints, alerts, selectedStoreId, recentActivity } = useAppContext();


    const stats = useMemo(() => {
        const today = new Date();
        const todayStr = today.toLocaleDateString('tr-TR');
        
        // Today's Earnings
        const dailyEarnings = (earnings || [])
            .filter(e => {
                if (!e.date) return false;
                const eDate = new Date(e.date).toLocaleDateString('tr-TR');
                return eDate === todayStr;
            })
            .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        
        // Yesterday's Earnings (for trend)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('tr-TR');
        const yesterdayEarnings = (earnings || [])
            .filter(e => {
                if (!e.date) return false;
                const eDate = new Date(e.date).toLocaleDateString('tr-TR');
                return eDate === yesterdayStr;
            })
            .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        const revenueTrend = dailyEarnings >= yesterdayEarnings ? 'up' : 'down';
        const revenueTrendVal = yesterdayEarnings > 0 
            ? `${Math.round(Math.abs((dailyEarnings - yesterdayEarnings) / yesterdayEarnings) * 100)}%` 
            : (dailyEarnings > 0 ? '100%' : '0%');

        const activeTechs = (technicians || []).filter(t => t.status === 'busy').length;
        
        return {
            activeRepairs: (repairs || []).filter(r => r.status === 'Beklemede' || r.status === 'İşlemde').length,
            completedToday: (repairs || []).filter(r => {
                if (r.status !== 'Tamamlandı' || !r.completedAt) return false;
                return new Date(r.completedAt).toLocaleDateString('tr-TR') === todayStr;
            }).length,
            criticalSla: (repairs || []).filter(r => r.isUrgent && r.status !== 'Tamamlandı').length,
            dailyRevenue: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(dailyEarnings),
            revenueTrend,
            revenueTrendVal,
            techUtilization: Math.round((activeTechs / (technicians?.length || 1)) * 100)
        };
    }, [repairs, earnings, technicians]);

    // Single source of truth for manager-level access - role-string only to avoid async flicker
    const canViewPerformance = useMemo(() => {
        const role = currentUser?.role?.toLowerCase();
        return role === ROLES.SUPER_ADMIN || role === ROLES.STORE_MANAGER || role === ROLES.SERVICE_SUPERVISOR || role === 'admin' || role === ROLES.YONETICI || role === 'servis_sorumlusu' || role === 'servissorumlusu';
    }, [currentUser?.role]);

    const storePerformance = useMemo(() => {
        if (!canViewPerformance) return [];
        return (servicePoints || []).map(sp => {
            const storeRepairs = (repairs || []).filter(r => String(r.storeId) === String(sp.id));
            const storeEarnings = (earnings || []).filter(e => String(e.storeId) === String(sp.id));
            const totalE = storeEarnings.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
            return {
                name: sp.name,
                shipTo: sp.shipTo,
                count: storeRepairs.length,
                revenue: totalE,
                successRate: storeRepairs.length > 0 ? Math.round((storeRepairs.filter(r => r.status === 'Tamamlandı').length / storeRepairs.length) * 100) : 0
            };
        }).sort((a, b) => b.revenue - a.revenue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [servicePoints, repairs, earnings, currentUser]);

    // Mağaza bazlı son eklenen/çıkarılan/güncellenen veriler (AuditLog kaynaklı)
    const storeActivities = useMemo(() => {
        const points = (allServicePoints && allServicePoints.length ? allServicePoints : servicePoints) || [];
        const nameById = new Map(points.map(sp => [String(sp.id), sp.name]));
        return (recentActivity || []).map(act => ({
            ...act,
            storeName: nameById.get(String(act.storeId)) || (act.storeId != null ? `Mağaza ${act.storeId}` : '—')
        }));
    }, [recentActivity, allServicePoints, servicePoints]);

    const recentActivities = useMemo(() => {
        const myStoreId = currentUser?.storeId;
        const allEvents = (repairs || [])
            .filter(r => String(r.storeId) === String(myStoreId))
            .flatMap(r => (r.history || []).map(h => ({
                repairId: r.id,
                device: r.device,
                customer: r.customer,
                ...h
            })));

        return allEvents
            .sort((a, b) => {
                const parseDate = (dStr) => {
                    if (!dStr) return 0;
                    // Handles both "14.05.2026 15:00" and ISO formats
                    const [datePart, timePart] = dStr.split(' ');
                    const [d, m, y] = datePart.split('.');
                    return new Date(`${y}-${m}-${d}T${timePart || '00:00'}`).getTime();
                };
                return parseDate(b.date) - parseDate(a.date);
            })
            .slice(0, 15)
            .map(event => {
                let color = 'text-gray-500 bg-gray-50';
                let icon = Clock;

                if (event.status.includes('Tamamlandı') || event.status.includes('Hazır')) {
                    color = 'text-green-600 bg-green-50';
                    icon = CheckCircle;
                } else if (event.status.includes('İşlemde')) {
                    color = 'text-blue-600 bg-blue-50';
                    icon = Zap;
                } else if (event.status.includes('Kayıt')) {
                    color = 'text-indigo-600 bg-indigo-50';
                    icon = Package;
                } else if (event.status.includes('Onay')) {
                    color = 'text-orange-600 bg-orange-50';
                    icon = AlertCircle;
                }

                return {
                    id: event.repairId,
                    title: event.status,
                    subtitle: `${event.device} - ${event.customer}`,
                    note: event.note,
                    time: event.date.split(' ')[1] || '',
                    date: event.date.split(' ')[0],
                    icon,
                    color
                };
            });
    }, [repairs, currentUser]);

    const deviceDistribution = useMemo(() => {
        const counts = { 'iPhone': 0, 'Mac': 0, 'iPad': 0, 'Diğer': 0 };
        repairs.forEach(r => {
            const d = r.device || '';
            if (d.includes('iPhone')) counts['iPhone']++;
            else if (d.includes('Mac')) counts['Mac']++;
            else if (d.includes('iPad')) counts['iPad']++;
            else counts['Diğer']++;
        });

        return [
            { name: 'iPhone', value: counts['iPhone'], color: '#0071e3' },
            { name: 'Mac', value: counts['Mac'], color: '#1d1d1f' },
            { name: 'iPad', value: counts['iPad'], color: '#86868b' },
            { name: 'Other', value: counts['Diğer'], color: '#d2d2d7' }
        ];
    }, [repairs]);

    const lowStockItems = useMemo(() => {
        return inventory.filter(i => i.quantity <= i.minLevel).slice(0, 3);
    }, [inventory]);

    const { date, time } = {
        date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }),
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight mb-1">
                        Genel Bakış
                    </h1>
                    <p className="text-gray-500 font-medium text-sm">
                        Tekrar Hoş Geldiniz, <span className="text-[#1d1d1f]">{currentUser?.name?.split(' ')[0]}</span>. Mağazanızın bugünkü durumu.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{date}</p>
                        <p className="text-sm font-bold text-[#1d1d1f]">{time}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-100" />
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Clock size={18} />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="AKTİF ONARIMLAR" 
                    value={stats.activeRepairs} 
                    icon={Activity}
                    subtitle="Bekleyen ve işlemde olanlar"
                />
                <StatCard 
                    title="GÜNLÜK HASILAT" 
                    value={stats.dailyRevenue} 
                    icon={Wallet}
                    trend={stats.revenueTrend}
                    trendValue={`${stats.revenueTrendVal} değişim`}
                />
                <StatCard 
                    title="TEKNİSYEN DOLULUĞU" 
                    value={`%${stats.techUtilization}`} 
                    icon={Zap}
                />
                <StatCard 
                    title="BUGÜN TAMAMLANAN" 
                    value={stats.completedToday} 
                    icon={CheckCircle}
                />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Admin Store Comparison OR Recent Activity */}
                    {canViewPerformance ? (
                        <div className="gsx-card overflow-hidden flex flex-col h-full min-h-[560px]">
                            <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white z-20">
                                <h3 className="font-bold text-sm text-gray-900 uppercase tracking-widest">Mağaza Performansları</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Canlı Veri</span>
                                </div>
                            </div>
                            <div className="overflow-auto max-h-[540px] custom-scrollbar">
                                <table className="w-full text-left border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-10 bg-white">
                                        <tr className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                                            <th className="px-6 py-4 border-b border-gray-100">Mağaza</th>
                                            <th className="px-6 py-4 text-center border-b border-gray-100">Hacim</th>
                                            <th className="px-6 py-4 text-right border-b border-gray-100">Ciro</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {storePerformance.map((store, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-900 text-sm">{store.name}</td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-600">{store.count}</td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">{new Intl.NumberFormat('tr-TR').format(store.revenue)} ₺</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="gsx-card overflow-hidden flex flex-col h-full min-h-[560px]">
                            <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white z-20">
                                <h3 className="font-bold text-sm text-gray-900 uppercase tracking-widest">Mağazadaki Son Hareketler</h3>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                        <Activity size={14} />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-6 overflow-auto max-h-[540px] custom-scrollbar">
                                {recentActivities.length > 0 ? recentActivities.map((activity, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white transition-transform group-hover:scale-110 ${activity.color}`}>
                                                <activity.icon size={18} />
                                            </div>
                                            {i !== recentActivities.length - 1 && <div className="w-px h-full bg-gray-100 my-2"></div>}
                                        </div>
                                        <div className="flex-1 pt-1 pb-4">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="text-sm font-bold text-gray-900">{activity.title}</h4>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded uppercase tracking-wider block">{activity.time}</span>
                                                    <span className="text-[8px] font-medium text-gray-300 block mt-0.5">{activity.date}</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-600 mb-1.5 font-medium">{activity.subtitle}</p>
                                            {activity.note && (
                                                <div className="bg-gray-50/50 rounded p-2 border border-gray-100/50 mb-2">
                                                    <p className="text-[11px] text-gray-500 leading-relaxed italic">"{activity.note}"</p>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black px-2 py-0.5 bg-white border border-gray-100 rounded text-gray-400 uppercase tracking-tighter">
                                                    #{activity.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                        <Clock size={40} className="mb-4 opacity-20" />
                                        <p className="text-sm font-medium">Henüz bir hareket bulunmuyor</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Mağaza Hareketleri (Son eklenen / çıkarılan / güncellenen veriler) */}
                    <div className="gsx-card overflow-hidden flex flex-col">
                        <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white">
                            <div>
                                <h3 className="font-bold text-sm text-gray-900 uppercase tracking-widest">Mağaza Hareketleri</h3>
                                <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                    {canViewPerformance ? 'Tüm mağazalarda son eklenen, çıkarılan ve güncellenen veriler' : 'Mağazanızda son eklenen, çıkarılan ve güncellenen veriler'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Canlı</span>
                            </div>
                        </div>
                        <div className="overflow-auto max-h-[520px] custom-scrollbar">
                            <StoreActivityFeed activities={storeActivities} showStore={canViewPerformance} />
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="flex flex-col gap-6">
                    {/* Device Distribution */}
                    <div className="gsx-card p-5">
                        <div className="mb-4">
                            <h3 className="font-semibold text-[13px] text-[#1d1d1f]">
                                Cihaz Dağılımı
                            </h3>
                        </div>

                        {repairs.length > 0 ? (
                            <div className="flex flex-col items-center">
                                <DonutChart data={deviceDistribution} />
                                <div className="mt-6 w-full space-y-2">
                                    {deviceDistribution.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-[13px]">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                                                <span className="text-gray-600">{item.name}</span>
                                            </div>
                                            <span className="font-medium text-gray-900">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 text-[13px] py-8">Yeterli veri bulunamadı.</div>
                        )}
                    </div>

                    {/* Low Stock */}
                    <div className="gsx-card p-5">
                        <h3 className="font-semibold text-[13px] text-[#1d1d1f] mb-4">
                            Kritik Stok Uyarıları
                        </h3>
                        <div className="space-y-4">
                            {lowStockItems.length > 0 ? lowStockItems.map(item => (
                                <div key={item.id}>
                                    <div className="flex justify-between items-center text-[12px] mb-1.5">
                                        <span className="text-gray-800 font-medium">{item.name}</span>
                                        <span className="text-[#e30000]">{item.quantity} left</span>
                                    </div>
                                    <div className="w-full bg-[#e8e8ed] h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-[#e30000] h-full rounded-full"
                                            style={{ width: `${Math.min((item.quantity / item.minLevel) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-[12px] text-gray-500">
                                    Tüm stok seviyeleri optimal durumda.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal removed */}
        </div>
    );
};

export default Dashboard;
