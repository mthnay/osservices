import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Package, Store, Building, MapPin, Plus, Trash2, X, Check, ChevronDown,
    AlertTriangle, RefreshCw, Smartphone, Search, Info, ShieldCheck, Layers, Truck
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { appConfirm } from '../utils/alert';
import { isSuperAdmin, isYonetici } from '../utils/permissions';
import Collapse from './ui/Collapse';
import useAnimatedClose from './ui/useAnimatedClose';

/* ------------------------------------------------------------------
   Ambar & Lojistik Yönetimi
   GSX / Apple Business arayüz diline uygun, erişilebilir ambar ekranı.

   Bir ambarın stoğu üç alandan oluşur:
     KGB    -> yeni/sağlam parça  (warehouseType 'KGB', category != 'loaner')
     KBB    -> sökülen eski parça (warehouseType 'KBB')
     Ödünç  -> emanet cihaz       (category 'loaner')
------------------------------------------------------------------ */

const STOCK_AREAS = {
    KGB: {
        key: 'KGB',
        label: 'KGB',
        title: 'Yeni & Sağlam Parça',
        icon: Package,
        accent: 'text-[#0071e3]',
        tile: 'bg-[#0071e3]/5 border-[#0071e3]/15',
        dot: 'bg-[#0071e3]',
    },
    KBB: {
        key: 'KBB',
        label: 'KBB',
        title: 'Sökülen Eski Parça',
        icon: Layers,
        accent: 'text-[#bf5b04]',
        tile: 'bg-[#ff9500]/8 border-[#ff9500]/20',
        dot: 'bg-[#ff9500]',
    },
    loaner: {
        key: 'loaner',
        label: 'Ödünç',
        title: 'Emanet Cihaz',
        icon: Smartphone,
        accent: 'text-[#1d7a4c]',
        tile: 'bg-[#008000]/6 border-[#008000]/18',
        dot: 'bg-[#008000]',
    },
};

const isLoaner = (item) => item?.category === 'loaner';
const isKgb = (item) => !isLoaner(item) && (item?.warehouseType === 'KGB' || !item?.warehouseType);
const isKbb = (item) => !isLoaner(item) && item?.warehouseType === 'KBB';
const sumQty = (list) => list.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
const itemKey = (item) => item?._id || item?.id;

/* --------------------------- küçük parçalar --------------------------- */

const StatTile = ({ icon: Icon, label, value, unit, tone = 'bg-white border-gray-200' }) => (
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

const AreaBadge = ({ area, count, unit }) => {
    const cfg = STOCK_AREAS[area];
    const Icon = cfg.icon;
    return (
        <div className={`rounded-[16px] border p-3.5 ${cfg.tile}`}>
            <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={12} aria-hidden="true" className={cfg.accent} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${cfg.accent}`}>{cfg.label}</span>
            </div>
            <p className="text-[17px] font-semibold text-[#1d1d1f] leading-none">
                {count}
                <span className="text-[10px] font-medium text-gray-500 ml-1">{unit}</span>
            </p>
        </div>
    );
};

/** Ambar detayındaki tek bir stok alanının listesi */
const AreaPanel = ({ area, items }) => {
    const cfg = STOCK_AREAS[area];
    const Icon = cfg.icon;

    return (
        <section aria-labelledby={`area-${area}-title`} className="rounded-[18px] border border-gray-200 bg-white overflow-hidden">
            <header className="flex items-center justify-between gap-3 px-4 py-3 bg-[#f5f5f7]/70 border-b border-gray-200">
                <h5 id={`area-${area}-title`} className="flex items-center gap-2 min-w-0">
                    <Icon size={14} aria-hidden="true" className={cfg.accent} />
                    <span className="text-[12px] font-semibold text-[#1d1d1f] truncate">{cfg.label}</span>
                    <span className="text-[10px] font-medium text-gray-500 truncate hidden sm:inline">· {cfg.title}</span>
                </h5>
                <span className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1 shrink-0">
                    {items.length} kalem
                </span>
            </header>

            {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-[12px] font-medium text-gray-400">
                    Bu alanda kayıtlı stok yok.
                </p>
            ) : (
                <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto custom-scrollbar">
                    {items.map((item) => (
                        <li key={itemKey(item)} className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-[#1d1d1f] truncate">{item.name}</p>
                                <p className="text-[10px] font-medium text-gray-500 truncate">
                                    {isLoaner(item)
                                        ? (item.serialNumber ? `S/N ${item.serialNumber}` : 'Seri no tanımsız')
                                        : (item.partNumber ? `P/N ${item.partNumber}` : 'Parça kodu tanımsız')}
                                    {isLoaner(item) && item.currentCustomer ? ` · ${item.currentCustomer} üzerinde` : ''}
                                </p>
                            </div>
                            {isLoaner(item) ? (
                                <span
                                    className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border shrink-0 ${item.currentCustomer
                                        ? 'text-[#bf5b04] bg-[#ff9500]/10 border-[#ff9500]/25'
                                        : 'text-[#1d7a4c] bg-[#008000]/8 border-[#008000]/20'}`}
                                >
                                    {item.currentCustomer ? 'Dışarıda' : 'Müsait'}
                                </span>
                            ) : (
                                <span className="text-[12px] font-semibold text-[#1d1d1f] shrink-0 tabular-nums">
                                    {item.quantity || 0} <span className="text-[10px] font-medium text-gray-400">adet</span>
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};

/* ------------------------------ ana ekran ------------------------------ */

const WarehouseManagement = () => {
    const {
        allServicePoints, servicePoints, addServicePoint, removeServicePoint,
        inventory, repairs, currentUser, showToast,
        transferInventorySerial, updateInventoryItem,
    } = useAppContext();

    const points = allServicePoints?.length ? allServicePoints : (servicePoints || []);
    const canManage = isSuperAdmin(currentUser) || isYonetici(currentUser);

    const [query, setQuery] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [savingPoint, setSavingPoint] = useState(false);
    const [removingId, setRemovingId] = useState(null);
    const [transferOpen, setTransferOpen] = useState(false);
    const [transferSource, setTransferSource] = useState('');

    const emptyForm = { name: '', shipTo: '', type: 'Şube', address: '', phone: '' };
    const [form, setForm] = useState(emptyForm);
    const [formErrors, setFormErrors] = useState({});

    /** Ambar bazında KGB / KBB / Ödünç dağılımı */
    const statsByPoint = useMemo(() => {
        const map = new Map();
        (points || []).forEach((point) => {
            const items = (inventory || []).filter(i => String(i.storeId) === String(point.id));
            const kgb = items.filter(isKgb);
            const kbb = items.filter(isKbb);
            const loaners = items.filter(isLoaner);
            map.set(String(point.id), {
                kgb, kbb, loaners,
                kgbQty: sumQty(kgb),
                kbbQty: sumQty(kbb),
                loanerCount: loaners.length,
                loanedOut: loaners.filter(l => l.currentCustomer).length,
                totalLines: items.length,
            });
        });
        return map;
    }, [points, inventory]);

    const totals = useMemo(() => {
        let kgb = 0, kbb = 0, loaner = 0;
        statsByPoint.forEach((s) => { kgb += s.kgbQty; kbb += s.kbbQty; loaner += s.loanerCount; });
        return { kgb, kbb, loaner };
    }, [statsByPoint]);

    const visiblePoints = useMemo(() => {
        const q = query.trim().toLocaleLowerCase('tr');
        if (!q) return points;
        return points.filter(p =>
            String(p.name || '').toLocaleLowerCase('tr').includes(q) ||
            String(p.shipTo || '').toLocaleLowerCase('tr').includes(q) ||
            String(p.address || '').toLocaleLowerCase('tr').includes(q)
        );
    }, [points, query]);

    /* ----------------------------- yeni ambar ----------------------------- */

    const validate = () => {
        const errors = {};
        if (!form.name.trim()) errors.name = 'Ambar adı zorunludur.';
        if (!form.shipTo.trim()) errors.shipTo = 'Ambar (Ship-To) kodu zorunludur.';
        else if (points.some(p => String(p.shipTo || '').trim().toLocaleLowerCase('tr') === form.shipTo.trim().toLocaleLowerCase('tr'))) {
            errors.shipTo = 'Bu Ship-To kodu başka bir ambarda kullanılıyor.';
        }
        if (!form.address.trim()) errors.address = 'Adres zorunludur.';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSavingPoint(true);
        try {
            const result = await addServicePoint({
                name: form.name.trim(),
                shipTo: form.shipTo.trim(),
                type: form.type,
                address: form.address.trim(),
                phone: form.phone.trim(),
            });

            if (result?.success) {
                setForm(emptyForm);
                setFormErrors({});
                setShowAddForm(false);
                showToast(`"${form.name.trim()}" ambarı oluşturuldu.`, 'success');
            } else {
                showToast(result?.message || 'Ambar oluşturulamadı.', 'error');
            }
        } finally {
            setSavingPoint(false);
        }
    };

    /* ---------------------------- ambar kaldırma ---------------------------- */

    const handleRemove = async (point) => {
        const stats = statsByPoint.get(String(point.id));
        const linkedRepairs = (repairs || []).filter(r => String(r.storeId) === String(point.id)).length;
        const hasStock = stats && (stats.kgbQty > 0 || stats.kbbQty > 0 || stats.loanerCount > 0);

        const warnings = [];
        if (stats?.kgbQty) warnings.push(`${stats.kgbQty} adet KGB parça`);
        if (stats?.kbbQty) warnings.push(`${stats.kbbQty} adet KBB parça`);
        if (stats?.loanerCount) warnings.push(`${stats.loanerCount} ödünç cihaz`);
        if (linkedRepairs) warnings.push(`${linkedRepairs} servis kaydı`);

        // Not: appConfirm mesajı tek satır düz metin olarak gösterir (HTML etiketleri temizlenir).
        const message = hasStock || linkedRepairs
            ? `"${point.name}" ambarı boş değil — bağlı kayıtlar: ${warnings.join(', ')}. Ambar silinirse bu kayıtlar sahipsiz kalır; önce stoğu başka bir ambara transfer etmeniz önerilir. Yine de kaldırılsın mı?`
            : `"${point.name}" ambarı sistemden kaldırılacak. Bu işlem geri alınamaz. Onaylıyor musunuz?`;

        const confirmed = await appConfirm(message);
        if (!confirmed) return;

        setRemovingId(point.id);
        try {
            const ok = await removeServicePoint(point.id);
            if (ok) {
                if (String(expandedId) === String(point.id)) setExpandedId(null);
                showToast(`"${point.name}" ambarı kaldırıldı.`, 'success');
            } else {
                showToast('Ambar kaldırılamadı. Yetkinizi kontrol edin.', 'error');
            }
        } finally {
            setRemovingId(null);
        }
    };

    const openTransfer = (sourceId = '') => {
        setTransferSource(sourceId ? String(sourceId) : '');
        setTransferOpen(true);
    };

    /* -------------------------------- render -------------------------------- */

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Başlık + genel durum */}
            <header className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3]">Lojistik</p>
                        <h3 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">Ambar & Lojistik Yönetimi</h3>
                        <p className="text-[13px] font-medium text-gray-500 mt-1">
                            Ambarları yönetin, stok alanlarını inceleyin ve ambarlar arası transfer yapın.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => openTransfer()}
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            <RefreshCw size={15} aria-hidden="true" /> Stok Transferi
                        </button>
                        {canManage && (
                            <button
                                type="button"
                                onClick={() => setShowAddForm(v => !v)}
                                aria-expanded={showAddForm}
                                aria-controls="new-warehouse-form"
                                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                            >
                                <Plus size={16} aria-hidden="true" className={showAddForm ? 'rotate-45 transition-transform' : 'transition-transform'} />
                                {showAddForm ? 'Formu Kapat' : 'Yeni Ambar'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatTile icon={Store} label="Toplam Ambar" value={points.length} unit="ambar" />
                    <StatTile icon={Package} label="KGB Stok" value={totals.kgb} unit="adet" tone="bg-[#0071e3]/5 border-[#0071e3]/15" />
                    <StatTile icon={Layers} label="KBB Stok" value={totals.kbb} unit="adet" tone="bg-[#ff9500]/8 border-[#ff9500]/20" />
                    <StatTile icon={Smartphone} label="Ödünç Cihaz" value={totals.loaner} unit="cihaz" tone="bg-[#008000]/6 border-[#008000]/18" />
                </div>
            </header>

            {/* Yeni ambar formu */}
            {canManage && (
                <Collapse open={showAddForm}>
                    <form
                        id="new-warehouse-form"
                        onSubmit={handleAdd}
                        noValidate
                        className="rounded-[24px] border border-[#0071e3]/20 bg-white p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <span className="w-10 h-10 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0">
                                <Plus size={18} aria-hidden="true" />
                            </span>
                            <div>
                                <h4 className="text-[15px] font-semibold text-[#1d1d1f]">Yeni Ambar Tanımla</h4>
                                <p className="text-[12px] font-medium text-gray-500">Ambar oluşturulduğunda KGB, KBB ve ödünç cihaz alanları otomatik açılır.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field
                                id="wh-name" label="Ambar Adı" required error={formErrors.name}
                                value={form.name} onChange={(v) => setForm({ ...form, name: v })}
                                placeholder="Örn: Kadıköy Merkez Ambarı"
                            />
                            <Field
                                id="wh-shipto" label="Ambar Kodu (Ship-To)" required error={formErrors.shipTo}
                                value={form.shipTo} onChange={(v) => setForm({ ...form, shipTo: v })}
                                placeholder="Örn: 0000512345" mono
                            />

                            <div className="space-y-2">
                                <label htmlFor="wh-type" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                    Ambar Tipi
                                </label>
                                <div className="relative">
                                    <select
                                        id="wh-type"
                                        value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                                        className="w-full h-12 pl-4 pr-10 bg-[#f5f5f7] border border-gray-200 rounded-xl text-[13px] font-semibold text-[#1d1d1f] appearance-none outline-none focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                                    >
                                        <option value="Merkez">Merkez Servis Ambarı</option>
                                        <option value="Şube">Şube Ambarı</option>
                                    </select>
                                    <ChevronDown size={15} aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            <Field
                                id="wh-phone" label="Telefon" value={form.phone}
                                onChange={(v) => setForm({ ...form, phone: v })} placeholder="0216 000 00 00"
                            />

                            <div className="md:col-span-2">
                                <Field
                                    id="wh-address" label="Adres" required error={formErrors.address}
                                    value={form.address} onChange={(v) => setForm({ ...form, address: v })}
                                    placeholder="Ambarın açık adresi"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-3 mt-7 pt-6 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => { setShowAddForm(false); setFormErrors({}); }}
                                className="h-11 px-5 rounded-xl text-[13px] font-semibold text-gray-600 hover:bg-[#f5f5f7] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="submit"
                                disabled={savingPoint}
                                className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                            >
                                <Check size={16} aria-hidden="true" />
                                {savingPoint ? 'Kaydediliyor…' : 'Ambarı Oluştur'}
                            </button>
                        </div>
                    </form>
                </Collapse>
            )}

            {/* Arama */}
            <div className="relative max-w-md">
                <label htmlFor="wh-search" className="sr-only">Ambar ara</label>
                <Search size={15} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                    id="wh-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ambar adı, kod veya adres ara…"
                    className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                />
            </div>

            {/* Ambar listesi */}
            {visiblePoints.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-gray-300 bg-white/60 py-16 text-center">
                    <Store size={34} aria-hidden="true" className="mx-auto text-gray-300 mb-3" />
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">
                        {query ? 'Aramayla eşleşen ambar yok' : 'Henüz ambar tanımlanmamış'}
                    </p>
                    <p className="text-[12px] font-medium text-gray-500 mt-1">
                        {query ? 'Farklı bir arama deneyin.' : 'Başlamak için "Yeni Ambar" ile ilk ambarınızı oluşturun.'}
                    </p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 xl:grid-cols-2 gap-5 list-none p-0 m-0">
                    {visiblePoints.map((point) => {
                        const stats = statsByPoint.get(String(point.id)) || {
                            kgb: [], kbb: [], loaners: [], kgbQty: 0, kbbQty: 0, loanerCount: 0, loanedOut: 0,
                        };
                        const isExpanded = String(expandedId) === String(point.id);
                        const panelId = `warehouse-detail-${point.id}`;
                        const isRemoving = removingId === point.id;

                        return (
                            <li
                                key={point.id}
                                className="rounded-[24px] border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden"
                            >
                                <div className="p-5 sm:p-6">
                                    <div className="flex items-start justify-between gap-4 mb-5">
                                        <div className="flex items-start gap-3.5 min-w-0">
                                            <span
                                                aria-hidden="true"
                                                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${point.type === 'Merkez'
                                                    ? 'bg-[#1d1d1f] text-white'
                                                    : 'bg-[#f5f5f7] text-[#1d1d1f] border border-gray-200'}`}
                                            >
                                                {point.type === 'Merkez' ? <Building size={19} /> : <MapPin size={19} />}
                                            </span>
                                            <div className="min-w-0">
                                                <h4 className="text-[16px] font-semibold text-[#1d1d1f] truncate">{point.name}</h4>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#0071e3] bg-[#0071e3]/8 border border-[#0071e3]/15 rounded-full px-2 py-0.5">
                                                        Ship-To {point.shipTo || '—'}
                                                    </span>
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600 bg-[#f5f5f7] border border-gray-200 rounded-full px-2 py-0.5">
                                                        {point.type || 'Şube'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(point)}
                                                disabled={isRemoving}
                                                aria-label={`${point.name} ambarını kaldır`}
                                                className="h-9 w-9 shrink-0 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#e30000] hover:border-[#e30000]/30 hover:bg-[#e30000]/5 disabled:opacity-40 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#e30000]/25"
                                            >
                                                <Trash2 size={15} aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Stok alanları özeti */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <AreaBadge area="KGB" count={stats.kgbQty} unit="adet" />
                                        <AreaBadge area="KBB" count={stats.kbbQty} unit="adet" />
                                        <AreaBadge area="loaner" count={stats.loanerCount} unit="cihaz" />
                                    </div>

                                    {stats.loanedOut > 0 && (
                                        <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#bf5b04] mt-3">
                                            <Info size={12} aria-hidden="true" />
                                            {stats.loanedOut} ödünç cihaz müşteride.
                                        </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(isExpanded ? null : point.id)}
                                            aria-expanded={isExpanded}
                                            aria-controls={panelId}
                                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12px] font-semibold text-[#0071e3] hover:bg-[#0071e3]/5 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                        >
                                            {isExpanded ? 'Detayı gizle' : 'Stok detayı'}
                                            <ChevronDown
                                                size={14}
                                                aria-hidden="true"
                                                className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openTransfer(point.id)}
                                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12px] font-semibold text-gray-600 hover:bg-[#f5f5f7] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                        >
                                            <Truck size={14} aria-hidden="true" /> Bu ambardan transfer
                                        </button>
                                    </div>
                                </div>

                                <Collapse open={isExpanded}>
                                    {() => (
                                        <div id={panelId} className="px-5 sm:px-6 pb-6 pt-1 bg-[#f5f5f7]/50 border-t border-gray-100 space-y-4">
                                            <AreaPanel area="KGB" items={stats.kgb} />
                                            <AreaPanel area="KBB" items={stats.kbb} />
                                            <AreaPanel area="loaner" items={stats.loaners} />
                                        </div>
                                    )}
                                </Collapse>
                            </li>
                        );
                    })}
                </ul>
            )}

            {transferOpen && (
                <TransferDialog
                    points={points}
                    inventory={inventory}
                    initialSource={transferSource}
                    onClose={() => setTransferOpen(false)}
                    transferInventorySerial={transferInventorySerial}
                    updateInventoryItem={updateInventoryItem}
                    showToast={showToast}
                />
            )}
        </div>
    );
};

/* ------------------------------ form alanı ------------------------------ */

const Field = ({ id, label, value, onChange, placeholder, required, error, mono }) => (
    <div className="space-y-2">
        <label htmlFor={id} className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {label} {required && <span className="text-[#e30000]" aria-hidden="true">*</span>}
        </label>
        <input
            id={id}
            type="text"
            value={value}
            required={required}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full h-12 px-4 bg-[#f5f5f7] border rounded-xl text-[13px] font-semibold text-[#1d1d1f] outline-none focus:bg-white transition-all focus-visible:ring-4 ${mono ? 'font-mono' : ''} ${error
                ? 'border-[#e30000] focus:border-[#e30000] focus-visible:ring-[#e30000]/25'
                : 'border-gray-200 focus:border-[#0071e3] focus-visible:ring-[#0071e3]/25'}`}
        />
        {error && (
            <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#e30000]">
                <AlertTriangle size={12} aria-hidden="true" /> {error}
            </p>
        )}
    </div>
);

/* ---------------------------- transfer diyaloğu ---------------------------- */

const TransferDialog = ({
    points, inventory, initialSource, onClose,
    transferInventorySerial, updateInventoryItem, showToast,
}) => {
    const { closing, requestClose } = useAnimatedClose(onClose, 200);
    const dialogRef = useRef(null);

    const [area, setArea] = useState('KGB');
    const [sourceId, setSourceId] = useState(initialSource || '');
    const [targetId, setTargetId] = useState('');
    const [itemId, setItemId] = useState('');
    const [serials, setSerials] = useState([]);
    const [busy, setBusy] = useState(false);

    // Açılışta odağı diyaloğa taşı (yalnızca bir kez — aksi halde
    // her render'da odak kullanıcının yazdığı alandan çalınır).
    useEffect(() => { dialogRef.current?.focus(); }, []);

    const closeRef = useRef(requestClose);
    closeRef.current = requestClose;
    useEffect(() => {
        const onKeyDown = (e) => { if (e.key === 'Escape') closeRef.current(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    // Seçili ambardaki, seçili alana ait aktarılabilir kalemler
    const sourceItems = useMemo(() => {
        if (!sourceId) return [];
        const items = (inventory || []).filter(i => String(i.storeId) === String(sourceId));
        if (area === 'loaner') return items.filter(isLoaner);
        if (area === 'KBB') return items.filter(i => isKbb(i) && (i.kbbSerials || []).length > 0);
        return items.filter(i => isKgb(i) && (i.kgbSerials || []).length > 0);
    }, [inventory, sourceId, area]);

    const selectedItem = useMemo(
        () => sourceItems.find(i => String(itemKey(i)) === String(itemId)),
        [sourceItems, itemId]
    );

    const availableSerials = useMemo(() => {
        if (!selectedItem || area === 'loaner') return [];
        return (area === 'KBB' ? selectedItem.kbbSerials : selectedItem.kgbSerials) || [];
    }, [selectedItem, area]);

    const resetSelection = () => {
        setItemId('');
        setSerials([]);
    };

    const canSubmit = Boolean(
        sourceId && targetId && itemId &&
        String(sourceId) !== String(targetId) &&
        (area === 'loaner' || serials.length > 0)
    );

    const handleSubmit = async () => {
        if (!canSubmit || busy) return;
        setBusy(true);
        try {
            let ok = false;

            if (area === 'loaner') {
                // Ödünç cihaz tek parça halinde taşınır; seri bazlı bölme yapılmaz.
                if (selectedItem?.currentCustomer) {
                    showToast('Müşteride olan ödünç cihaz transfer edilemez.', 'error');
                    return;
                }
                ok = await updateInventoryItem(itemKey(selectedItem), { storeId: Number(targetId) });
            } else {
                ok = await transferInventorySerial(
                    itemId,
                    Number(targetId),
                    serials,
                    area === 'KBB' ? 'kbb' : 'kgb'
                );
            }

            if (ok) {
                const targetName = points.find(p => String(p.id) === String(targetId))?.name || 'hedef ambar';
                showToast(
                    area === 'loaner'
                        ? `Ödünç cihaz ${targetName} ambarına taşındı.`
                        : `${serials.length} adet ${area} parça ${targetName} ambarına transfer edildi.`,
                    'success'
                );
                requestClose();
            } else if (area === 'loaner') {
                // Ödünç cihaz taşıma envanter güncelleme yetkisi ister
                // (sunucu: superadmin veya mağaza sorumlusu).
                showToast('Ödünç cihaz taşınamadı. Bu işlem için envanter güncelleme yetkisi gerekir.', 'error');
            } else {
                showToast('Transfer tamamlanamadı. Lütfen tekrar deneyin.', 'error');
            }
        } finally {
            setBusy(false);
        }
    };

    const selectClass = 'w-full h-12 pl-4 pr-10 bg-[#f5f5f7] border border-gray-200 rounded-xl text-[13px] font-semibold text-[#1d1d1f] appearance-none outline-none focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <div
            className={`fixed inset-0 z-[120] bg-[#1d1d1f]/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 ${closing ? 'animate-out fade-out duration-200 pointer-events-none' : 'animate-in fade-in'}`}
            onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="transfer-title"
                tabIndex={-1}
                className={`bg-white w-full max-w-2xl rounded-[24px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh] outline-none ${closing ? 'animate-out fade-out zoom-out-95 duration-200' : 'animate-scale-up'}`}
            >
                <header className="flex items-center justify-between gap-4 px-6 sm:px-7 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0">
                            <RefreshCw size={19} />
                        </span>
                        <div className="min-w-0">
                            <h3 id="transfer-title" className="text-[17px] font-semibold text-[#1d1d1f] truncate">Ambarlar Arası Stok Transferi</h3>
                            <p className="text-[12px] font-medium text-gray-500 truncate">Kaynak ve hedef ambarı seçip aktarılacak stoğu belirleyin.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        aria-label="Transfer penceresini kapat"
                        className="h-10 w-10 shrink-0 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                <div className="p-6 sm:p-7 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Stok alanı seçimi */}
                    <fieldset>
                        <legend className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2.5">Stok Alanı</legend>
                        {/* Gerçek radio grubu: ok tuşlarıyla gezinme tarayıcıdan gelir */}
                        <div className="grid grid-cols-3 gap-2.5">
                            {Object.values(STOCK_AREAS).map((cfg) => {
                                const Icon = cfg.icon;
                                const active = area === cfg.key;
                                return (
                                    <label
                                        key={cfg.key}
                                        className={`flex flex-col items-start gap-1.5 p-3.5 rounded-[16px] border cursor-pointer transition-all has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#0071e3]/25 ${active
                                            ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-sm shadow-[#0071e3]/20'
                                            : 'bg-white border-gray-200 text-[#1d1d1f] hover:bg-[#f5f5f7]'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="stock-area"
                                            value={cfg.key}
                                            checked={active}
                                            onChange={() => { setArea(cfg.key); resetSelection(); }}
                                            className="sr-only"
                                        />
                                        <Icon size={15} aria-hidden="true" className={active ? 'text-white' : cfg.accent} />
                                        <span className="text-[12px] font-semibold">{cfg.label}</span>
                                        <span className={`text-[10px] font-medium leading-tight ${active ? 'text-white/75' : 'text-gray-500'}`}>
                                            {cfg.title}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>

                    {/* Kaynak / hedef */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label htmlFor="tr-source" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Kaynak Ambar <span className="text-[#e30000]" aria-hidden="true">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    id="tr-source" className={selectClass} value={sourceId}
                                    onChange={(e) => { setSourceId(e.target.value); resetSelection(); }}
                                >
                                    <option value="">Seçiniz…</option>
                                    {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <ChevronDown size={15} aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="tr-target" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Hedef Ambar <span className="text-[#e30000]" aria-hidden="true">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    id="tr-target" className={selectClass} value={targetId}
                                    disabled={!sourceId}
                                    onChange={(e) => setTargetId(e.target.value)}
                                >
                                    <option value="">Seçiniz…</option>
                                    {points.filter(p => String(p.id) !== String(sourceId)).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={15} aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Kalem seçimi */}
                    <div className="space-y-2">
                        <label htmlFor="tr-item" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            {area === 'loaner' ? 'Ödünç Cihaz' : 'Transfer Edilecek Parça'} <span className="text-[#e30000]" aria-hidden="true">*</span>
                        </label>
                        <div className="relative">
                            <select
                                id="tr-item" className={selectClass} value={itemId}
                                disabled={!sourceId || sourceItems.length === 0}
                                onChange={(e) => { setItemId(e.target.value); setSerials([]); }}
                            >
                                <option value="">{sourceItems.length === 0 ? 'Aktarılabilir kayıt yok' : 'Seçiniz…'}</option>
                                {sourceItems.map(i => (
                                    <option key={itemKey(i)} value={itemKey(i)}>
                                        {area === 'loaner'
                                            ? `${i.name}${i.serialNumber ? ` — ${i.serialNumber}` : ''}${i.currentCustomer ? ' (müşteride)' : ''}`
                                            : `${i.name}${i.partNumber ? ` (${i.partNumber})` : ''} — ${(area === 'KBB' ? i.kbbSerials : i.kgbSerials || []).length} seri`}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={15} aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        {sourceId && sourceItems.length === 0 && (
                            <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                                <Info size={12} aria-hidden="true" />
                                Bu ambarın {STOCK_AREAS[area].label} alanında transfer edilebilir kayıt bulunmuyor.
                            </p>
                        )}
                    </div>

                    {/* Seri seçimi (KGB / KBB) */}
                    <Collapse open={Boolean(itemId && area !== 'loaner')}>
                        {() => (
                            <div role="group" aria-labelledby="serials-label" className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <span id="serials-label" className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Seri Numaraları</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-[#0071e3] bg-[#0071e3]/8 border border-[#0071e3]/15 rounded-full px-2.5 py-1">
                                            {serials.length} / {availableSerials.length} seçili
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSerials(serials.length === availableSerials.length ? [] : [...availableSerials])}
                                            className="text-[11px] font-semibold text-[#0071e3] hover:underline outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 rounded px-1"
                                        >
                                            {serials.length === availableSerials.length ? 'Temizle' : 'Tümünü seç'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar p-3 bg-[#f5f5f7] rounded-[18px] border border-gray-200">
                                    {availableSerials.map(sn => {
                                        const checked = serials.includes(sn);
                                        return (
                                            <label
                                                key={sn}
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked
                                                    ? 'bg-white border-[#0071e3] shadow-sm'
                                                    : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 accent-[#0071e3]"
                                                    checked={checked}
                                                    onChange={(e) => setSerials(prev => (
                                                        e.target.checked ? [...prev, sn] : prev.filter(s => s !== sn)
                                                    ))}
                                                />
                                                <span className="text-[11px] font-mono font-semibold text-[#1d1d1f] truncate">{sn}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </Collapse>

                    {/* Ödünç cihaz bilgisi */}
                    {area === 'loaner' && selectedItem && (
                        <div className={`flex items-start gap-2.5 p-4 rounded-[16px] border ${selectedItem.currentCustomer
                            ? 'bg-[#ff9500]/8 border-[#ff9500]/25'
                            : 'bg-[#f5f5f7] border-gray-200'}`}>
                            {selectedItem.currentCustomer
                                ? <AlertTriangle size={15} aria-hidden="true" className="text-[#bf5b04] shrink-0 mt-0.5" />
                                : <ShieldCheck size={15} aria-hidden="true" className="text-[#1d7a4c] shrink-0 mt-0.5" />}
                            <p className="text-[12px] font-medium text-[#1d1d1f]">
                                {selectedItem.currentCustomer
                                    ? `Bu cihaz şu anda ${selectedItem.currentCustomer} üzerinde. Transfer için önce cihazın iade alınması gerekir.`
                                    : 'Cihaz müsait. Transfer edildiğinde tüm kayıt hedef ambara taşınır.'}
                            </p>
                        </div>
                    )}
                </div>

                <footer className="px-6 sm:px-7 py-5 bg-[#f5f5f7] border-t border-gray-200 flex flex-wrap gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={requestClose}
                        className="flex-1 h-12 rounded-xl text-[13px] font-semibold text-gray-600 hover:bg-gray-200/70 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        Vazgeç
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit || busy}
                        className="flex-[2] inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <RefreshCw size={16} aria-hidden="true" />
                        {busy ? 'Transfer ediliyor…' : 'Transferi Gerçekleştir'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default WarehouseManagement;
