import React, { useState, useMemo } from 'react';
import { 
    BarChart2, Smile, Star, Users, Award, Calendar, 
    ChevronDown, Download, Heart, MessageSquare, 
    AlertTriangle, Clock, TrendingUp, DollarSign, 
    PieChart, Wallet, ShoppingCart, ArrowUpRight, 
    ArrowDownRight, MapPin, Briefcase
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Reports = () => {
    // eslint-disable-next-line no-unused-vars
    const { repairs, allTechnicians, earnings, servicePoints, allRepairs } = useAppContext();
    // eslint-disable-next-line no-unused-vars
    const [timeRange, setTimeRange] = useState('monthly');
    const [activeTab, setActiveTab] = useState('performance'); // 'performance' or 'financial'

    // --- FINANCIAL CALCULATIONS ---
    const financialStats = useMemo(() => {
        const totalRevenue = earnings.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        
        // Mock cost calculation (40% of revenue for parts, 10% for overhead)
        const totalCost = earnings.reduce((acc, curr) => {
            const cost = curr.type === 'Part' ? curr.amount * 0.6 : curr.amount * 0.2;
            return acc + cost;
        }, 0);
        
        const totalProfit = totalRevenue - totalCost;
        const totalTax = totalRevenue * 0.20; // 20% KDV

        // Revenue by Store
        const storeRevenue = servicePoints.map(sp => {
            const amount = earnings
                .filter(e => String(e.storeId) === String(sp.id))
                .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
            return { name: sp.name, value: amount };
        }).sort((a,b) => b.value - a.value);

        // Revenue by Category (Derived from repairs linked to earnings)
        const catMap = {};
        earnings.forEach(e => {
            const repair = allRepairs.find(r => r.id === e.repairId);
            const cat = repair?.productGroup || 'Diğer';
            catMap[cat] = (catMap[cat] || 0) + (Number(e.amount) || 0);
        });
        const categoryRevenue = Object.entries(catMap).map(([name, value]) => ({ name, value }));

        // Monthly Trend (Last 6 months mock)
        const monthlyTrend = [
            { label: 'Oca', value: totalRevenue * 0.8 },
            { label: 'Şub', value: totalRevenue * 0.85 },
            { label: 'Mar', value: totalRevenue * 0.95 },
            { label: 'Nis', value: totalRevenue * 0.9 },
            { label: 'May', value: totalRevenue },
        ];

        return {
            totalRevenue,
            totalProfit,
            totalTax,
            storeRevenue,
            categoryRevenue,
            monthlyTrend
        };
    }, [earnings, servicePoints, allRepairs]);

    // --- PERFORMANCE CALCULATIONS (Existing) ---
    const stats = useMemo(() => {
        const totalRepairCount = repairs.length;
        const completedRepairs = repairs.filter(r => ['Tamamlandı', 'Teslim Edildi', 'Cihaz Hazır'].includes(r.status)).length;
        const feedbackRepairs = repairs.filter(r => r.feedback && r.feedback.score);
        const totalScore = feedbackRepairs.reduce((acc, r) => acc + (r.feedback.score || 0), 0);
        const avgRating = feedbackRepairs.length > 0 ? (totalScore / feedbackRepairs.length).toFixed(1) : '5.0';
        
        const promoters = feedbackRepairs.filter(r => r.feedback.score >= 4).length;
        const detractors = feedbackRepairs.filter(r => r.feedback.score <= 2).length;
        const npsScore = feedbackRepairs.length > 0 ? Math.round(((promoters - detractors) / feedbackRepairs.length) * 100) : 100;

        const serials = {};
        repairs.forEach(r => { if (r.serial) serials[r.serial] = (serials[r.serial] || 0) + 1; });
        const reRepairCount = Object.values(serials).filter(count => count > 1).length;
        const reRepairRate = totalRepairCount > 0 ? Math.round((reRepairCount / totalRepairCount) * 100) : 0;

        return { totalRepairCount, completedRepairs, avgRating, npsScore, reRepairRate };
    }, [repairs]);

    return (
        <div className="space-y-8 pb-24 animate-fade-in">
            {/* GSX Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-4 border-b border-gray-100 mb-6">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        <span>Yönetim</span>
                        <ChevronDown size={10} />
                        <span className="text-[#0071e3]">Analiz & Raporlar</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Kurumsal Raporlama Merkezi</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-[#f5f5f7] p-1 rounded-xl border border-gray-200">
                        <button 
                            onClick={() => setActiveTab('performance')}
                            className={`px-6 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${activeTab === 'performance' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Performans
                        </button>
                        <button 
                            onClick={() => setActiveTab('financial')}
                            className={`px-6 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${activeTab === 'financial' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Finansal
                        </button>
                    </div>
                    <button className="h-10 px-4 bg-[#1d1d1f] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-black/10">
                        <Download size={16} /> DIŞA AKTAR
                    </button>
                </div>
            </div>

            {activeTab === 'performance' ? (
                <>
                    {/* Performance Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm relative overflow-hidden group hover:border-[#0071e3] transition-all">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 opacity-50 group-hover:bg-[#0071e3]/10 transition-colors"></div>
                            <Star size={24} className="text-[#0071e3] mb-6" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Müşteri Memnuniyeti</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-4xl font-black text-[#1d1d1f]">{stats.avgRating}</h3>
                                <span className="text-xs text-gray-400 font-bold">/ 5.0</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={10} className={i <= Math.round(stats.avgRating) ? "fill-[#0071e3] text-[#0071e3]" : "text-gray-200"} />)}
                                </div>
                                <span className="text-[10px] font-bold text-green-600 uppercase">NPS: {stats.npsScore}</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm group hover:border-orange-500 transition-all">
                            <Clock size={24} className="text-orange-500 mb-6" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Operasyonel Verimlilik</p>
                            <h3 className="text-4xl font-black text-[#1d1d1f]">{stats.completedRepairs} <span className="text-xs text-gray-400">TESLİMAT</span></h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-tighter flex items-center gap-1">
                                <ArrowUpRight size={12} className="text-green-500" /> Toplam {stats.totalRepairCount} Kayıttan
                            </p>
                        </div>

                        <div className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm group hover:border-red-500 transition-all">
                            <AlertTriangle size={24} className="text-red-500 mb-6" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Kalite Kontrol (Re-Repair)</p>
                            <h3 className="text-4xl font-black text-[#1d1d1f]">%{stats.reRepairRate}</h3>
                            <p className="text-[10px] text-red-500 font-bold mt-4 uppercase tracking-tighter">Tekrarlanan Onarım Oranı</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8">Günlük Hizmet Kalitesi Trendi</h3>
                            <div className="h-64">
                                <ReportChart data={[
                                    { label: 'Pzt', value: 85 }, { label: 'Sal', value: 92 }, { label: 'Çar', value: 78 },
                                    { label: 'Per', value: 95 }, { label: 'Cum', value: 88 }, { label: 'Cmt', value: 98 }, { label: 'Paz', value: 90 }
                                ]} color="#0071e3" />
                            </div>
                        </div>
                        <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8">Puan Dağılım Analizi</h3>
                            <div className="space-y-6">
                                {[5,4,3,2,1].map(star => (
                                    <div key={star} className="flex items-center gap-4">
                                        <span className="text-[10px] font-bold text-gray-400 w-12 uppercase">{star} YILDIZ</span>
                                        <div className="flex-1 h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#0071e3] rounded-full" style={{ width: `${star === 5 ? 75 : star === 4 ? 15 : 5}%` }}></div>
                                        </div>
                                        <span className="text-[10px] font-black text-[#1d1d1f]">%{star === 5 ? 75 : star === 4 ? 15 : 5}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Financial Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-[#1d1d1f] rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-16 -mt-16"></div>
                            <DollarSign size={24} className="text-blue-400 mb-6" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Toplam Ciro</p>
                            <h3 className="text-3xl font-black italic">₺{financialStats.totalRevenue.toLocaleString('tr-TR')}</h3>
                            <p className="text-[10px] text-green-400 font-bold mt-4 uppercase flex items-center gap-1">
                                <ArrowUpRight size={12} /> Geçen Aya Göre %12 Artış
                            </p>
                        </div>

                        <div className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm group hover:border-green-500 transition-all">
                            <TrendingUp size={24} className="text-green-500 mb-6" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net Kâr (Tahmini)</p>
                            <h3 className="text-3xl font-black text-[#1d1d1f]">₺{financialStats.totalProfit.toLocaleString('tr-TR')}</h3>
                            <div className="mt-4 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500" style={{ width: '65%' }}></div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm group hover:border-purple-500 transition-all">
                            <Wallet size={24} className="text-purple-500 mb-6" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">KDV Toplamı (%20)</p>
                            <h3 className="text-3xl font-black text-[#1d1d1f]">₺{financialStats.totalTax.toLocaleString('tr-TR')}</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase">Yasal Vergi Yükümlülüğü</p>
                        </div>

                        <div className="bg-white rounded-[32px] p-8 border border-gray-200 shadow-sm group hover:border-orange-500 transition-all">
                            <ShoppingCart size={24} className="text-orange-500 mb-6" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ort. Onarım Başına</p>
                            <h3 className="text-3xl font-black text-[#1d1d1f]">₺{Math.round(financialStats.totalRevenue / (repairs.length || 1)).toLocaleString('tr-TR')}</h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase">Birim Başına Ciro</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
                        {/* Revenue Chart */}
                        <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm">
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Ciro Gelişim Trendi</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-[#0071e3]"></div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Gelir</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-72">
                                <ReportChart data={financialStats.monthlyTrend} color="#0071e3" />
                            </div>
                        </div>

                        {/* Store Revenue Breakdown */}
                        <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm flex flex-col">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-8">Mağaza Bazlı Ciro Dağılımı</h3>
                            <div className="flex-1 space-y-6">
                                {financialStats.storeRevenue.map((sp, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <MapPin size={12} className="text-gray-400" />
                                                <span className="text-xs font-bold text-[#1d1d1f]">{sp.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-[#1d1d1f]">₺{sp.value.toLocaleString('tr-TR')}</span>
                                        </div>
                                        <div className="h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: `${(sp.value / (financialStats.totalRevenue || 1)) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Category Analysis */}
                    <div className="bg-white rounded-[32px] border border-gray-200 p-10 shadow-sm">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="p-3 bg-[#f5f5f7] rounded-xl text-[#0071e3]">
                                <PieChart size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#1d1d1f]">Ürün Grubu Analizi</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Hangi ürün grubu daha çok kazandırıyor?</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-8">
                            {financialStats.categoryRevenue.map((cat, idx) => (
                                <div key={idx} className="p-6 bg-[#f5f5f7] rounded-[24px] border border-transparent hover:border-[#0071e3] hover:bg-white transition-all group">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 group-hover:text-[#0071e3]">{cat.name}</p>
                                    <h4 className="text-xl font-black text-[#1d1d1f]">₺{cat.value.toLocaleString('tr-TR')}</h4>
                                    <div className="mt-4 text-[9px] font-bold text-gray-400 uppercase flex items-center justify-between">
                                        <span>Pazar Payı</span>
                                        <span className="text-[#1d1d1f]">%{Math.round((cat.value / (financialStats.totalRevenue || 1)) * 100)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const ReportChart = ({ data, color }) => {
    return (
        <div className="flex items-end justify-between w-full h-full gap-4 px-2">
            {data.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute top-0 -translate-y-full mb-2 bg-[#1d1d1f] text-white text-[10px] px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 z-10 font-bold shadow-xl border border-white/10 pointer-events-none">
                        {item.value.toLocaleString('tr-TR')}
                    </div>
                    {/* Bar */}
                    <div
                        className="w-full rounded-2xl transition-all duration-700 ease-out relative overflow-hidden group-hover:shadow-[0_10px_30px_rgba(0,113,227,0.2)]"
                        style={{ 
                            height: `${(item.value / (Math.max(...data.map(d => d.value)) || 1)) * 90}%`,
                            backgroundColor: color,
                            opacity: 0.15 + (idx / data.length) * 0.85
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>
                    {/* Label */}
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                        {item.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default Reports;
