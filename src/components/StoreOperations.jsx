import React, { useMemo, useState, useEffect, useId, useRef } from 'react';
import {
    ChevronRight, AlertCircle, X, MapPin, Activity, Clock,
    Users, Search, CheckCircle2, CircleDashed, Gauge, ArrowRight, Building2
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { parseRepairDate } from '../utils/archiveFilters';
import {
    getTechnicianStats, getRepairDurationMinutes, formatDuration, isCompletedRepair
} from '../utils/technicianStats';

// Kritik eşikler: bir kaydın "dikkat gerekli" sayılması için
const SLA_DAYS = 14;            // açık kaydın yaşlanma sınırı
const APPROVAL_SLA_DAYS = 3;    // müşteri onayı bekleme sınırı

const CLOSED_STATUSES = ['Tamamlandı', 'Teslim Edildi', 'Cihaz Hazır', 'İade Edildi', 'İade Hazır', 'İptal'];

const FILTERS = [
    { id: 'all', label: 'Tümü' },
    { id: 'attention', label: 'Dikkat gerekli' },
    { id: 'operational', label: 'Operasyonel' }
];

const SORTS = [
    { id: 'load', label: 'İş yüküne göre' },
    { id: 'critical', label: 'Kritik sayısına göre' },
    { id: 'rate', label: 'Tamamlama oranına göre' },
    { id: 'name', label: 'Mağaza adına göre' }
];

const daysSince = (date, now) => (date ? Math.floor((now - date.getTime()) / 86400000) : null);

// Kaydın neden kritik olduğunu döndürür; kritik değilse null
const getCriticalReason = (repair, now) => {
    const age = daysSince(parseRepairDate(repair.date) || parseRepairDate(repair.createdAt), now);
    if (age == null) return null;

    if (age >= SLA_DAYS) return { code: 'aged', label: `${age} gündür açık`, age };
    if ((repair.status || '').includes('Onay') && age >= APPROVAL_SLA_DAYS) {
        return { code: 'approval', label: `${age} gündür onay bekliyor`, age };
    }
    return null;
};

const StatusPill = ({ tone, icon, children }) => {
    const Icon = icon;
    const tones = {
        critical: 'bg-[#fff5f5] text-[#c30000] border-[#c30000]/15',
        ok: 'bg-[#e6f4ea] text-[#1e7e34] border-[#1e7e34]/15',
        idle: 'bg-[#f5f5f7] text-gray-600 border-gray-200'
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${tones[tone]}`}>
            <Icon size={12} aria-hidden="true" />
            {children}
        </span>
    );
};

const KpiTile = ({ icon, label, value, unit, hint }) => {
    const Icon = icon;
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-8 rounded-lg bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center shrink-0">
                    <Icon size={15} aria-hidden="true" />
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-2xl font-semibold text-[#1d1d1f] tracking-tight tabular-nums">
                {value}
                {unit && <span className="text-[12px] font-medium text-gray-500 ml-1">{unit}</span>}
            </p>
            {hint && <p className="text-[11px] text-gray-500 mt-1 leading-snug">{hint}</p>}
        </div>
    );
};

const StoreOperations = () => {
    const { repairs, allRepairs, servicePoints, technicians } = useAppContext();
    const uid = useId();
    const [selectedStore, setSelectedStore] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('load');

    const dialogRef = useRef(null);
    const lastTriggerRef = useRef(null);

    // "Canlı" ekran: yaş hesapları dakikada bir tazelenir (render sırasında Date.now okunmaz)
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(timer);
    }, []);

    const sourceRepairs = useMemo(() => allRepairs || repairs || [], [allRepairs, repairs]);

    const stores = useMemo(() => {
        return (servicePoints || []).map(sp => {
            const storeRepairs = sourceRepairs.filter(r => String(r.storeId) === String(sp.id));
            const activeRepairs = storeRepairs.filter(r => !CLOSED_STATUSES.includes(r.status));
            const completedRepairs = storeRepairs.filter(isCompletedRepair);

            const criticalRepairs = activeRepairs
                .map(repair => ({ repair, reason: getCriticalReason(repair, now) }))
                .filter(entry => entry.reason)
                .sort((a, b) => b.reason.age - a.reason.age);

            // Süre ölçümü teknisyen ekranıyla aynı kaynaktan: damga yoksa kayıt geçmişinden
            const durations = completedRepairs
                .map(getRepairDurationMinutes)
                .filter(minutes => minutes != null);
            const avgDuration = durations.length
                ? durations.reduce((total, m) => total + m, 0) / durations.length
                : null;

            const since = now - 30 * 86400000;
            const completedLast30 = completedRepairs.filter(r => {
                const end = parseRepairDate(r.completedAt) || parseRepairDate(r.date);
                return end && end.getTime() >= since;
            }).length;

            const completionRate = storeRepairs.length
                ? Math.round((completedRepairs.length / storeRepairs.length) * 100)
                : null;

            const storeTechs = (technicians || []).filter(t => String(t.storeId) === String(sp.id));

            return {
                ...sp,
                storeRepairs,
                activeRepairs,
                completedRepairs,
                criticalRepairs,
                pendingCount: activeRepairs.length,
                criticalCount: criticalRepairs.length,
                completedCount: completedRepairs.length,
                completedLast30,
                avgDuration,
                measuredCount: durations.length,
                completionRate,
                technicians: storeTechs
            };
        });
    }, [servicePoints, sourceRepairs, technicians, now]);

    const visibleStores = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        const list = stores.filter(store => {
            const matchesQuery = !query
                || (store.name || '').toLowerCase().includes(query)
                || String(store.shipTo || '').toLowerCase().includes(query);
            const matchesFilter = filter === 'all'
                || (filter === 'attention' ? store.criticalCount > 0 : store.criticalCount === 0);
            return matchesQuery && matchesFilter;
        });

        return list.sort((a, b) => {
            if (sortBy === 'critical') return b.criticalCount - a.criticalCount || b.pendingCount - a.pendingCount;
            if (sortBy === 'rate') return (b.completionRate ?? -1) - (a.completionRate ?? -1);
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '', 'tr');
            return b.pendingCount - a.pendingCount || b.criticalCount - a.criticalCount;
        });
    }, [stores, searchTerm, filter, sortBy]);

    const network = useMemo(() => {
        const pending = stores.reduce((total, s) => total + s.pendingCount, 0);
        const critical = stores.reduce((total, s) => total + s.criticalCount, 0);
        const techCount = stores.reduce((total, s) => total + s.technicians.length, 0);

        const durations = stores
            .filter(s => s.avgDuration != null)
            .map(s => ({ value: s.avgDuration, weight: s.measuredCount }));
        const weight = durations.reduce((total, d) => total + d.weight, 0);
        const avgDuration = weight
            ? durations.reduce((total, d) => total + d.value * d.weight, 0) / weight
            : null;

        return { pending, critical, techCount, avgDuration, storeCount: stores.length };
    }, [stores]);

    // Detay diyaloğu: odak yönetimi ve Escape
    useEffect(() => {
        if (!selectedStore) return;
        dialogRef.current?.focus();
        const onKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            setSelectedStore(null);
            // Odak, diyaloğu açan karta geri döner
            lastTriggerRef.current?.focus();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [selectedStore]);

    const openStore = (store, event) => {
        lastTriggerRef.current = event?.currentTarget || null;
        setSelectedStore(store);
    };

    const closeStore = () => {
        setSelectedStore(null);
        lastTriggerRef.current?.focus();
    };

    // Seçili mağaza, veri değiştikçe tazelensin
    const activeStore = selectedStore ? stores.find(s => String(s.id) === String(selectedStore.id)) : null;

    return (
        <div className="space-y-6 animate-fade-in pb-16">
            {/* Başlık */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        <span>Yönetim Paneli</span>
                        <ChevronRight size={10} aria-hidden="true" />
                        <span className="text-[#0071e3]">Operasyon Şeması</span>
                    </nav>
                    <h1 className="text-3xl font-semibold text-[#1d1d1f] tracking-tight">Operasyon Şeması</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {network.storeCount} lokasyonun anlık iş yükü, gecikme ve tamamlama performansı.
                    </p>
                </div>

                <span className="inline-flex items-center gap-2 h-9 px-3.5 bg-white border border-gray-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] self-start md:self-auto">
                    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#1e7e34]" />
                    <span className="text-[11px] font-semibold text-gray-600">Canlı veri</span>
                </span>
            </div>

            {/* Ağ özeti */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <KpiTile icon={Activity} label="Açık İş Yükü" value={network.pending} unit="cihaz" hint={`${network.storeCount} lokasyon toplamı`} />
                <KpiTile
                    icon={AlertCircle}
                    label="Dikkat Gerekli"
                    value={network.critical}
                    unit="kayıt"
                    hint={`${SLA_DAYS}+ gün açık ya da ${APPROVAL_SLA_DAYS}+ gün onay bekleyen`}
                />
                <KpiTile icon={Clock} label="Ort. Tamamlama" value={formatDuration(network.avgDuration)} hint="Ölçülebilen onarımların ortalaması" />
                <KpiTile icon={Users} label="Teknisyen" value={network.techCount} unit="kişi" hint="Lokasyonlara atanmış" />
            </div>

            {/* Araç çubuğu */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 flex flex-col lg:flex-row lg:items-end gap-4">
                <div className="flex-1 min-w-0">
                    <label htmlFor={`${uid}-search`} className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Lokasyon ara
                    </label>
                    <div className="relative">
                        <Search size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            id={`${uid}-search`}
                            type="search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Mağaza adı veya Ship-To…"
                            className="w-full h-10 pl-11 pr-4 bg-white border border-gray-300 rounded-xl text-sm font-medium text-[#1d1d1f] placeholder:text-gray-400 outline-none transition-all focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15"
                        />
                    </div>
                </div>

                <div>
                    <span id={`${uid}-filter-label`} className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Durum
                    </span>
                    <div role="group" aria-labelledby={`${uid}-filter-label`} className="inline-flex bg-[#f5f5f7] p-1 rounded-xl border border-gray-200">
                        {FILTERS.map(option => {
                            const isActive = filter === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setFilter(option.id)}
                                    aria-pressed={isActive}
                                    className={`px-4 h-8 rounded-lg text-[12px] font-semibold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${isActive
                                        ? 'bg-white text-[#0071e3] shadow-sm'
                                        : 'text-gray-600 hover:text-[#1d1d1f]'}`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="lg:w-56">
                    <label htmlFor={`${uid}-sort`} className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        Sırala
                    </label>
                    <select
                        id={`${uid}-sort`}
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-[#1d1d1f] outline-none transition-all focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15"
                    >
                        {SORTS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                </div>
            </div>

            <p aria-live="polite" className="text-[13px] font-semibold text-[#1d1d1f]">
                {visibleStores.length} lokasyon
                {visibleStores.length !== stores.length && <span className="font-medium text-gray-500"> / {stores.length}</span>}
            </p>

            {/* Lokasyon kartları */}
            {stores.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] py-16 text-center">
                    <Building2 size={36} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-[#1d1d1f]">Görüntülenecek lokasyon yok</h2>
                    <p className="text-sm text-gray-500 mt-1">Yetkiniz dâhilinde tanımlı bir servis noktası bulunmuyor.</p>
                </div>
            ) : visibleStores.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] py-16 text-center">
                    <Search size={36} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-[#1d1d1f]">Bu koşullara uyan lokasyon yok</h2>
                    <button
                        type="button"
                        onClick={() => { setSearchTerm(''); setFilter('all'); }}
                        className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        Filtreleri temizle
                    </button>
                </div>
            ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {visibleStores.map(store => {
                        const tone = store.criticalCount > 0 ? 'critical' : store.pendingCount === 0 ? 'idle' : 'ok';
                        const statusLabel = tone === 'critical' ? 'Dikkat gerekli' : tone === 'idle' ? 'Boşta' : 'Operasyonel';
                        const statusIcon = tone === 'critical' ? AlertCircle : tone === 'idle' ? CircleDashed : CheckCircle2;
                        const criticalShare = store.pendingCount
                            ? Math.round((store.criticalCount / store.pendingCount) * 100)
                            : 0;

                        return (
                            <li key={store.id}>
                                <button
                                    type="button"
                                    onClick={(e) => openStore(store, e)}
                                    aria-label={`${store.name}: ${store.pendingCount} açık iş, ${store.criticalCount} dikkat gerektiren kayıt, durum ${statusLabel}. Detayları aç`}
                                    className="w-full h-full text-left bg-white rounded-2xl border border-gray-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#0071e3]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all group outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-10 h-10 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center shrink-0 group-hover:bg-[#0071e3]/10 group-hover:text-[#0071e3] transition-colors">
                                                <MapPin size={18} aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[15px] font-semibold text-[#1d1d1f] truncate">{store.name}</span>
                                                <span className="block text-[11px] font-medium text-gray-500">
                                                    Ship-To: {store.shipTo || '—'}
                                                    {store.type && ` · ${store.type}`}
                                                </span>
                                            </span>
                                        </div>
                                        <StatusPill tone={tone} icon={statusIcon}>{statusLabel}</StatusPill>
                                    </div>

                                    <dl className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="rounded-xl bg-[#f5f5f7] px-3 py-2.5">
                                            <dt className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Açık İş</dt>
                                            <dd className="text-lg font-semibold text-[#1d1d1f] tabular-nums">{store.pendingCount}</dd>
                                        </div>
                                        <div className="rounded-xl bg-[#f5f5f7] px-3 py-2.5">
                                            <dt className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Kritik</dt>
                                            <dd className={`text-lg font-semibold tabular-nums ${store.criticalCount > 0 ? 'text-[#c30000]' : 'text-[#1d1d1f]'}`}>
                                                {store.criticalCount}
                                            </dd>
                                        </div>
                                        <div className="rounded-xl bg-[#f5f5f7] px-3 py-2.5">
                                            <dt className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Ort. Süre</dt>
                                            <dd className="text-[13px] font-semibold text-[#1d1d1f] mt-1">{formatDuration(store.avgDuration)}</dd>
                                        </div>
                                    </dl>

                                    {/* İş yükü içindeki kritik payı */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 mb-1.5">
                                            <span>Tamamlama oranı</span>
                                            <span className="font-semibold text-[#1d1d1f] tabular-nums">
                                                {store.completionRate != null ? `%${store.completionRate}` : '—'}
                                            </span>
                                        </div>
                                        <div
                                            className="h-1.5 rounded-full bg-[#e8e8ed] overflow-hidden"
                                            role="progressbar"
                                            aria-valuenow={store.completionRate ?? 0}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-label={`${store.name} tamamlama oranı`}
                                        >
                                            <div
                                                className={`h-full rounded-full ${(store.completionRate ?? 0) >= 80 ? 'bg-[#1e7e34]' : 'bg-[#0071e3]'}`}
                                                style={{ width: `${store.completionRate ?? 0}%` }}
                                            />
                                        </div>
                                        {store.criticalCount > 0 && (
                                            <p className="text-[11px] text-[#c30000] font-medium mt-1.5">
                                                Açık işlerin %{criticalShare}’i gecikmede
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                        <span className="text-[11px] font-medium text-gray-500">
                                            {store.technicians.length} teknisyen · son 30 günde {store.completedLast30} kayıt
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0071e3]">
                                            Detay <ArrowRight size={13} aria-hidden="true" />
                                        </span>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* Lokasyon detayı */}
            {activeStore && (
                <div className="fixed inset-0 z-[110] bg-[#1d1d1f]/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 fade-in" onClick={closeStore}>
                    <div
                        ref={dialogRef}
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`${uid}-dialog-title`}
                        onClick={e => e.stopPropagation()}
                        className="bg-[#f5f5f7] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scale-up outline-none"
                    >
                        <div className="px-6 py-5 bg-white border-b border-gray-200 flex items-center justify-between gap-4 shrink-0">
                            <div className="flex items-center gap-4 min-w-0">
                                <span className="w-11 h-11 rounded-xl bg-[#f5f5f7] text-[#0071e3] flex items-center justify-center shrink-0">
                                    <MapPin size={20} aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <h2 id={`${uid}-dialog-title`} className="text-[17px] font-semibold text-[#1d1d1f] truncate">
                                        {activeStore.name}
                                    </h2>
                                    <p className="text-[12px] text-gray-500">
                                        Ship-To: {activeStore.shipTo || '—'} · {activeStore.storeRepairs.length} toplam kayıt
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeStore}
                                className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-[#f5f5f7] flex items-center justify-center shrink-0 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                            >
                                <X size={18} aria-hidden="true" />
                                <span className="sr-only">Lokasyon detayını kapat</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                <KpiTile
                                    icon={Clock}
                                    label="Ort. Tamamlama"
                                    value={formatDuration(activeStore.avgDuration)}
                                    hint={activeStore.measuredCount
                                        ? `${activeStore.measuredCount} onarımdan hesaplandı`
                                        : 'Ölçülebilir onarım yok'}
                                />
                                <KpiTile
                                    icon={Gauge}
                                    label="Tamamlama Oranı"
                                    value={activeStore.completionRate != null ? `%${activeStore.completionRate}` : '—'}
                                    hint={`${activeStore.completedCount} / ${activeStore.storeRepairs.length} kayıt kapandı`}
                                />
                                <KpiTile icon={Activity} label="Açık İş Yükü" value={activeStore.pendingCount} unit="cihaz" hint={`${activeStore.criticalCount} kayıt gecikmede`} />
                                <KpiTile icon={CheckCircle2} label="Son 30 Gün" value={activeStore.completedLast30} unit="kayıt" hint="Kapanan iş sayısı" />
                            </div>

                            {/* Teknisyen tablosu */}
                            <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                                <header className="px-5 py-4 border-b border-gray-100">
                                    <h3 className="text-[13px] font-semibold text-[#1d1d1f]">Teknisyen Performansı</h3>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Bu lokasyona atanmış ekip</p>
                                </header>

                                {activeStore.technicians.length === 0 ? (
                                    <p className="px-5 py-8 text-center text-[13px] text-gray-500">
                                        Bu lokasyona atanmış teknisyen bulunmuyor.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-[#f5f5f7]/60 border-b border-gray-100">
                                                <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                    <th scope="col" className="px-5 py-3">Teknisyen</th>
                                                    <th scope="col" className="px-4 py-3">Biten İş</th>
                                                    <th scope="col" className="px-4 py-3">Ort. Süre</th>
                                                    <th scope="col" className="px-4 py-3">Günlük Ort.</th>
                                                    <th scope="col" className="px-5 py-3 text-right">Verimlilik</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {activeStore.technicians.map(tech => {
                                                    const stats = getTechnicianStats(sourceRepairs, tech.name);
                                                    return (
                                                        <tr key={tech._id || tech.id || tech.name} className="hover:bg-[#f5f5f7]/50 transition-colors">
                                                            <td className="px-5 py-3">
                                                                <p className="text-[13px] font-semibold text-[#1d1d1f]">{tech.name}</p>
                                                                <p className="text-[11px] text-gray-500">{tech.specialty || 'Genel'}</p>
                                                            </td>
                                                            <td className="px-4 py-3 text-[13px] font-semibold text-[#1d1d1f] tabular-nums">{stats.completed}</td>
                                                            <td className="px-4 py-3 text-[13px] font-medium text-gray-700">{formatDuration(stats.avgDurationMinutes)}</td>
                                                            <td className="px-4 py-3 text-[13px] font-medium text-gray-700 tabular-nums">
                                                                {stats.perActiveDay != null ? stats.perActiveDay.toFixed(1) : '—'}
                                                            </td>
                                                            <td className="px-5 py-3">
                                                                {stats.efficiency != null ? (
                                                                    <div className="flex items-center justify-end gap-3">
                                                                        <div
                                                                            className="w-20 h-1.5 bg-[#e8e8ed] rounded-full overflow-hidden"
                                                                            role="progressbar"
                                                                            aria-valuenow={stats.efficiency}
                                                                            aria-valuemin={0}
                                                                            aria-valuemax={100}
                                                                            aria-label={`${tech.name} verimlilik`}
                                                                        >
                                                                            <div
                                                                                className={`h-full rounded-full ${stats.efficiency >= 70 ? 'bg-[#1e7e34]' : 'bg-[#0071e3]'}`}
                                                                                style={{ width: `${stats.efficiency}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className="text-[12px] font-semibold text-[#1d1d1f] tabular-nums w-10 text-right">%{stats.efficiency}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="block text-right text-[12px] text-gray-400">—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>

                            {/* Kritik kayıtlar */}
                            <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                                <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-[13px] font-semibold text-[#1d1d1f]">Dikkat Gerektiren Kayıtlar</h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            {SLA_DAYS}+ gündür açık olanlar ve {APPROVAL_SLA_DAYS}+ gündür onay bekleyenler
                                        </p>
                                    </div>
                                    {activeStore.criticalCount > 0 && (
                                        <StatusPill tone="critical" icon={AlertCircle}>{activeStore.criticalCount} kayıt</StatusPill>
                                    )}
                                </header>

                                {activeStore.criticalCount === 0 ? (
                                    <p className="px-5 py-8 text-center text-[13px] text-gray-500 inline-flex items-center justify-center gap-2 w-full">
                                        <CheckCircle2 size={15} className="text-[#1e7e34]" aria-hidden="true" />
                                        Gecikmiş kayıt yok.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-gray-50">
                                        {activeStore.criticalRepairs.map(({ repair, reason }) => (
                                            <li key={repair.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">
                                                        <span className="font-mono text-[12px] text-gray-500">#{repair.id}</span> · {repair.device}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 truncate">{repair.customer}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[11px] font-semibold text-[#c30000]">{reason.label}</p>
                                                    <p className="text-[11px] text-gray-500">{repair.status || 'Beklemede'}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoreOperations;
