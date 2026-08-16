import React, { useState, useMemo, useId, useRef, useEffect } from 'react';
import {
    Search, User, Eye, Download, ChevronDown, Store, ChevronRight,
    ShieldCheck, Database, X, SlidersHorizontal, RotateCcw, CalendarDays,
    Package, Layers, FileSearch, Undo2
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import DeviceImage from './DeviceImage';
import RepairHistoryModal from './RepairHistoryModal';
import BatchExportModal from './BatchExportModal';
import { hasPermission } from '../utils/permissions';
import {
    ARCHIVE_STATUSES, FACETS, EMPTY_FILTERS, MONTH_NAMES, PRODUCT_GROUP_LABELS,
    REPAIR_TYPE_LABELS, WARRANTY_LABELS, STATUS_LABELS,
    toArchiveEntry, matchesFilters, countActiveFilters
} from '../utils/archiveFilters';

// Bir grupta baştan gösterilecek kayıt sayısı; kalanı istek üzerine açılır
const ROWS_PER_GROUP = 20;

const GROUP_OPTIONS = [
    { id: 'date', label: 'Tarih (Yıl → Ay)' },
    { id: 'store', label: 'Mağaza' },
    { id: 'product', label: 'Ürün Grubu' },
    { id: 'status', label: 'Durum' },
    { id: 'repairType', label: 'İşlem Türü' },
    { id: 'none', label: 'Gruplama yok (düz liste)' }
];

const SORT_OPTIONS = [
    { id: 'newest', label: 'En yeni önce' },
    { id: 'oldest', label: 'En eski önce' },
    { id: 'customer', label: 'Müşteri (A-Z)' },
    { id: 'record', label: 'Kayıt no' }
];

const STATUS_STYLES = {
    'Teslim Edildi': 'bg-[#e6f4ea] text-[#1e7e34] border-[#1e7e34]/15',
    'İade Edildi': 'bg-[#fff4e5] text-[#b25e00] border-[#b25e00]/15',
    'Tamamlandı': 'bg-[#e8f2ff] text-[#0071e3] border-[#0071e3]/15'
};

const StatCard = ({ icon, label, value, tone = 'text-gray-500 bg-gray-50' }) => {
    const Icon = icon;
    return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className={`p-3 rounded-xl ${tone}`}>
            <Icon size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
            <p className="text-xl font-bold text-[#1d1d1f]">{value}</p>
        </div>
    </div>
    );
};

// Çoktan seçmeli filtre grubu. Gerçek checkbox kullanıldığı için klavye ve
// ekran okuyucu desteği kendiliğinden gelir.
const FacetGroup = ({ facetKey, label, options, selected, onToggle }) => {
    if (!options.length) return null;

    return (
        <fieldset className="min-w-0">
            <legend className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</legend>
            <div className="flex flex-wrap gap-1.5">
                {options.map(option => {
                    const isSelected = selected.includes(option.value);
                    const isEmpty = option.count === 0 && !isSelected;
                    return (
                        <label
                            key={option.value}
                            className={`inline-flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-full border text-[12px] font-semibold cursor-pointer transition-all has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#0071e3]/25 ${isSelected
                                ? 'bg-[#0071e3] text-white border-[#0071e3]'
                                : isEmpty
                                    ? 'bg-white text-gray-400 border-gray-200'
                                    : 'bg-white text-[#1d1d1f] border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                        >
                            <input
                                type="checkbox"
                                className="sr-only"
                                name={facetKey}
                                value={option.value}
                                checked={isSelected}
                                onChange={() => onToggle(facetKey, option.value)}
                            />
                            {option.label}
                            <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-[#f5f5f7] text-gray-500'}`}>
                                {option.count}
                            </span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
};

const ArchiveRow = ({ entry, showStore, onOpen, apiUrl }) => {
    const { repair } = entry;
    const dateLabel = entry.date
        ? entry.date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Tarihsiz';

    return (
        <li>
            <button
                type="button"
                onClick={() => onOpen(repair)}
                aria-label={`${repair.id} numaralı kayıt, ${repair.customer}, ${repair.device}, ${entry.statusKey}, ${dateLabel}. Detayları aç`}
                className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-[#f5f5f7]/70 transition-colors group outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 focus-visible:bg-[#f5f5f7]/70"
            >
                <div className="w-10 h-10 rounded-xl bg-[#f5f5f7] overflow-hidden border border-gray-100 shrink-0">
                    <DeviceImage
                        image={repair.image}
                        productGroup={repair.productGroup}
                        device={repair.device}
                        apiUrl={apiUrl}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-bold text-[#1d1d1f] font-mono">#{repair.id}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLES[entry.statusKey] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {STATUS_LABELS[entry.statusKey] || entry.statusKey}
                        </span>
                        {entry.warrantyKey !== 'unknown' && (
                            <span className="text-[10px] font-semibold text-gray-600 bg-[#f5f5f7] border border-gray-200 px-2 py-0.5 rounded-full">
                                {WARRANTY_LABELS[entry.warrantyKey]}
                            </span>
                        )}
                    </div>
                    <p className="text-[13px] font-semibold text-[#1d1d1f] truncate mt-0.5">{repair.customer}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                        {repair.device}
                        {(repair.serial || repair.serialNumber) && (
                            <span className="font-mono"> · {repair.serial || repair.serialNumber}</span>
                        )}
                        {showStore && <span> · {entry.storeName}</span>}
                    </p>
                </div>

                <div className="hidden sm:block text-right shrink-0">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Kapanış</p>
                    <p className="text-[12px] font-semibold text-[#1d1d1f]">{dateLabel}</p>
                </div>

                <span
                    aria-hidden="true"
                    className="w-9 h-9 rounded-xl bg-[#f5f5f7] text-gray-500 flex items-center justify-center shrink-0 group-hover:bg-[#0071e3]/10 group-hover:text-[#0071e3] transition-colors"
                >
                    <Eye size={16} />
                </span>
            </button>
        </li>
    );
};

const Archive = () => {
    const { repairs, servicePoints, currentUser, API_URL } = useAppContext();
    const uid = useId();
    const canViewAllStores = hasPermission(currentUser, 'view_all_stores');

    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [groupBy, setGroupBy] = useState('date');
    const [sortBy, setSortBy] = useState('newest');
    const [expandedGroups, setExpandedGroups] = useState([]);
    const [selectedRepair, setSelectedRepair] = useState(null);
    const [showBatchExport, setShowBatchExport] = useState(false);
    // Filtreler varsayılan olarak kapalı; açılır panel olarak listenin üzerine biner,
    // böylece kapalıyken tüm dikey alan arşiv kayıtlarına kalır.
    const [filtersOpen, setFiltersOpen] = useState(false);
    const filterPanelRef = useRef(null);

    useEffect(() => {
        if (!filtersOpen) return;

        const handlePointerDown = (event) => {
            if (!filterPanelRef.current?.contains(event.target)) setFiltersOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setFiltersOpen(false);
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [filtersOpen]);

    const storeNameById = useMemo(
        () => new Map((servicePoints || []).map(sp => [String(sp.id), sp.name])),
        [servicePoints]
    );

    // Kullanıcının görebildiği arşiv kayıtları (arama/filtre öncesi havuz).
    // Kullanıcının mağazası tanımlı değilse context'in kendi kapsamına güveniyoruz;
    // aksi hâlde ekran boş görünürdü.
    const scope = useMemo(() => {
        const ownStoreId = currentUser?.storeId;
        const limitToOwnStore = !canViewAllStores && ownStoreId != null;

        return (repairs || [])
            .filter(r => ARCHIVE_STATUSES.includes(r.status))
            .filter(r => !limitToOwnStore || String(r.storeId) === String(ownStoreId))
            .map(r => toArchiveEntry(r, storeNameById));
    }, [repairs, canViewAllStores, currentUser?.storeId, storeNameById]);

    const searchQuery = searchTerm.trim().toLowerCase();

    const searched = useMemo(
        () => (searchQuery ? scope.filter(e => e.searchText.includes(searchQuery)) : scope),
        [scope, searchQuery]
    );

    const filtered = useMemo(
        () => searched.filter(e => matchesFilters(e, filters)),
        [searched, filters]
    );

    // Facet seçenekleri: her sayaç, kendi facet'i hariç diğer filtreler uygulanmış
    // hâlde hesaplanır; böylece sayılar seçim sonrası gerçekleşecek sonucu gösterir.
    const facetOptions = useMemo(() => {
        const result = {};

        Object.entries(FACETS).forEach(([key, facet]) => {
            if (key === 'store' && !canViewAllStores) return;

            const counts = new Map();
            const labels = new Map();

            searched.forEach(entry => {
                const value = facet.valueOf(entry);
                if (!labels.has(value)) labels.set(value, facet.labelOf(value, entry));
                if (!counts.has(value)) counts.set(value, 0);
                if (matchesFilters(entry, filters, key)) {
                    counts.set(value, counts.get(value) + 1);
                }
            });

            // Seçili ama sonuçta hiç kalmayan değerler de listede kalsın ki kaldırılabilsin
            filters[key].forEach(value => {
                if (!counts.has(value)) {
                    counts.set(value, 0);
                    labels.set(value, facet.labelOf(value));
                }
            });

            result[key] = [...counts.entries()]
                .map(([value, count]) => ({ value, count, label: labels.get(value) }))
                .sort((a, b) => {
                    if (key === 'year') return b.value.localeCompare(a.value);
                    return b.count - a.count || a.label.localeCompare(b.label, 'tr');
                });
        });

        return result;
    }, [searched, filters, canViewAllStores]);

    const sorted = useMemo(() => {
        const list = [...filtered];
        list.sort((a, b) => {
            if (sortBy === 'oldest') return a.timestamp - b.timestamp;
            if (sortBy === 'customer') return (a.repair.customer || '').localeCompare(b.repair.customer || '', 'tr');
            if (sortBy === 'record') return String(a.id).localeCompare(String(b.id), 'tr', { numeric: true });
            return b.timestamp - a.timestamp;
        });
        return list;
    }, [filtered, sortBy]);

    // Gruplama: her grup { key, title, subtitle, entries }
    const groups = useMemo(() => {
        if (groupBy === 'none') {
            return [{ key: 'all', title: 'Tüm Kayıtlar', subtitle: null, entries: sorted }];
        }

        const buckets = new Map();

        sorted.forEach(entry => {
            let key;
            let title;
            let subtitle = null;

            if (groupBy === 'date') {
                key = `${entry.yearKey}-${entry.monthIndex ?? 'x'}`;
                title = entry.monthIndex != null ? `${MONTH_NAMES[entry.monthIndex]} ${entry.yearKey}` : 'Tarihsiz Kayıtlar';
                subtitle = entry.yearKey === 'unknown' ? 'Tarih bilgisi girilmemiş' : `${entry.yearKey} dönemi`;
            } else if (groupBy === 'store') {
                key = entry.storeKey;
                title = entry.storeName;
                subtitle = 'Lokasyon arşivi';
            } else if (groupBy === 'product') {
                key = entry.productKey;
                title = PRODUCT_GROUP_LABELS[entry.productKey] || entry.productKey;
                subtitle = 'Ürün grubu';
            } else if (groupBy === 'status') {
                key = entry.statusKey;
                title = STATUS_LABELS[entry.statusKey] || entry.statusKey;
                subtitle = 'Kapanış durumu';
            } else {
                key = entry.repairTypeKey;
                title = REPAIR_TYPE_LABELS[entry.repairTypeKey] || entry.repairTypeKey;
                subtitle = 'İşlem türü';
            }

            if (!buckets.has(key)) buckets.set(key, { key, title, subtitle, entries: [] });
            buckets.get(key).entries.push(entry);
        });

        const list = [...buckets.values()];

        // Tarih gruplaması zaten sıralı listeden geldiği için sırasını korur;
        // diğerlerinde kalabalık grup üstte olsun.
        if (groupBy !== 'date') list.sort((a, b) => b.entries.length - a.entries.length);

        return list;
    }, [sorted, groupBy]);

    const activeFilterCount = countActiveFilters(filters);
    const isNarrowed = activeFilterCount > 0 || searchQuery.length > 0;

    const activeChips = useMemo(() => {
        const chips = [];
        Object.entries(filters).forEach(([key, values]) => {
            values.forEach(value => {
                const option = (facetOptions[key] || []).find(o => o.value === value);
                chips.push({ key, value, label: option?.label || value, facetLabel: FACETS[key].label });
            });
        });
        return chips;
    }, [filters, facetOptions]);

    const stats = useMemo(() => {
        const thisYear = String(new Date().getFullYear());
        return {
            total: scope.length,
            delivered: scope.filter(e => e.statusKey === 'Teslim Edildi').length,
            returned: scope.filter(e => e.statusKey === 'İade Edildi').length,
            thisYear: scope.filter(e => e.yearKey === thisYear).length
        };
    }, [scope]);

    const toggleFilter = (key, value) => {
        setFilters(prev => {
            const values = prev[key];
            return {
                ...prev,
                [key]: values.includes(value) ? values.filter(v => v !== value) : [...values, value]
            };
        });
    };

    const clearAll = () => {
        setFilters(EMPTY_FILTERS);
        setSearchTerm('');
    };

    const toggleGroupExpansion = (key) => {
        setExpandedGroups(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
    };

    return (
        <div className="page-shell space-y-6 animate-fade-in">
            {/* Başlık */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        <span>Servis Yönetimi</span>
                        <ChevronRight size={10} aria-hidden="true" />
                        <span className="text-[#0071e3]">Cihaz Arşivi</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Servis Kayıt Kütüphanesi</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Kapanmış servis kayıtlarını arayın, kategoriye göre süzün ve detaylarını açın.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowBatchExport(true)}
                    className="self-start md:self-auto inline-flex items-center gap-2 h-11 px-5 bg-white border border-gray-200 rounded-xl hover:bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-semibold transition-all shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                >
                    <Download size={16} aria-hidden="true" />
                    Toplu Form İndir
                </button>
            </div>

            {/* Özet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard icon={Database} label="Toplam Kayıt" value={stats.total} />
                <StatCard icon={ShieldCheck} label="Teslim Edildi" value={stats.delivered} tone="text-[#1e7e34] bg-[#e6f4ea]" />
                <StatCard icon={Undo2} label="İade Edildi" value={stats.returned} tone="text-[#b25e00] bg-[#fff4e5]" />
                <StatCard icon={CalendarDays} label="Bu Yıl" value={stats.thisYear} tone="text-[#0071e3] bg-[#e8f2ff]" />
            </div>

            {/* Arama + gruplama + sıralama */}
            <div className="relative z-20 bg-white rounded-[24px] border border-gray-200 shadow-sm">
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-end gap-4">
                    <div className="flex-1 min-w-0">
                        <label htmlFor={`${uid}-search`} className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                            Arşivde ara
                        </label>
                        <div className="relative">
                            <Search size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                id={`${uid}-search`}
                                type="search"
                                placeholder="Kayıt no, müşteri, cihaz, seri no, IMEI, teknisyen…"
                                className="w-full h-11 pl-11 pr-4 bg-white border border-gray-300 rounded-xl text-sm font-medium text-[#1d1d1f] placeholder:text-gray-400 outline-none transition-all focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[440px] shrink-0">
                        <div>
                            <label htmlFor={`${uid}-group`} className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                Kategoriye göre grupla
                            </label>
                            <select
                                id={`${uid}-group`}
                                value={groupBy}
                                onChange={(e) => { setGroupBy(e.target.value); setExpandedGroups([]); }}
                                className="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-[#1d1d1f] outline-none focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15"
                            >
                                {GROUP_OPTIONS.map(option => (
                                    <option key={option.id} value={option.id}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor={`${uid}-sort`} className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                                Sırala
                            </label>
                            <select
                                id={`${uid}-sort`}
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-[#1d1d1f] outline-none focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15"
                            >
                                {SORT_OPTIONS.map(option => (
                                    <option key={option.id} value={option.id}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sonuç özeti + aktif filtre etiketleri + açılır filtre paneli */}
                <div ref={filterPanelRef} className="relative border-t border-gray-100 px-4 sm:px-5 py-3 flex flex-wrap items-center gap-2">
                    <p aria-live="polite" className="text-[13px] font-semibold text-[#1d1d1f]">
                        {sorted.length} kayıt
                        {isNarrowed && <span className="font-medium text-gray-500"> / {scope.length} arşiv kaydı</span>}
                    </p>

                    {activeChips.map(chip => (
                        <button
                            key={`${chip.key}-${chip.value}`}
                            type="button"
                            onClick={() => toggleFilter(chip.key, chip.value)}
                            aria-label={`${chip.facetLabel}: ${chip.label} filtresini kaldır`}
                            className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-full bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20 text-[11px] font-semibold hover:bg-[#0071e3]/15 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            {chip.label}
                            <X size={12} aria-hidden="true" />
                        </button>
                    ))}

                    <div className="ml-auto flex items-center gap-2">
                        {isNarrowed && (
                            <button
                                type="button"
                                onClick={clearAll}
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-semibold text-gray-600 hover:bg-[#f5f5f7] transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                            >
                                <RotateCcw size={13} aria-hidden="true" /> Filtreleri temizle
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setFiltersOpen(open => !open)}
                            aria-expanded={filtersOpen}
                            aria-controls={`${uid}-filters`}
                            className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border text-[12px] font-semibold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${filtersOpen || activeFilterCount > 0
                                ? 'bg-[#0071e3] text-white border-[#0071e3]'
                                : 'bg-white text-[#1d1d1f] border-gray-200 hover:bg-[#f5f5f7]'}`}
                        >
                            <SlidersHorizontal size={14} aria-hidden="true" />
                            Filtreler
                            {activeFilterCount > 0 && (
                                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${filtersOpen || activeFilterCount > 0 ? 'bg-white/20 text-white' : 'bg-[#0071e3] text-white'}`}>
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {filtersOpen && (
                        <div
                            id={`${uid}-filters`}
                            className="absolute left-2 right-2 sm:left-3 sm:right-3 top-full z-30 mt-2 bg-white rounded-[20px] border border-gray-200 shadow-xl shadow-black/10 overflow-hidden"
                        >
                            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-gray-100 bg-[#f5f5f7]/60">
                                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1d1d1f]">
                                    <SlidersHorizontal size={15} className="text-[#0071e3]" aria-hidden="true" />
                                    Kategorilere göre süz
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setFiltersOpen(false)}
                                    aria-label="Filtre panelini kapat"
                                    className="h-8 w-8 rounded-lg text-gray-400 hover:text-[#1d1d1f] hover:bg-white flex items-center justify-center transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                >
                                    <X size={15} aria-hidden="true" />
                                </button>
                            </div>

                            <div className="page-scroll max-h-[min(58vh,440px)] px-4 sm:px-5 py-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                {Object.entries(FACETS).map(([key, facet]) => (
                                    <FacetGroup
                                        key={key}
                                        facetKey={key}
                                        label={facet.label}
                                        options={facetOptions[key] || []}
                                        selected={filters[key]}
                                        onToggle={toggleFilter}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100 bg-[#f5f5f7]/60">
                                <span className="text-[12px] font-semibold text-gray-600">
                                    {sorted.length} kayıt eşleşiyor
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFilters(EMPTY_FILTERS)}
                                        disabled={activeFilterCount === 0}
                                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-semibold text-gray-600 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                    >
                                        <RotateCcw size={13} aria-hidden="true" /> Sıfırla
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFiltersOpen(false)}
                                        className="h-9 px-4 rounded-xl bg-[#0071e3] text-white text-[12px] font-semibold hover:bg-[#0077ed] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Kayıtlar */}
            {/* Yalnızca arşiv kayıtları kayar; başlık ve filtreler sabit kalır */}
            <div className="page-scroll -mx-1 px-1">
            {scope.length === 0 ? (
                <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm py-16 text-center">
                    <Database size={40} className="mx-auto text-gray-300 mb-4" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-[#1d1d1f]">Arşiv henüz boş</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Teslim edilen, iade edilen veya tamamlanan kayıtlar burada birikir.
                    </p>
                </div>
            ) : sorted.length === 0 ? (
                <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm py-16 text-center">
                    <FileSearch size={40} className="mx-auto text-gray-300 mb-4" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-[#1d1d1f]">Bu koşullara uyan kayıt yok</h2>
                    <p className="text-sm text-gray-500 mt-1">Arama ifadesini veya filtreleri gevşetmeyi deneyin.</p>
                    <button
                        type="button"
                        onClick={clearAll}
                        className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <RotateCcw size={15} aria-hidden="true" /> Filtreleri temizle
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map((group, index) => {
                        const isExpanded = expandedGroups.includes(group.key);
                        const visibleEntries = isExpanded ? group.entries : group.entries.slice(0, ROWS_PER_GROUP);
                        const hiddenCount = group.entries.length - visibleEntries.length;
                        const GroupIcon = groupBy === 'store' ? Store
                            : groupBy === 'product' ? Package
                                : groupBy === 'date' ? CalendarDays
                                    : groupBy === 'none' ? Database : Layers;

                        return (
                            <details
                                key={group.key}
                                open={index === 0 || groupBy === 'none' || groups.length <= 3}
                                className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden group/section"
                            >
                                <summary className="flex items-center justify-between gap-4 p-4 sm:p-5 cursor-pointer select-none list-none bg-[#f5f5f7]/60 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25">
                                    <span className="flex items-center gap-3 min-w-0">
                                        <span className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0">
                                            <GroupIcon size={18} className="text-[#1d1d1f]" aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[15px] font-semibold text-[#1d1d1f] truncate">{group.title}</span>
                                            {group.subtitle && (
                                                <span className="block text-[11px] font-medium text-gray-500">{group.subtitle}</span>
                                            )}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-3 shrink-0">
                                        <span className="text-[11px] font-bold text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1">
                                            {group.entries.length} kayıt
                                        </span>
                                        <ChevronDown size={16} className="text-gray-400 group-open/section:rotate-180 transition-transform" aria-hidden="true" />
                                    </span>
                                </summary>

                                <ul className="divide-y divide-gray-100 border-t border-gray-100">
                                    {visibleEntries.map(entry => (
                                        <ArchiveRow
                                            key={entry.repair.id || entry.repair._id}
                                            entry={entry}
                                            showStore={canViewAllStores && groupBy !== 'store'}
                                            onOpen={setSelectedRepair}
                                            apiUrl={API_URL}
                                        />
                                    ))}
                                </ul>

                                {(hiddenCount > 0 || isExpanded) && group.entries.length > ROWS_PER_GROUP && (
                                    <div className="border-t border-gray-100 p-3 text-center">
                                        <button
                                            type="button"
                                            onClick={() => toggleGroupExpansion(group.key)}
                                            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[12px] font-semibold text-[#0071e3] hover:bg-[#0071e3]/5 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                        >
                                            {isExpanded
                                                ? `İlk ${ROWS_PER_GROUP} kaydı göster`
                                                : `${hiddenCount} kayıt daha göster`}
                                        </button>
                                    </div>
                                )}
                            </details>
                        );
                    })}
                </div>
            )}
            </div>

            {selectedRepair && <RepairHistoryModal repair={selectedRepair} onClose={() => setSelectedRepair(null)} />}
            {showBatchExport && <BatchExportModal onClose={() => setShowBatchExport(false)} />}
        </div>
    );
};

export default Archive;
