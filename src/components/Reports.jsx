import React, { useState, useMemo } from 'react';
import {
    BarChart2, Smile, Star, Users, Award, Calendar,
    ChevronDown, Download, Heart, MessageSquare,
    AlertTriangle, Clock, TrendingUp, DollarSign,
    PieChart, Wallet, ShoppingCart, ArrowUpRight,
    ArrowDownRight, MapPin, Briefcase, Meh, Frown, Save, Store
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { hasPermission } from '../utils/permissions';

// Memnuniyet yüzdesine göre renk (>=90 yeşil, 80-90 sarı, <80 kırmızı)
const getSatisfactionTheme = (pct) => {
    if (pct === null || pct === undefined) return { text: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', bar: 'bg-gray-300', label: '—' };
    if (pct >= 90) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500', label: 'İYİ' };
    if (pct >= 80) return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500', label: 'DİKKAT' };
    return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-500', label: 'KRİTİK' };
};

const calcRate = (s, n, d) => {
    const total = (Number(s) || 0) + (Number(n) || 0) + (Number(d) || 0);
    if (total === 0) return null;
    return Math.round(((Number(s) || 0) / total) * 100);
};

const Reports = () => {
    // eslint-disable-next-line no-unused-vars
    const { repairs, allTechnicians, earnings, servicePoints, allRepairs, currentUser, visibleServicePoints, satisfactionEntries, addSatisfactionEntry, showToast, selectedStoreId } = useAppContext();
    // eslint-disable-next-line no-unused-vars
    const [timeRange, setTimeRange] = useState('monthly');
    const [activeTab, setActiveTab] = useState('performance'); // 'performance' | 'financial' | 'satisfaction'

    const canViewAllStores = hasPermission(currentUser, 'view_all_stores');
    const todayKey = new Date().toISOString().slice(0, 10);

    // Memnuniyet giriş formu
    const [satForm, setSatForm] = useState({
        storeId: (selectedStoreId && selectedStoreId !== 0) ? selectedStoreId : (currentUser?.storeId || ''),
        date: todayKey,
        satisfied: '',
        neutral: '',
        dissatisfied: ''
    });
    const [savingSat, setSavingSat] = useState(false);

    const liveRate = calcRate(satForm.satisfied, satForm.neutral, satForm.dissatisfied);
    const liveTheme = getSatisfactionTheme(liveRate);

    const handleSaveSatisfaction = async () => {
        const store = canViewAllStores ? satForm.storeId : (currentUser?.storeId || '');
        if (!store || Number(store) === 0) {
            showToast('Lütfen mağaza seçin.', 'warning');
            return;
        }
        if (!satForm.date) {
            showToast('Lütfen tarih seçin.', 'warning');
            return;
        }
        const total = (Number(satForm.satisfied) || 0) + (Number(satForm.neutral) || 0) + (Number(satForm.dissatisfied) || 0);
        if (total === 0) {
            showToast('En az bir müşteri adedi girmelisiniz.', 'warning');
            return;
        }
        setSavingSat(true);
        const ok = await addSatisfactionEntry({
            storeId: Number(store),
            date: satForm.date,
            satisfied: Number(satForm.satisfied) || 0,
            neutral: Number(satForm.neutral) || 0,
            dissatisfied: Number(satForm.dissatisfied) || 0
        });
        setSavingSat(false);
        if (ok) {
            showToast('Günlük memnuniyet verisi kaydedildi.', 'success');
            setSatForm(f => ({ ...f, satisfied: '', neutral: '', dissatisfied: '' }));
        }
    };

    // Memnuniyet özeti (dönem geneli + mağaza bazlı)
    const satisfactionSummary = useMemo(() => {
        const list = satisfactionEntries || [];
        const totals = list.reduce((acc, e) => {
            acc.s += e.satisfied || 0; acc.n += e.neutral || 0; acc.d += e.dissatisfied || 0;
            return acc;
        }, { s: 0, n: 0, d: 0 });
        const overallRate = calcRate(totals.s, totals.n, totals.d);

        // Mağaza bazlı ortalama
        const byStore = {};
        list.forEach(e => {
            if (!byStore[e.storeId]) byStore[e.storeId] = { s: 0, n: 0, d: 0 };
            byStore[e.storeId].s += e.satisfied || 0;
            byStore[e.storeId].n += e.neutral || 0;
            byStore[e.storeId].d += e.dissatisfied || 0;
        });
        const storeRates = Object.entries(byStore).map(([sid, t]) => ({
            storeId: sid,
            name: servicePoints.find(sp => String(sp.id) === String(sid))?.name || `Mağaza ${sid}`,
            rate: calcRate(t.s, t.n, t.d),
            total: t.s + t.n + t.d
        })).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

        return { totals, overallRate, storeRates };
    }, [satisfactionEntries, servicePoints]);

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
        <div className="page-scroll space-y-8 animate-fade-in pr-1">
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
                        <button
                            onClick={() => setActiveTab('satisfaction')}
                            className={`px-6 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${activeTab === 'satisfaction' ? 'bg-white text-[#1d1d1f] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Memnuniyet
                        </button>
                    </div>
                    <button className="h-10 px-4 bg-[#1d1d1f] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-black/10">
                        <Download size={16} /> DIŞA AKTAR
                    </button>
                </div>
            </div>

            {activeTab === 'performance' && (
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
            )}

            {activeTab === 'financial' && (
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

            {activeTab === 'satisfaction' && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
                        {/* Veri Girişi */}
                        <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-[#f5f5f7] rounded-xl text-[#0071e3]"><Smile size={24} /></div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#1d1d1f]">Günlük Memnuniyet Girişi</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Kendi mağazanızın günlük verisi</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Mağaza</label>
                                    {canViewAllStores ? (
                                        <select
                                            className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm font-semibold text-[#1d1d1f] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 focus:border-[#0071e3] outline-none transition-all appearance-none"
                                            value={satForm.storeId}
                                            onChange={(e) => setSatForm({ ...satForm, storeId: e.target.value })}
                                        >
                                            <option value="">Mağaza Seçiniz...</option>
                                            {visibleServicePoints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    ) : (
                                        <div className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
                                            <Store size={14} className="text-gray-400" />
                                            {servicePoints.find(s => String(s.id) === String(currentUser?.storeId))?.name || 'Mağazanız'}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tarih</label>
                                    <input
                                        type="date" max={todayKey}
                                        className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm font-semibold text-[#1d1d1f] focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 focus:border-[#0071e3] outline-none transition-all"
                                        value={satForm.date}
                                        onChange={(e) => setSatForm({ ...satForm, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                {[
                                    { key: 'satisfied', label: 'Memnun', icon: Smile, color: 'text-emerald-600', ring: 'focus:ring-emerald-500/20 focus:border-emerald-500' },
                                    { key: 'neutral', label: 'Nötr', icon: Meh, color: 'text-amber-600', ring: 'focus:ring-amber-500/20 focus:border-amber-500' },
                                    { key: 'dissatisfied', label: 'Memnun Değil', icon: Frown, color: 'text-red-600', ring: 'focus:ring-red-500/20 focus:border-red-500' }
                                ].map(f => (
                                    <div key={f.key} className="bg-[#f5f5f7] rounded-2xl p-4 border border-gray-100">
                                        <div className={`flex items-center gap-1.5 mb-2 ${f.color}`}>
                                            <f.icon size={16} />
                                            <span className="text-[10px] font-bold uppercase tracking-tight">{f.label}</span>
                                        </div>
                                        <input
                                            type="number" min="0" placeholder="0"
                                            className={`w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-2xl font-black text-[#1d1d1f] outline-none transition-all ${f.ring}`}
                                            value={satForm[f.key]}
                                            onChange={(e) => setSatForm({ ...satForm, [f.key]: e.target.value })}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className={`flex items-center justify-between p-4 rounded-2xl border ${liveTheme.bg} ${liveTheme.border} mb-6`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hesaplanan Memnuniyet</span>
                                    {liveRate !== null && <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${liveTheme.bg} ${liveTheme.text} border ${liveTheme.border}`}>{liveTheme.label}</span>}
                                </div>
                                <span className={`text-3xl font-black ${liveTheme.text}`}>{liveRate !== null ? `%${liveRate}` : '—'}</span>
                            </div>

                            <button
                                onClick={handleSaveSatisfaction}
                                disabled={savingSat}
                                className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-[#0071e3]/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Save size={18} /> {savingSat ? 'Kaydediliyor...' : 'Günlük Veriyi Kaydet'}
                            </button>
                            <p className="text-[10px] text-gray-400 font-medium mt-3 text-center">Aynı gün için tekrar kayıt, o günün verisini günceller. Eşik: %90 altı sarı, %80 altı kırmızı.</p>
                        </div>

                        {/* Dönem Özeti */}
                        <div className="flex flex-col gap-6">
                            <div className={`rounded-[32px] p-8 border shadow-sm ${getSatisfactionTheme(satisfactionSummary.overallRate).bg} ${getSatisfactionTheme(satisfactionSummary.overallRate).border}`}>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                                    {canViewAllStores ? 'Genel Memnuniyet (Tüm Kayıtlar)' : 'Mağaza Memnuniyeti (Dönem)'}
                                </p>
                                <div className="flex items-baseline gap-3">
                                    <h3 className={`text-5xl font-black ${getSatisfactionTheme(satisfactionSummary.overallRate).text}`}>
                                        {satisfactionSummary.overallRate !== null ? `%${satisfactionSummary.overallRate}` : '—'}
                                    </h3>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase border ${getSatisfactionTheme(satisfactionSummary.overallRate).text} ${getSatisfactionTheme(satisfactionSummary.overallRate).border}`}>
                                        {getSatisfactionTheme(satisfactionSummary.overallRate).label}
                                    </span>
                                </div>
                                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                                    <div><p className="text-lg font-black text-emerald-600">{satisfactionSummary.totals.s}</p><p className="text-[9px] font-bold text-gray-400 uppercase">Memnun</p></div>
                                    <div><p className="text-lg font-black text-amber-600">{satisfactionSummary.totals.n}</p><p className="text-[9px] font-bold text-gray-400 uppercase">Nötr</p></div>
                                    <div><p className="text-lg font-black text-red-600">{satisfactionSummary.totals.d}</p><p className="text-[9px] font-bold text-gray-400 uppercase">Memnun Değil</p></div>
                                </div>
                            </div>

                            {canViewAllStores && satisfactionSummary.storeRates.length > 0 && (
                                <div className="bg-white rounded-[32px] border border-gray-200 p-6 shadow-sm">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5">Mağaza Bazlı Memnuniyet</h3>
                                    <div className="space-y-4">
                                        {satisfactionSummary.storeRates.map(sr => {
                                            const t = getSatisfactionTheme(sr.rate);
                                            return (
                                                <div key={sr.storeId} className="space-y-1.5">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-[#1d1d1f] flex items-center gap-1.5"><MapPin size={11} className="text-gray-400" /> {sr.name}</span>
                                                        <span className={`text-xs font-black ${t.text}`}>{sr.rate !== null ? `%${sr.rate}` : '—'}</span>
                                                    </div>
                                                    <div className="h-2 bg-[#f5f5f7] rounded-full overflow-hidden">
                                                        <div className={`h-full ${t.bar} rounded-full transition-all`} style={{ width: `${sr.rate || 0}%` }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Geçmiş Kayıtlar */}
                    <div className="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Günlük Memnuniyet Geçmişi</h3>
                            <span className="text-[10px] font-bold text-gray-400">{(satisfactionEntries || []).length} kayıt</span>
                        </div>
                        <div className="overflow-x-auto max-h-[420px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-[#f5f5f7] text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">Tarih</th>
                                        {canViewAllStores && <th className="px-6 py-4">Mağaza</th>}
                                        <th className="px-6 py-4 text-center">Memnun</th>
                                        <th className="px-6 py-4 text-center">Nötr</th>
                                        <th className="px-6 py-4 text-center">Memnun Değil</th>
                                        <th className="px-6 py-4 text-center">Toplam</th>
                                        <th className="px-6 py-4 text-right">Memnuniyet</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(satisfactionEntries || []).map((e) => {
                                        const total = (e.satisfied || 0) + (e.neutral || 0) + (e.dissatisfied || 0);
                                        const rate = calcRate(e.satisfied, e.neutral, e.dissatisfied);
                                        const t = getSatisfactionTheme(rate);
                                        return (
                                            <tr key={e._id || `${e.storeId}-${e.date}`} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="px-6 py-4 text-sm font-bold text-[#1d1d1f]">{new Date(e.date).toLocaleDateString('tr-TR')}</td>
                                                {canViewAllStores && <td className="px-6 py-4 text-xs font-semibold text-gray-500">{servicePoints.find(s => String(s.id) === String(e.storeId))?.name || `Mağaza ${e.storeId}`}</td>}
                                                <td className="px-6 py-4 text-center text-sm font-bold text-emerald-600">{e.satisfied || 0}</td>
                                                <td className="px-6 py-4 text-center text-sm font-bold text-amber-600">{e.neutral || 0}</td>
                                                <td className="px-6 py-4 text-center text-sm font-bold text-red-600">{e.dissatisfied || 0}</td>
                                                <td className="px-6 py-4 text-center text-sm font-black text-[#1d1d1f]">{total}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-lg border ${t.bg} ${t.text} ${t.border}`}>
                                                        {rate !== null ? `%${rate}` : '—'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {(satisfactionEntries || []).length === 0 && (
                                <div className="py-16 text-center">
                                    <Smile className="mx-auto text-gray-200 mb-3" size={40} />
                                    <p className="text-sm font-bold text-[#1d1d1f]">Henüz memnuniyet verisi yok</p>
                                    <p className="text-xs text-gray-500 mt-1">Yukarıdan günlük veriyi girerek başlayın.</p>
                                </div>
                            )}
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
