import React, { useMemo, useState } from 'react';
import {
    Package, Store, Search, X, ChevronDown, Calendar, Building, MapPin,
    Info, Layers, Undo2, FileSearch
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Collapse from './ui/Collapse';

/* ------------------------------------------------------------------
   KBB Arşivi
   Apple'a iade edilmiş (kbbStatus === 'Returned') sökülen eski parçaların
   ambar bazlı arşivi. Kayıtlar önce ambara, ambar içinde döneme göre
   gruplanır; arama ve filtrelerle istenen parçaya inilir.
------------------------------------------------------------------ */

const RETURNED = 'Returned';
const UNKNOWN_PERIOD = 'Tarihsiz';

/** "12.03.2024" ya da ISO tarihini Date'e çevirir; başarısızsa null döner. */
const parseDate = (value) => {
    if (!value || value === '-') return null;
    const raw = String(value).trim();

    const dotted = raw.slice(0, 10).split('.');
    if (dotted.length === 3) {
        const [day, month, year] = dotted;
        const parsed = new Date(Number(year), Number(month) - 1, Number(day));
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
};

/** Gruplama için sıralanabilir dönem anahtarı: "2024-03" */
const periodKey = (date) => (
    date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : UNKNOWN_PERIOD
);

const periodLabel = (key) => {
    if (key === UNKNOWN_PERIOD) return 'Tarihsiz';
    const [year, month] = key.split('-');
    return new Date(Number(year), Number(month) - 1, 1)
        .toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
};

const normalize = (value) => String(value ?? '').toLocaleLowerCase('tr');

/* ------------------------------- alt parçalar ------------------------------- */

const SummaryTile = ({ icon: Icon, label, value, unit, tone = 'bg-white border-gray-200' }) => (
    <div className={`rounded-[18px] border p-4 ${tone}`}>
        <div className="flex items-center gap-2 mb-2">
            <Icon size={13} aria-hidden="true" className="text-gray-500 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 truncate">{label}</p>
        </div>
        <p className="text-[22px] font-semibold text-[#1d1d1f] leading-none">
            {value}
            <span className="text-[11px] font-semibold text-gray-400 ml-1.5">{unit}</span>
        </p>
    </div>
);

/** Arama teriminin eşleşen kısmını vurgular */
const Highlight = ({ text, term }) => {
    const value = String(text ?? '');
    if (!term) return <>{value || '—'}</>;

    const haystack = normalize(value);
    const needle = normalize(term);

    // Türkçe küçültme bazı karakterlerde uzunluğu değiştirebilir; böyle bir
    // durumda ofsetler kayacağı için vurgulamayı atlayıp düz metin gösteriyoruz.
    if (haystack.length !== value.length || needle.length !== term.length) {
        return <>{value || '—'}</>;
    }

    const index = haystack.indexOf(needle);
    if (index === -1) return <>{value || '—'}</>;

    return (
        <>
            {value.slice(0, index)}
            <mark className="bg-[#ffde5c] text-[#1d1d1f] rounded-[3px] px-0.5">
                {value.slice(index, index + term.length)}
            </mark>
            {value.slice(index + term.length)}
        </>
    );
};

const PeriodBlock = ({ period, rows, term }) => (
    <section
        aria-labelledby={`period-${period.key}`}
        className="rounded-[18px] border border-gray-200 bg-white overflow-hidden"
    >
        <header className="flex items-center justify-between gap-3 px-4 py-3 bg-[#f5f5f7]/70 border-b border-gray-200">
            <h5 id={`period-${period.key}`} className="flex items-center gap-2 min-w-0">
                <Calendar size={13} aria-hidden="true" className="text-[#0071e3] shrink-0" />
                <span className="text-[12px] font-semibold text-[#1d1d1f] truncate">{period.label}</span>
            </h5>
            <span className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1 shrink-0">
                {rows.length} parça
            </span>
        </header>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
                <caption className="sr-only">
                    {period.label} döneminde iade edilen KBB parçaları
                </caption>
                <thead>
                    <tr className="border-b border-gray-100">
                        <th scope="col" className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-gray-500">Onarım No</th>
                        <th scope="col" className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-gray-500">Parça</th>
                        <th scope="col" className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-gray-500">KBB Seri No</th>
                        <th scope="col" className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-gray-500">İade Kodu</th>
                        <th scope="col" className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-gray-500">Müşteri</th>
                        <th scope="col" className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-gray-500 text-right">İade Tarihi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.map((row) => (
                        <tr key={row.uniqueId} className="hover:bg-[#f5f5f7]/60 transition-colors">
                            <td className="px-4 py-3">
                                <span className="font-mono text-[11px] font-bold text-[#0071e3]">
                                    <Highlight text={row.repairId} term={term} />
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <p className="text-[12px] font-semibold text-[#1d1d1f]">
                                    <Highlight text={row.name} term={term} />
                                </p>
                                <p className="text-[10px] font-mono font-medium text-gray-500">
                                    <Highlight text={row.partNumber} term={term} />
                                </p>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-gray-600">
                                <Highlight text={row.kbbSerial} term={term} />
                            </td>
                            <td className="px-4 py-3">
                                <span className="font-mono text-[10px] font-bold text-[#1d1d1f] bg-[#f5f5f7] border border-gray-200 rounded px-1.5 py-0.5">
                                    <Highlight text={row.returnCode} term={term} />
                                </span>
                            </td>
                            <td className="px-4 py-3 text-[11px] font-medium text-gray-600 truncate max-w-[180px]">
                                <Highlight text={row.customer} term={term} />
                            </td>
                            <td className="px-4 py-3 text-[11px] font-medium text-gray-500 text-right whitespace-nowrap">
                                {row.returnDate || '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </section>
);

/* --------------------------------- ana ekran --------------------------------- */

const KbbArchive = () => {
    const { repairs, allServicePoints, servicePoints } = useAppContext();
    const points = allServicePoints?.length ? allServicePoints : (servicePoints || []);

    const [term, setTerm] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('all');
    const [collapsed, setCollapsed] = useState([]);

    /** Ambar kimliği -> görünen ad + Ship-To kodu */
    const warehouseOf = useMemo(() => {
        const map = new Map();
        points.forEach(p => map.set(String(p.id), {
            id: String(p.id),
            name: p.name || 'Adsız Ambar',
            shipTo: p.shipTo || '—',
            type: p.type || 'Şube',
        }));
        return map;
    }, [points]);

    /** İade edilmiş tüm KBB parçaları, düz liste halinde */
    const allRows = useMemo(() => {
        const rows = (repairs || []).flatMap(repair =>
            (repair.parts || []).map((part, index) => {
                const date = parseDate(part.returnDate);
                return {
                    uniqueId: `${repair.id}-${index}`,
                    repairId: repair.id,
                    storeId: repair.storeId,
                    customer: repair.customer || '',
                    device: repair.device || '',
                    name: part.description || part.name || 'Tanımsız parça',
                    partNumber: part.partNumber || '',
                    kbbSerial: part.kbbSerial || '',
                    returnCode: part.returnCode || '',
                    returnDate: part.returnDate || '',
                    kbbStatus: part.kbbStatus,
                    date,
                    period: periodKey(date),
                };
            })
        ).filter(row => row.kbbStatus === RETURNED);

        // En yeni iade en üstte
        return rows.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    }, [repairs]);

    /** Filtre açılır listeleri için mevcut ambar / dönem seçenekleri */
    const warehouseOptions = useMemo(() => {
        const seen = new Map();
        allRows.forEach(row => {
            const key = String(row.storeId ?? 'unknown');
            if (!seen.has(key)) {
                const wh = warehouseOf.get(key);
                seen.set(key, {
                    key,
                    label: wh ? `${wh.name} (${wh.shipTo})` : 'Tanımsız Ambar',
                    count: 0,
                });
            }
            seen.get(key).count += 1;
        });
        return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label, 'tr'));
    }, [allRows, warehouseOf]);

    const periodOptions = useMemo(() => {
        const seen = new Map();
        allRows.forEach(row => {
            if (!seen.has(row.period)) seen.set(row.period, { key: row.period, label: periodLabel(row.period), count: 0 });
            seen.get(row.period).count += 1;
        });
        return [...seen.values()].sort((a, b) => {
            if (a.key === UNKNOWN_PERIOD) return 1;
            if (b.key === UNKNOWN_PERIOD) return -1;
            return b.key.localeCompare(a.key);
        });
    }, [allRows]);

    /** Arama + filtreler uygulanmış satırlar */
    const filteredRows = useMemo(() => {
        const q = normalize(term.trim());
        return allRows.filter(row => {
            if (warehouseFilter !== 'all' && String(row.storeId ?? 'unknown') !== warehouseFilter) return false;
            if (periodFilter !== 'all' && row.period !== periodFilter) return false;
            if (!q) return true;

            return [row.name, row.partNumber, row.kbbSerial, row.returnCode, row.repairId, row.customer, row.device]
                .some(field => normalize(field).includes(q));
        });
    }, [allRows, term, warehouseFilter, periodFilter]);

    /** Ambar -> dönem -> satırlar */
    const groups = useMemo(() => {
        const byWarehouse = new Map();

        filteredRows.forEach(row => {
            const key = String(row.storeId ?? 'unknown');
            if (!byWarehouse.has(key)) {
                const wh = warehouseOf.get(key);
                byWarehouse.set(key, {
                    key,
                    name: wh?.name || 'Tanımsız Ambar',
                    shipTo: wh?.shipTo || '—',
                    type: wh?.type || null,
                    rows: [],
                    periods: new Map(),
                });
            }
            const group = byWarehouse.get(key);
            group.rows.push(row);
            if (!group.periods.has(row.period)) {
                group.periods.set(row.period, { key: row.period, label: periodLabel(row.period), rows: [] });
            }
            group.periods.get(row.period).rows.push(row);
        });

        return [...byWarehouse.values()]
            .map(group => ({
                ...group,
                periodList: [...group.periods.values()].sort((a, b) => {
                    if (a.key === UNKNOWN_PERIOD) return 1;
                    if (b.key === UNKNOWN_PERIOD) return -1;
                    return b.key.localeCompare(a.key);
                }),
            }))
            .sort((a, b) => b.rows.length - a.rows.length);
    }, [filteredRows, warehouseOf]);

    const hasFilters = term.trim() !== '' || warehouseFilter !== 'all' || periodFilter !== 'all';

    const clearFilters = () => {
        setTerm('');
        setWarehouseFilter('all');
        setPeriodFilter('all');
    };

    const toggleGroup = (key) => {
        setCollapsed(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
    };

    const uniqueParts = useMemo(
        () => new Set(allRows.map(r => r.partNumber || r.name)).size,
        [allRows]
    );

    const selectClass = 'w-full h-11 pl-4 pr-10 bg-white border border-gray-200 rounded-xl text-[13px] font-semibold text-[#1d1d1f] appearance-none outline-none focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all';

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Başlık + özet */}
            <header className="space-y-6">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3]">Lojistik</p>
                    <h3 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">KBB Arşivi</h3>
                    <p className="text-[13px] font-medium text-gray-500 mt-1">
                        Apple&apos;a iade edilen sökülen parçaların ambar bazlı arşivi. Arama ve filtrelerle aradığınız parçaya ulaşın.
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryTile icon={Undo2} label="Toplam İade" value={allRows.length} unit="parça" tone="bg-[#0071e3]/5 border-[#0071e3]/15" />
                    <SummaryTile icon={Store} label="Ambar" value={warehouseOptions.length} unit="ambar" />
                    <SummaryTile icon={Layers} label="Parça Çeşidi" value={uniqueParts} unit="çeşit" />
                    <SummaryTile icon={Calendar} label="Dönem" value={periodOptions.length} unit="dönem" />
                </div>
            </header>

            {/* Arama & filtreler */}
            <section aria-labelledby="kbb-filter-title" className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6">
                <h4 id="kbb-filter-title" className="sr-only">Arama ve filtreler</h4>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4">
                    <div className="space-y-2">
                        <label htmlFor="kbb-search" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            Parça Ara
                        </label>
                        <div className="relative">
                            <Search size={15} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                id="kbb-search"
                                type="search"
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                placeholder="Parça adı, P/N, KBB seri no, iade kodu, onarım no veya müşteri…"
                                className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="kbb-warehouse" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            Ambar
                        </label>
                        <div className="relative">
                            <select
                                id="kbb-warehouse" className={selectClass}
                                value={warehouseFilter}
                                onChange={(e) => setWarehouseFilter(e.target.value)}
                            >
                                <option value="all">Tüm ambarlar ({allRows.length})</option>
                                {warehouseOptions.map(opt => (
                                    <option key={opt.key} value={opt.key}>{opt.label} ({opt.count})</option>
                                ))}
                            </select>
                            <ChevronDown size={15} aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="kbb-period" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            Dönem
                        </label>
                        <div className="relative">
                            <select
                                id="kbb-period" className={selectClass}
                                value={periodFilter}
                                onChange={(e) => setPeriodFilter(e.target.value)}
                            >
                                <option value="all">Tüm dönemler</option>
                                {periodOptions.map(opt => (
                                    <option key={opt.key} value={opt.key}>{opt.label} ({opt.count})</option>
                                ))}
                            </select>
                            <ChevronDown size={15} aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-5 border-t border-gray-100">
                    <p aria-live="polite" className="text-[12px] font-semibold text-gray-600">
                        {filteredRows.length === allRows.length
                            ? `${allRows.length} kayıt listeleniyor`
                            : `${allRows.length} kayıttan ${filteredRows.length} tanesi eşleşti`}
                    </p>
                    {hasFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12px] font-semibold text-[#0071e3] hover:bg-[#0071e3]/5 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            <X size={14} aria-hidden="true" /> Filtreleri temizle
                        </button>
                    )}
                </div>
            </section>

            {/* Sonuçlar */}
            {allRows.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-gray-300 bg-white/60 py-16 text-center">
                    <Package size={34} aria-hidden="true" className="mx-auto text-gray-300 mb-3" />
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">Arşiv henüz boş</p>
                    <p className="text-[12px] font-medium text-gray-500 mt-1">
                        Apple&apos;a iade edilmiş bir KBB parçası bulunmuyor.
                    </p>
                </div>
            ) : groups.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-gray-300 bg-white/60 py-16 text-center">
                    <FileSearch size={34} aria-hidden="true" className="mx-auto text-gray-300 mb-3" />
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">Eşleşen parça bulunamadı</p>
                    <p className="text-[12px] font-medium text-gray-500 mt-1">
                        Arama terimini değiştirin veya filtreleri temizleyin.
                    </p>
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center gap-1.5 h-10 px-4 mt-5 rounded-xl bg-[#0071e3] text-white text-[12px] font-semibold hover:bg-[#0077ed] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <X size={14} aria-hidden="true" /> Filtreleri temizle
                    </button>
                </div>
            ) : (
                <ul className="space-y-5 list-none p-0 m-0">
                    {groups.map(group => {
                        const isOpen = !collapsed.includes(group.key);
                        const panelId = `kbb-group-${group.key}`;

                        return (
                            <li key={group.key} className="rounded-[24px] border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.key)}
                                    aria-expanded={isOpen}
                                    aria-controls={panelId}
                                    className="w-full flex items-center justify-between gap-4 p-5 text-left bg-[#f5f5f7]/60 hover:bg-[#f5f5f7] transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                >
                                    <span className="flex items-center gap-3.5 min-w-0">
                                        <span
                                            aria-hidden="true"
                                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${group.type === 'Merkez'
                                                ? 'bg-[#1d1d1f] text-white'
                                                : 'bg-white text-[#1d1d1f] border border-gray-200'}`}
                                        >
                                            {group.type === 'Merkez' ? <Building size={19} /> : <MapPin size={19} />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[15px] font-semibold text-[#1d1d1f] truncate">{group.name}</span>
                                            <span className="flex flex-wrap items-center gap-1.5 mt-1">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-[#0071e3] bg-[#0071e3]/8 border border-[#0071e3]/15 rounded-full px-2 py-0.5">
                                                    Ship-To {group.shipTo}
                                                </span>
                                                <span className="text-[10px] font-medium text-gray-500">
                                                    {group.periodList.length} dönem
                                                </span>
                                            </span>
                                        </span>
                                    </span>

                                    <span className="flex items-center gap-3 shrink-0">
                                        <span className="text-[11px] font-bold text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1">
                                            {group.rows.length} parça
                                        </span>
                                        <ChevronDown
                                            size={16}
                                            aria-hidden="true"
                                            className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                                        />
                                    </span>
                                </button>

                                <Collapse open={isOpen}>
                                    {() => (
                                        <div id={panelId} className="p-5 space-y-4 border-t border-gray-100">
                                            {group.periodList.map(period => (
                                                <PeriodBlock
                                                    key={period.key}
                                                    period={period}
                                                    rows={period.rows}
                                                    term={term.trim()}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </Collapse>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* Tanımsız ambar uyarısı */}
            {groups.some(g => g.key === 'unknown' || !warehouseOf.has(g.key)) && (
                <p className="flex items-start gap-2 text-[11px] font-medium text-gray-500">
                    <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5" />
                    &quot;Tanımsız Ambar&quot; altındaki kayıtların bağlı olduğu ambar silinmiş veya servis kaydında ambar bilgisi yok.
                </p>
            )}
        </div>
    );
};

export default KbbArchive;
