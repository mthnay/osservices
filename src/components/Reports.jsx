import React, { useState, useMemo, useId, useRef } from 'react';
import {
    Smile, Star, Award, ChevronRight, Download, AlertTriangle, Clock,
    TrendingUp, DollarSign, PieChart, Wallet, ShoppingCart, ArrowUpRight,
    ArrowDownRight, MapPin, Meh, Frown, Save, Store, CheckCircle, Package,
    CalendarRange, Info
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { hasPermission } from '../utils/permissions';
import { parseRepairDate } from '../utils/archiveFilters';

const TABS = [
    { id: 'performance', label: 'Performans' },
    { id: 'financial', label: 'Finansal' },
    { id: 'satisfaction', label: 'Memnuniyet' }
];

const RANGES = [
    { id: 'month', label: 'Bu Ay', months: 1 },
    { id: 'quarter', label: 'Son 3 Ay', months: 3 },
    { id: 'year', label: 'Son 12 Ay', months: 12 },
    { id: 'all', label: 'Tüm Zamanlar', months: null }
];

const CLOSED_STATUSES = ['Tamamlandı', 'Teslim Edildi', 'Cihaz Hazır', 'İade Hazır', 'İade Edildi'];

const PRODUCT_LABELS = {
    iphone: 'iPhone', ipad: 'iPad', mac: 'Mac', watch: 'Apple Watch',
    airpods: 'AirPods', other: 'Aksesuar & Beats', unknown: 'Belirtilmemiş'
};

// Memnuniyet yüzdesine göre renk (>=90 iyi, 80-90 dikkat, <80 kritik)
const getSatisfactionTheme = (pct) => {
    if (pct === null || pct === undefined) return { text: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-200', bar: 'bg-gray-300', label: '—' };
    if (pct >= 90) return { text: 'text-[#1e7e34]', bg: 'bg-[#e6f4ea]', border: 'border-[#1e7e34]/20', bar: 'bg-[#1e7e34]', label: 'İyi' };
    if (pct >= 80) return { text: 'text-[#b25e00]', bg: 'bg-[#fff4e5]', border: 'border-[#b25e00]/20', bar: 'bg-[#ff9500]', label: 'Dikkat' };
    return { text: 'text-[#e30000]', bg: 'bg-[#e30000]/6', border: 'border-[#e30000]/20', bar: 'bg-[#e30000]', label: 'Kritik' };
};

const calcRate = (s, n, d) => {
    const total = (Number(s) || 0) + (Number(n) || 0) + (Number(d) || 0);
    if (total === 0) return null;
    return Math.round(((Number(s) || 0) / total) * 100);
};

const money = (value) => `₺${Math.round(Number(value) || 0).toLocaleString('tr-TR')}`;

// "2026-05" → Date(2026, 4, 1); geçersizse null
const monthToDate = (value) => {
    const match = String(value || '').match(/^(\d{4})-(\d{2})/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return isNaN(date.getTime()) ? null : date;
};

const monthLabel = (date) =>
    date ? date.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }) : '—';

// Onarımın parasal karşılığı: onaylı teklif tutarı, yoksa kabulde girilen tahmini tutar
const repairAmount = (repair) =>
    Number(repair?.quote?.amount) || Number(repair?.estimatedCost) || 0;

/** Excel'in tr-TR yerelinde sorunsuz açılması için noktalı virgül ve BOM */
const downloadCsv = (filename, rows) => {
    const csv = rows
        .map(row => row.map(cell => {
            const value = cell == null ? '' : String(cell);
            return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(';'))
        .join('\n');

    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const StatCard = ({ icon, label, value, hint, tone = 'text-gray-500 bg-gray-50', trend }) => {
    const Icon = icon;
    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                <Icon size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
                <p className="text-xl font-bold text-[#1d1d1f] leading-tight tabular-nums">{value}</p>
                {trend != null ? (
                    <p className={`inline-flex items-center gap-1 text-[11px] font-bold ${trend >= 0 ? 'text-[#1e7e34]' : 'text-[#e30000]'}`}>
                        {trend >= 0 ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}
                        %{Math.abs(trend)} {hint}
                    </p>
                ) : hint && <p className="text-[11px] font-medium text-gray-500 truncate">{hint}</p>}
            </div>
        </div>
    );
};

const Panel = ({ title, description, icon, action, children, className = '' }) => {
    const Icon = icon;
    return (
        <section className={`bg-white rounded-[24px] border border-gray-200 shadow-sm ${className}`}>
            <div className="p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                    {Icon && (
                        <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#f5f5f7] border border-gray-200 text-[#0071e3] flex items-center justify-center shrink-0">
                            <Icon size={19} />
                        </span>
                    )}
                    <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f] tracking-tight">{title}</h3>
                        {description && <p className="text-[11px] font-medium text-gray-500 mt-0.5">{description}</p>}
                    </div>
                </div>
                {action}
            </div>
            <div className="p-4 sm:p-5">{children}</div>
        </section>
    );
};

/** Sütun grafik: değerler etiketli, ekran okuyucu için metin özet de var */
const BarChart = ({ data, format = (v) => v.toLocaleString('tr-TR'), summary, color = '#0071e3' }) => {
    const max = Math.max(...data.map(d => d.value), 0);

    if (!data.length || max === 0) {
        return (
            <p className="h-48 flex items-center justify-center text-[13px] font-medium text-gray-400">
                Bu aralıkta gösterilecek veri yok.
            </p>
        );
    }

    return (
        <div>
            <p className="sr-only">{summary}</p>
            <div aria-hidden="true" className="flex items-end justify-between gap-2 h-48">
                {data.map((item, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2 h-full min-w-0">
                        <span className="text-[10px] font-bold text-[#1d1d1f] tabular-nums whitespace-nowrap">
                            {format(item.value)}
                        </span>
                        <div
                            className="w-full rounded-t-lg transition-all duration-500"
                            style={{ height: `${Math.max((item.value / max) * 100, 2)}%`, backgroundColor: color }}
                        />
                        <span className="text-[10px] font-semibold text-gray-500 truncate max-w-full">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Reports = () => {
    const {
        repairs, earnings, servicePoints, currentUser, visibleServicePoints,
        satisfactionEntries, addSatisfactionEntry, showToast, selectedStoreId
    } = useAppContext();

    const uid = useId();
    const [activeTab, setActiveTab] = useState('performance');
    const [range, setRange] = useState('all');
    const tabRefs = useRef({});

    // Sekmeler arası ok tuşu gezinmesi (WAI-ARIA tabs deseni)
    const handleTabKeyDown = (event) => {
        const index = TABS.findIndex(t => t.id === activeTab);
        let next = null;

        if (event.key === 'ArrowRight') next = TABS[(index + 1) % TABS.length];
        else if (event.key === 'ArrowLeft') next = TABS[(index - 1 + TABS.length) % TABS.length];
        else if (event.key === 'Home') next = TABS[0];
        else if (event.key === 'End') next = TABS[TABS.length - 1];
        if (!next) return;

        event.preventDefault();
        setActiveTab(next.id);
        tabRefs.current[next.id]?.focus();
    };

    const canViewAllStores = hasPermission(currentUser, 'view_all_stores');
    const todayKey = new Date().toISOString().slice(0, 10);
    const rangeLabel = RANGES.find(r => r.id === range)?.label || '';

    // Seçili aralığın başlangıcı (null = sınırsız)
    const rangeStart = useMemo(() => {
        const months = RANGES.find(r => r.id === range)?.months;
        if (!months) return null;
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        if (months === 1) start.setDate(1);
        else start.setMonth(start.getMonth() - months + 1, 1);
        return start;
    }, [range]);

    const inRange = (date) => !rangeStart || (date && date >= rangeStart);

    /* ---------------- Performans ---------------- */

    const scopedRepairs = useMemo(
        () => (repairs || []).filter(r => inRange(parseRepairDate(r.date || r.createdAt))),
        [repairs, rangeStart] // eslint-disable-line react-hooks/exhaustive-deps
    );

    const performance = useMemo(() => {
        const total = scopedRepairs.length;
        const completed = scopedRepairs.filter(r => CLOSED_STATUSES.includes(r.status)).length;
        const scored = scopedRepairs.filter(r => r.feedback?.score);

        const avgRating = scored.length
            ? (scored.reduce((sum, r) => sum + r.feedback.score, 0) / scored.length)
            : null;

        const promoters = scored.filter(r => r.feedback.score >= 4).length;
        const detractors = scored.filter(r => r.feedback.score <= 2).length;
        const nps = scored.length ? Math.round(((promoters - detractors) / scored.length) * 100) : null;

        // Aynı seri numarası birden fazla kez geldiyse tekrar onarım sayılır
        const serials = new Map();
        scopedRepairs.forEach(r => {
            if (r.serial) serials.set(r.serial, (serials.get(r.serial) || 0) + 1);
        });
        const reRepairCount = [...serials.values()].filter(count => count > 1).length;
        const reRepairRate = total > 0 ? Math.round((reRepairCount / total) * 100) : 0;

        // Puan dağılımı (gerçek geri bildirimlerden)
        const distribution = [5, 4, 3, 2, 1].map(star => {
            const count = scored.filter(r => r.feedback.score === star).length;
            return { star, count, pct: scored.length ? Math.round((count / scored.length) * 100) : 0 };
        });

        // Son 7 günün kapanan iş sayısı
        const days = [];
        for (let i = 6; i >= 0; i -= 1) {
            const day = new Date();
            day.setHours(0, 0, 0, 0);
            day.setDate(day.getDate() - i);
            const next = new Date(day);
            next.setDate(next.getDate() + 1);

            const value = (repairs || []).filter(r => {
                if (!CLOSED_STATUSES.includes(r.status)) return false;
                const closed = parseRepairDate(r.completedAt)
                    || parseRepairDate((r.history || []).find(h => CLOSED_STATUSES.includes(h.status))?.date);
                return closed && closed >= day && closed < next;
            }).length;

            days.push({ label: day.toLocaleDateString('tr-TR', { weekday: 'short' }), value });
        }

        return {
            total, completed, avgRating, nps, reRepairCount, reRepairRate,
            scoredCount: scored.length, distribution, days,
            completionRate: total ? Math.round((completed / total) * 100) : 0
        };
    }, [scopedRepairs, repairs]);

    /* ---------------- Finansal ---------------- */

    const financial = useMemo(() => {
        const scopedEarnings = (earnings || []).filter(e => inRange(monthToDate(e.month)));
        const totalRevenue = scopedEarnings.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        // Maliyet modeli tahminidir: ciro üzerinden sabit oranla hesaplanır
        const estimatedCost = totalRevenue * 0.45;
        const totalProfit = totalRevenue - estimatedCost;
        const margin = totalRevenue ? Math.round((totalProfit / totalRevenue) * 100) : 0;
        const totalTax = totalRevenue * 0.20;

        // Aylık ciro (gerçek kayıtlardan)
        const byMonth = new Map();
        scopedEarnings.forEach(e => {
            const date = monthToDate(e.month);
            if (!date) return;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            byMonth.set(key, (byMonth.get(key) || 0) + (Number(e.amount) || 0));
        });

        const monthlyTrend = [...byMonth.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)
            .map(([key, value]) => ({ key, label: monthLabel(monthToDate(key)), value }));

        // Son iki ay karşılaştırması
        const last = monthlyTrend[monthlyTrend.length - 1];
        const prev = monthlyTrend[monthlyTrend.length - 2];
        const monthOverMonth = last && prev && prev.value
            ? Math.round(((last.value - prev.value) / prev.value) * 100)
            : null;

        const storeRevenue = (servicePoints || []).map(sp => ({
            id: sp.id,
            name: sp.name,
            value: scopedEarnings
                .filter(e => String(e.storeId) === String(sp.id))
                .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
        })).filter(sp => sp.value > 0).sort((a, b) => b.value - a.value);

        // Ürün grubu kırılımı onarım kayıtlarındaki tutarlardan gelir
        const byGroup = new Map();
        scopedRepairs.forEach(r => {
            const amount = repairAmount(r);
            if (!amount) return;
            const key = r.productGroup || 'unknown';
            byGroup.set(key, (byGroup.get(key) || 0) + amount);
        });

        const groupTotal = [...byGroup.values()].reduce((sum, value) => sum + value, 0);
        const categoryRevenue = [...byGroup.entries()]
            .map(([key, value]) => ({
                key,
                name: PRODUCT_LABELS[key] || key,
                value,
                share: groupTotal ? Math.round((value / groupTotal) * 100) : 0
            }))
            .sort((a, b) => b.value - a.value);

        return {
            totalRevenue, totalProfit, totalTax, margin, monthlyTrend, monthOverMonth,
            storeRevenue, categoryRevenue, groupTotal,
            perRepair: scopedRepairs.length ? totalRevenue / scopedRepairs.length : 0,
            recordCount: scopedEarnings.length
        };
    }, [earnings, servicePoints, scopedRepairs, rangeStart]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ---------------- Memnuniyet ---------------- */

    const [satForm, setSatForm] = useState({
        storeId: (selectedStoreId && selectedStoreId !== 0) ? selectedStoreId : (currentUser?.storeId || ''),
        date: todayKey,
        satisfied: '',
        neutral: '',
        dissatisfied: ''
    });
    const [savingSat, setSavingSat] = useState(false);
    const [satStoreFilter, setSatStoreFilter] = useState('all');

    const liveRate = calcRate(satForm.satisfied, satForm.neutral, satForm.dissatisfied);
    const liveTheme = getSatisfactionTheme(liveRate);

    const scopedEntries = useMemo(() => {
        const list = (satisfactionEntries || [])
            .filter(e => inRange(parseRepairDate(e.date)))
            .filter(e => satStoreFilter === 'all' || String(e.storeId) === String(satStoreFilter));

        return [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    }, [satisfactionEntries, rangeStart, satStoreFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const satisfactionSummary = useMemo(() => {
        const totals = scopedEntries.reduce((acc, e) => {
            acc.s += e.satisfied || 0; acc.n += e.neutral || 0; acc.d += e.dissatisfied || 0;
            return acc;
        }, { s: 0, n: 0, d: 0 });

        const byStore = new Map();
        scopedEntries.forEach(e => {
            const current = byStore.get(String(e.storeId)) || { s: 0, n: 0, d: 0 };
            current.s += e.satisfied || 0;
            current.n += e.neutral || 0;
            current.d += e.dissatisfied || 0;
            byStore.set(String(e.storeId), current);
        });

        const storeRates = [...byStore.entries()].map(([sid, t]) => ({
            storeId: sid,
            name: servicePoints.find(sp => String(sp.id) === String(sid))?.name || `Mağaza ${sid}`,
            rate: calcRate(t.s, t.n, t.d),
            total: t.s + t.n + t.d
        })).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

        // Son 10 günün oran seyri (eskiden yeniye)
        const trend = [...scopedEntries]
            .slice(0, 10)
            .reverse()
            .map(e => ({
                label: new Date(e.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
                value: calcRate(e.satisfied, e.neutral, e.dissatisfied) || 0
            }));

        return { totals, overallRate: calcRate(totals.s, totals.n, totals.d), storeRates, trend };
    }, [scopedEntries, servicePoints]);

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

    /* ---------------- Dışa aktarma ---------------- */

    const handleExport = () => {
        const stamp = new Date().toISOString().slice(0, 10);

        if (activeTab === 'performance') {
            const rows = [
                ['Metrik', 'Değer'],
                ['Aralık', rangeLabel],
                ['Toplam kayıt', performance.total],
                ['Kapanan kayıt', performance.completed],
                ['Kapanma oranı (%)', performance.completionRate],
                ['Ortalama puan', performance.avgRating != null ? performance.avgRating.toFixed(1) : '—'],
                ['NPS', performance.nps != null ? performance.nps : '—'],
                ['Tekrar onarım oranı (%)', performance.reRepairRate],
                [],
                ['Puan', 'Adet', 'Yüzde'],
                ...performance.distribution.map(d => [`${d.star} yıldız`, d.count, `%${d.pct}`])
            ];
            downloadCsv(`performans-raporu-${stamp}.csv`, rows);
        } else if (activeTab === 'financial') {
            const rows = [
                ['Metrik', 'Değer'],
                ['Aralık', rangeLabel],
                ['Toplam ciro', financial.totalRevenue],
                ['Net kâr (tahmini)', Math.round(financial.totalProfit)],
                ['KDV (%20)', Math.round(financial.totalTax)],
                ['Onarım başına ortalama', Math.round(financial.perRepair)],
                [],
                ['Ay', 'Ciro'],
                ...financial.monthlyTrend.map(m => [m.key, m.value]),
                [],
                ['Mağaza', 'Ciro'],
                ...financial.storeRevenue.map(s => [s.name, s.value]),
                [],
                ['Ürün grubu', 'Tutar', 'Pay'],
                ...financial.categoryRevenue.map(c => [c.name, c.value, `%${c.share}`])
            ];
            downloadCsv(`finansal-rapor-${stamp}.csv`, rows);
        } else {
            const rows = [
                ['Tarih', 'Mağaza', 'Memnun', 'Nötr', 'Memnun değil', 'Toplam', 'Oran'],
                ...scopedEntries.map(e => {
                    const total = (e.satisfied || 0) + (e.neutral || 0) + (e.dissatisfied || 0);
                    const rate = calcRate(e.satisfied, e.neutral, e.dissatisfied);
                    return [
                        e.date,
                        servicePoints.find(s => String(s.id) === String(e.storeId))?.name || `Mağaza ${e.storeId}`,
                        e.satisfied || 0, e.neutral || 0, e.dissatisfied || 0, total,
                        rate != null ? `%${rate}` : '—'
                    ];
                })
            ];
            downloadCsv(`memnuniyet-raporu-${stamp}.csv`, rows);
        }

        showToast('Rapor CSV olarak indirildi.', 'success');
    };

    const overallTheme = getSatisfactionTheme(satisfactionSummary.overallRate);
    const fieldClass = 'w-full px-4 py-3 bg-[#f5f5f7] border border-gray-200 rounded-xl text-sm font-semibold text-[#1d1d1f] outline-none transition-all focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/20';
    const labelClass = 'block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-0.5';

    return (
        <div className="page-shell animate-fade-in">
            {/* Başlık */}
            <div className="shrink-0 flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="min-w-0">
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        <span>Yönetim</span>
                        <ChevronRight size={10} aria-hidden="true" />
                        <span className="text-[#0071e3]">Analiz & Raporlar</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Kurumsal Raporlama Merkezi</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Operasyon, ciro ve memnuniyet verilerini tek yerden izleyin. Tüm sayılar seçili aralığa göre hesaplanır.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div role="group" aria-label="Rapor aralığı" className="flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-xl border border-gray-200/70">
                        {RANGES.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setRange(option.id)}
                                aria-pressed={range === option.id}
                                className={`h-9 px-3 rounded-lg text-[12px] font-semibold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${range === option.id
                                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                                    : 'text-gray-500 hover:text-[#1d1d1f]'}`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={handleExport}
                        className="inline-flex items-center gap-2 h-11 px-5 bg-white border border-gray-200 rounded-xl hover:bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-semibold transition-all shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <Download size={16} aria-hidden="true" /> CSV İndir
                    </button>
                </div>
            </div>

            {/* Sekmeler — ok tuşlarıyla gezinilir (roving tabindex) */}
            <div
                role="tablist"
                aria-label="Rapor türü"
                className="shrink-0 flex items-center gap-1 pt-4"
                onKeyDown={handleTabKeyDown}
            >
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        ref={el => { tabRefs.current[tab.id] = el; }}
                        id={`${uid}-tab-${tab.id}`}
                        aria-selected={activeTab === tab.id}
                        aria-controls={`${uid}-panel-${tab.id}`}
                        tabIndex={activeTab === tab.id ? 0 : -1}
                        onClick={() => setActiveTab(tab.id)}
                        className={`h-10 px-5 rounded-t-xl text-[13px] font-semibold border-b-2 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${activeTab === tab.id
                            ? 'border-[#0071e3] text-[#0071e3]'
                            : 'border-transparent text-gray-500 hover:text-[#1d1d1f]'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="page-scroll py-5 pr-1">
                {/* ---------- Performans ---------- */}
                {activeTab === 'performance' && (
                    <div
                        role="tabpanel"
                        id={`${uid}-panel-performance`}
                        aria-labelledby={`${uid}-tab-performance`}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            <StatCard
                                icon={Star}
                                label="Ortalama Puan"
                                value={performance.avgRating != null ? `${performance.avgRating.toFixed(1)} / 5` : '—'}
                                hint={performance.scoredCount ? `${performance.scoredCount} değerlendirme` : 'Değerlendirme yok'}
                                tone="text-[#0071e3] bg-[#e8f2ff]"
                            />
                            <StatCard
                                icon={Award}
                                label="NPS"
                                value={performance.nps != null ? performance.nps : '—'}
                                hint="Tavsiye skoru"
                                tone={performance.nps != null && performance.nps >= 0 ? 'text-[#1e7e34] bg-[#e6f4ea]' : 'text-gray-500 bg-gray-50'}
                            />
                            <StatCard
                                icon={CheckCircle}
                                label="Kapanan İş"
                                value={performance.completed}
                                hint={`${performance.total} kayıttan · %${performance.completionRate}`}
                                tone="text-[#1e7e34] bg-[#e6f4ea]"
                            />
                            <StatCard
                                icon={AlertTriangle}
                                label="Tekrar Onarım"
                                value={`%${performance.reRepairRate}`}
                                hint={`${performance.reRepairCount} cihaz tekrar geldi`}
                                tone={performance.reRepairRate > 10 ? 'text-[#e30000] bg-[#e30000]/8' : 'text-[#b25e00] bg-[#fff4e5]'}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <Panel
                                title="Son 7 Günde Kapanan İş"
                                description="Teslim, tamamlandı ve iade kayıtlarının günlük dağılımı"
                                icon={Clock}
                            >
                                <BarChart
                                    data={performance.days}
                                    summary={`Son yedi gün kapanan iş sayıları: ${performance.days.map(d => `${d.label} ${d.value}`).join(', ')}`}
                                />
                            </Panel>

                            <Panel
                                title="Puan Dağılımı"
                                description={performance.scoredCount
                                    ? `${performance.scoredCount} müşteri değerlendirmesi`
                                    : 'Henüz müşteri değerlendirmesi yok'}
                                icon={Star}
                            >
                                {performance.scoredCount === 0 ? (
                                    <p className="py-10 text-center text-[13px] font-medium text-gray-400">
                                        Bu aralıkta puanlanmış kayıt bulunmuyor.
                                    </p>
                                ) : (
                                    <ul className="list-none p-0 m-0 space-y-3">
                                        {performance.distribution.map(row => (
                                            <li key={row.star} className="flex items-center gap-3">
                                                <span className="w-16 shrink-0 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                                    {row.star} yıldız
                                                </span>
                                                <div
                                                    role="progressbar"
                                                    aria-valuenow={row.pct}
                                                    aria-valuemin={0}
                                                    aria-valuemax={100}
                                                    aria-label={`${row.star} yıldız oranı`}
                                                    className="flex-1 h-2 bg-[#f5f5f7] border border-gray-200 rounded-full overflow-hidden"
                                                >
                                                    <div className="h-full bg-[#0071e3] rounded-full" style={{ width: `${row.pct}%` }} />
                                                </div>
                                                <span className="w-20 text-right text-[12px] font-bold text-[#1d1d1f] tabular-nums">
                                                    {row.count} · %{row.pct}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Panel>
                        </div>
                    </div>
                )}

                {/* ---------- Finansal ---------- */}
                {activeTab === 'financial' && (
                    <div
                        role="tabpanel"
                        id={`${uid}-panel-financial`}
                        aria-labelledby={`${uid}-tab-financial`}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                            <StatCard
                                icon={DollarSign}
                                label="Toplam Ciro"
                                value={money(financial.totalRevenue)}
                                tone="text-[#0071e3] bg-[#e8f2ff]"
                                trend={financial.monthOverMonth}
                                hint={financial.monthOverMonth != null ? 'önceki aya göre' : `${financial.recordCount} ciro kaydı`}
                            />
                            <StatCard
                                icon={TrendingUp}
                                label="Net Kâr (Tahmini)"
                                value={money(financial.totalProfit)}
                                hint={`Tahmini marj %${financial.margin}`}
                                tone="text-[#1e7e34] bg-[#e6f4ea]"
                            />
                            <StatCard
                                icon={Wallet}
                                label="KDV (%20)"
                                value={money(financial.totalTax)}
                                hint="Ciro üzerinden hesaplandı"
                                tone="text-[#b25e00] bg-[#fff4e5]"
                            />
                            <StatCard
                                icon={ShoppingCart}
                                label="Onarım Başına"
                                value={money(financial.perRepair)}
                                hint={`${scopedRepairs.length} kayda bölündü`}
                            />
                        </div>

                        <p className="flex items-start gap-2 text-[11px] font-medium text-gray-500 bg-[#f5f5f7] border border-gray-200 rounded-xl px-3 py-2">
                            <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-gray-400" />
                            Ciro, mağaza ciro kayıtlarından gelir. Net kâr ve KDV sabit oranlı tahmindir (maliyet %45, KDV %20); muhasebe kaydı yerine geçmez.
                        </p>

                        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
                            <Panel
                                title="Aylık Ciro Seyri"
                                description="Girilen ciro kayıtlarının aya göre toplamı"
                                icon={CalendarRange}
                            >
                                <BarChart
                                    data={financial.monthlyTrend}
                                    format={(v) => money(v)}
                                    summary={`Aylık ciro: ${financial.monthlyTrend.map(m => `${m.label} ${money(m.value)}`).join(', ')}`}
                                />
                            </Panel>

                            <Panel title="Mağaza Bazlı Ciro" description="Seçili aralıktaki dağılım" icon={MapPin}>
                                {financial.storeRevenue.length === 0 ? (
                                    <p className="py-10 text-center text-[13px] font-medium text-gray-400">
                                        Bu aralıkta ciro kaydı yok.
                                    </p>
                                ) : (
                                    <ul className="list-none p-0 m-0 space-y-4">
                                        {financial.storeRevenue.map(sp => {
                                            const share = financial.totalRevenue
                                                ? Math.round((sp.value / financial.totalRevenue) * 100)
                                                : 0;
                                            return (
                                                <li key={sp.id} className="space-y-1.5">
                                                    <div className="flex justify-between items-center gap-3">
                                                        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1d1d1f] min-w-0">
                                                            <MapPin size={12} className="text-gray-400 shrink-0" aria-hidden="true" />
                                                            <span className="truncate">{sp.name}</span>
                                                        </span>
                                                        <span className="text-[12px] font-bold text-[#1d1d1f] tabular-nums shrink-0">
                                                            {money(sp.value)} <span className="text-gray-400 font-semibold">%{share}</span>
                                                        </span>
                                                    </div>
                                                    <div
                                                        role="progressbar"
                                                        aria-valuenow={share}
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-label={`${sp.name} ciro payı`}
                                                        className="h-2 bg-[#f5f5f7] border border-gray-200 rounded-full overflow-hidden"
                                                    >
                                                        <div className="h-full bg-[#0071e3] rounded-full" style={{ width: `${share}%` }} />
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </Panel>
                        </div>

                        <Panel
                            title="Ürün Grubu Analizi"
                            description="Onarım kayıtlarındaki onaylı teklif / tahmini tutarlar"
                            icon={PieChart}
                        >
                            {financial.categoryRevenue.length === 0 ? (
                                <p className="py-10 text-center text-[13px] font-medium text-gray-400">
                                    Bu aralıkta tutar girilmiş onarım kaydı yok.
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                                    {financial.categoryRevenue.map(cat => (
                                        <div key={cat.key} className="p-4 bg-[#f5f5f7] rounded-2xl border border-gray-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Package size={14} className="text-gray-400 shrink-0" aria-hidden="true" />
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{cat.name}</p>
                                            </div>
                                            <p className="text-[17px] font-bold text-[#1d1d1f] tabular-nums">{money(cat.value)}</p>
                                            <p className="text-[11px] font-semibold text-gray-500 mt-1">Pay: %{cat.share}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Panel>
                    </div>
                )}

                {/* ---------- Memnuniyet ---------- */}
                {activeTab === 'satisfaction' && (
                    <div
                        role="tabpanel"
                        id={`${uid}-panel-satisfaction`}
                        aria-labelledby={`${uid}-tab-satisfaction`}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 items-start">
                            {/* Veri girişi */}
                            <Panel
                                title="Günlük Memnuniyet Girişi"
                                description="Aynı gün için tekrar kayıt, o günün verisini günceller"
                                icon={Smile}
                            >
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSaveSatisfaction(); }}
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor={`${uid}-sat-store`} className={labelClass}>Mağaza</label>
                                            {canViewAllStores ? (
                                                <select
                                                    id={`${uid}-sat-store`}
                                                    className={fieldClass}
                                                    value={satForm.storeId}
                                                    onChange={(e) => setSatForm({ ...satForm, storeId: e.target.value })}
                                                >
                                                    <option value="">Mağaza seçiniz…</option>
                                                    {visibleServicePoints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            ) : (
                                                <p className="w-full px-4 py-3 bg-[#f5f5f7] border border-gray-200 rounded-xl text-sm font-semibold text-[#1d1d1f] flex items-center gap-2">
                                                    <Store size={14} className="text-gray-400" aria-hidden="true" />
                                                    {servicePoints.find(s => String(s.id) === String(currentUser?.storeId))?.name || 'Mağazanız'}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label htmlFor={`${uid}-sat-date`} className={labelClass}>Tarih</label>
                                            <input
                                                id={`${uid}-sat-date`}
                                                type="date"
                                                max={todayKey}
                                                className={fieldClass}
                                                value={satForm.date}
                                                onChange={(e) => setSatForm({ ...satForm, date: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {[
                                            { key: 'satisfied', label: 'Memnun', icon: Smile, tone: 'text-[#1e7e34] bg-[#e6f4ea]' },
                                            { key: 'neutral', label: 'Nötr', icon: Meh, tone: 'text-[#b25e00] bg-[#fff4e5]' },
                                            { key: 'dissatisfied', label: 'Memnun Değil', icon: Frown, tone: 'text-[#e30000] bg-[#e30000]/8' }
                                        ].map(item => (
                                            <div key={item.key} className="bg-[#f5f5f7] rounded-2xl p-3 border border-gray-200">
                                                <label htmlFor={`${uid}-sat-${item.key}`} className="flex items-center gap-2 mb-2">
                                                    <span aria-hidden="true" className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.tone}`}>
                                                        <item.icon size={15} />
                                                    </span>
                                                    <span className="text-[11px] font-bold uppercase tracking-wide text-gray-600">{item.label}</span>
                                                </label>
                                                <input
                                                    id={`${uid}-sat-${item.key}`}
                                                    type="number"
                                                    min="0"
                                                    inputMode="numeric"
                                                    placeholder="0"
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xl font-bold text-[#1d1d1f] tabular-nums outline-none transition-all focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/20"
                                                    value={satForm[item.key]}
                                                    onChange={(e) => setSatForm({ ...satForm, [item.key]: e.target.value })}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className={`flex items-center justify-between gap-3 p-4 rounded-2xl border ${liveTheme.bg} ${liveTheme.border}`}>
                                        <span className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hesaplanan Memnuniyet</span>
                                            {liveRate !== null && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${liveTheme.text} ${liveTheme.border}`}>
                                                    {liveTheme.label}
                                                </span>
                                            )}
                                        </span>
                                        <span aria-live="polite" className={`text-2xl font-bold tabular-nums ${liveTheme.text}`}>
                                            {liveRate !== null ? `%${liveRate}` : '—'}
                                        </span>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={savingSat}
                                        className="w-full h-11 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-50 transition-all shadow-sm shadow-[#0071e3]/20 flex items-center justify-center gap-2 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                    >
                                        <Save size={16} aria-hidden="true" /> {savingSat ? 'Kaydediliyor…' : 'Günlük Veriyi Kaydet'}
                                    </button>
                                    <p className="text-[11px] text-gray-500 text-center">Eşikler: %90 altı dikkat, %80 altı kritik.</p>
                                </form>
                            </Panel>

                            {/* Dönem özeti */}
                            <div className="space-y-4">
                                <div className={`rounded-[24px] p-5 border shadow-sm ${overallTheme.bg} ${overallTheme.border}`}>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                                        {canViewAllStores ? 'Genel Memnuniyet' : 'Mağaza Memnuniyeti'} · {rangeLabel}
                                    </p>
                                    <div className="flex items-baseline gap-3">
                                        <span className={`text-4xl font-bold tabular-nums ${overallTheme.text}`}>
                                            {satisfactionSummary.overallRate !== null ? `%${satisfactionSummary.overallRate}` : '—'}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border ${overallTheme.text} ${overallTheme.border}`}>
                                            {overallTheme.label}
                                        </span>
                                    </div>
                                    <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                                        <div className="bg-white/70 rounded-xl border border-gray-200 py-2">
                                            <dd className="text-[17px] font-bold text-[#1e7e34] tabular-nums">{satisfactionSummary.totals.s}</dd>
                                            <dt className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Memnun</dt>
                                        </div>
                                        <div className="bg-white/70 rounded-xl border border-gray-200 py-2">
                                            <dd className="text-[17px] font-bold text-[#b25e00] tabular-nums">{satisfactionSummary.totals.n}</dd>
                                            <dt className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Nötr</dt>
                                        </div>
                                        <div className="bg-white/70 rounded-xl border border-gray-200 py-2">
                                            <dd className="text-[17px] font-bold text-[#e30000] tabular-nums">{satisfactionSummary.totals.d}</dd>
                                            <dt className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Memnun Değil</dt>
                                        </div>
                                    </dl>
                                </div>

                                {satisfactionSummary.trend.length > 1 && (
                                    <Panel title="Son Günlerin Seyri" description="Günlük memnuniyet oranı" icon={TrendingUp}>
                                        <BarChart
                                            data={satisfactionSummary.trend}
                                            format={(v) => `%${v}`}
                                            summary={`Günlük memnuniyet oranları: ${satisfactionSummary.trend.map(t => `${t.label} %${t.value}`).join(', ')}`}
                                        />
                                    </Panel>
                                )}

                                {canViewAllStores && satisfactionSummary.storeRates.length > 0 && (
                                    <Panel title="Mağaza Bazlı Memnuniyet" description="Seçili aralıktaki oranlar" icon={Store}>
                                        <ul className="list-none p-0 m-0 space-y-3">
                                            {satisfactionSummary.storeRates.map(sr => {
                                                const theme = getSatisfactionTheme(sr.rate);
                                                return (
                                                    <li key={sr.storeId} className="space-y-1.5">
                                                        <div className="flex justify-between items-center gap-3">
                                                            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1d1d1f] min-w-0">
                                                                <MapPin size={12} className="text-gray-400 shrink-0" aria-hidden="true" />
                                                                <span className="truncate">{sr.name}</span>
                                                            </span>
                                                            <span className={`text-[12px] font-bold tabular-nums shrink-0 ${theme.text}`}>
                                                                {sr.rate !== null ? `%${sr.rate}` : '—'}
                                                                <span className="text-gray-400 font-semibold"> · {sr.total} kişi</span>
                                                            </span>
                                                        </div>
                                                        <div
                                                            role="progressbar"
                                                            aria-valuenow={sr.rate || 0}
                                                            aria-valuemin={0}
                                                            aria-valuemax={100}
                                                            aria-label={`${sr.name} memnuniyet oranı`}
                                                            className="h-2 bg-[#f5f5f7] border border-gray-200 rounded-full overflow-hidden"
                                                        >
                                                            <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${sr.rate || 0}%` }} />
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </Panel>
                                )}
                            </div>
                        </div>

                        {/* Geçmiş kayıtlar */}
                        <Panel
                            title="Günlük Memnuniyet Geçmişi"
                            description={`${scopedEntries.length} kayıt · ${rangeLabel}`}
                            icon={CalendarRange}
                            action={canViewAllStores ? (
                                <div>
                                    <label htmlFor={`${uid}-sat-filter`} className="sr-only">Mağazaya göre süz</label>
                                    <select
                                        id={`${uid}-sat-filter`}
                                        value={satStoreFilter}
                                        onChange={(e) => setSatStoreFilter(e.target.value)}
                                        className="h-10 px-3 bg-white border border-gray-300 rounded-xl text-[13px] font-semibold text-[#1d1d1f] outline-none focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15"
                                    >
                                        <option value="all">Tüm mağazalar</option>
                                        {visibleServicePoints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            ) : null}
                            className="overflow-hidden"
                        >
                            {scopedEntries.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Smile className="mx-auto text-gray-300 mb-3" size={36} aria-hidden="true" />
                                    <h4 className="text-[15px] font-semibold text-[#1d1d1f]">Bu aralıkta memnuniyet verisi yok</h4>
                                    <p className="text-[13px] text-gray-500 mt-1">Yukarıdan günlük veriyi girerek başlayın.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto max-h-[420px] overflow-y-auto page-scroll -m-4 sm:-m-5">
                                    <table className="w-full text-left border-collapse">
                                        <caption className="sr-only">Mağaza ve güne göre memnuniyet kayıtları</caption>
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-[#f5f5f7] border-b border-gray-200">
                                                <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tarih</th>
                                                {canViewAllStores && <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mağaza</th>}
                                                <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Memnun</th>
                                                <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Nötr</th>
                                                <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Memnun Değil</th>
                                                <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Toplam</th>
                                                <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Memnuniyet</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {scopedEntries.map(entry => {
                                                const total = (entry.satisfied || 0) + (entry.neutral || 0) + (entry.dissatisfied || 0);
                                                const rate = calcRate(entry.satisfied, entry.neutral, entry.dissatisfied);
                                                const theme = getSatisfactionTheme(rate);
                                                return (
                                                    <tr key={entry._id || `${entry.storeId}-${entry.date}`} className="hover:bg-[#f5f5f7]/60 transition-colors">
                                                        <td className="px-5 py-3 text-[13px] font-semibold text-[#1d1d1f] whitespace-nowrap">
                                                            {new Date(entry.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        {canViewAllStores && (
                                                            <td className="px-5 py-3 text-[12px] font-medium text-gray-600">
                                                                {servicePoints.find(s => String(s.id) === String(entry.storeId))?.name || `Mağaza ${entry.storeId}`}
                                                            </td>
                                                        )}
                                                        <td className="px-5 py-3 text-center text-[13px] font-bold text-[#1e7e34] tabular-nums">{entry.satisfied || 0}</td>
                                                        <td className="px-5 py-3 text-center text-[13px] font-bold text-[#b25e00] tabular-nums">{entry.neutral || 0}</td>
                                                        <td className="px-5 py-3 text-center text-[13px] font-bold text-[#e30000] tabular-nums">{entry.dissatisfied || 0}</td>
                                                        <td className="px-5 py-3 text-center text-[13px] font-bold text-[#1d1d1f] tabular-nums">{total}</td>
                                                        <td className="px-5 py-3 text-right">
                                                            <span className={`inline-block text-[12px] font-bold px-2.5 py-1 rounded-full border tabular-nums ${theme.bg} ${theme.text} ${theme.border}`}>
                                                                {rate !== null ? `%${rate}` : '—'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Panel>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
