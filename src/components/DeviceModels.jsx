import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Smartphone, Tablet, Laptop, Watch, Headphones, Package, Search, X, Plus,
    Edit, Trash2, ChevronDown, AlertTriangle, Database, Check, Info, Layers
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { appConfirm } from '../utils/alert';
import { isSuperAdmin, isYonetici } from '../utils/permissions';
import {
    DEVICE_TYPES, FALLBACK_DEVICE_CATALOG, buildDeviceCombinations,
    normalizeDeviceModel, resolveDeviceCatalog,
} from '../utils/deviceCatalog';
import Collapse from './ui/Collapse';
import useAnimatedClose from './ui/useAnimatedClose';

/* ------------------------------------------------------------------
   Cihaz Modelleri Veritabanı
   Servis kabul ekranındaki cihaz arama listesiyle aynı kaynağı kullanır
   (bkz. utils/deviceCatalog). Kategori bazlı gruplama + arama/filtre.
------------------------------------------------------------------ */

const TYPE_META = {
    iPhone: { icon: Smartphone, accent: 'text-[#0071e3]', tile: 'bg-[#0071e3]/5 border-[#0071e3]/15' },
    iPad: { icon: Tablet, accent: 'text-[#6b46c1]', tile: 'bg-[#6b46c1]/5 border-[#6b46c1]/15' },
    Mac: { icon: Laptop, accent: 'text-[#bf5b04]', tile: 'bg-[#ff9500]/8 border-[#ff9500]/20' },
    Watch: { icon: Watch, accent: 'text-[#1d7a4c]', tile: 'bg-[#008000]/6 border-[#008000]/18' },
    AirPods: { icon: Headphones, accent: 'text-[#0f7b8a]', tile: 'bg-[#0f7b8a]/6 border-[#0f7b8a]/18' },
    Vision: { icon: Layers, accent: 'text-[#7c3aed]', tile: 'bg-[#7c3aed]/5 border-[#7c3aed]/15' },
    Aksesuar: { icon: Package, accent: 'text-gray-600', tile: 'bg-gray-50 border-gray-200' },
    'Diğer': { icon: Package, accent: 'text-gray-600', tile: 'bg-gray-50 border-gray-200' },
};

const metaFor = (type) => TYPE_META[type] || TYPE_META['Diğer'];
const normalize = (value) => String(value ?? '').toLocaleLowerCase('tr');

/* --------------------------------- alt parçalar --------------------------------- */

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

const Chip = ({ children, tone = 'bg-[#f5f5f7] text-gray-700 border-gray-200' }) => (
    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${tone}`}>{children}</span>
);

/* ---------------------------------- ana ekran ---------------------------------- */

const DeviceModels = () => {
    const {
        deviceModels, addDeviceModel, updateDeviceModel, removeDeviceModel,
        importDeviceModels, currentUser,
    } = useAppContext();

    const canManage = isSuperAdmin(currentUser) || isYonetici(currentUser);

    const [term, setTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [collapsed, setCollapsed] = useState([]);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [importing, setImporting] = useState(false);

    // Servis kabul ekranıyla birebir aynı kaynak
    const { models, source } = useMemo(() => resolveDeviceCatalog(deviceModels), [deviceModels]);

    const withVariants = useMemo(
        () => models.map(model => ({ ...model, variantCount: buildDeviceCombinations(model).length })),
        [models]
    );

    const filtered = useMemo(() => {
        const q = normalize(term.trim());
        return withVariants.filter(model => {
            if (typeFilter !== 'all' && model.type !== typeFilter) return false;
            if (!q) return true;
            return normalize(model.name).includes(q)
                || (model.configurations || []).some(c => normalize(c).includes(q))
                || (model.colors || []).some(c => normalize(c).includes(q));
        });
    }, [withVariants, term, typeFilter]);

    /** Kategori -> modeller */
    const groups = useMemo(() => {
        const map = new Map();
        filtered.forEach(model => {
            if (!map.has(model.type)) map.set(model.type, []);
            map.get(model.type).push(model);
        });
        return DEVICE_TYPES
            .filter(type => map.has(type))
            .map(type => ({
                type,
                models: map.get(type).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
            }));
    }, [filtered]);

    const typeCounts = useMemo(() => {
        const counts = new Map();
        withVariants.forEach(m => counts.set(m.type, (counts.get(m.type) || 0) + 1));
        return counts;
    }, [withVariants]);

    const totalVariants = useMemo(
        () => withVariants.reduce((sum, m) => sum + m.variantCount, 0),
        [withVariants]
    );

    const hasFilters = term.trim() !== '' || typeFilter !== 'all';
    const clearFilters = () => { setTerm(''); setTypeFilter('all'); };

    const toggleGroup = (type) => {
        setCollapsed(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));
    };

    const openEditor = (model = null) => {
        setEditing(model);
        setEditorOpen(true);
    };

    const handleDelete = async (model) => {
        const confirmed = await appConfirm(
            `"${model.name}" modeli cihaz veritabanından silinecek. Servis kabul ekranındaki cihaz önerilerinden de kalkar. Onaylıyor musunuz?`
        );
        if (confirmed) await removeDeviceModel(model._id || model.id);
    };

    const handleImport = async () => {
        const confirmed = await appConfirm(
            `Yerleşik Apple kataloğundaki ${FALLBACK_DEVICE_CATALOG.length} model veritabanına aktarılacak. Mevcut kayıtlar silinmez, aynı isimli modeller atlanır. Devam edilsin mi?`
        );
        if (!confirmed) return;

        setImporting(true);
        try {
            await importDeviceModels(FALLBACK_DEVICE_CATALOG.map(normalizeDeviceModel));
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Başlık */}
            <header className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3]">Katalog</p>
                        <h3 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">Cihaz Modelleri Veritabanı</h3>
                        <p className="text-[13px] font-medium text-gray-500 mt-1">
                            Servis kabul ekranındaki cihaz önerileri birebir bu listeden gelir.
                        </p>
                    </div>

                    {canManage && (
                        <button
                            type="button"
                            onClick={() => openEditor(null)}
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            <Plus size={16} aria-hidden="true" /> Yeni Model
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryTile icon={Database} label="Toplam Model" value={models.length} unit="model" tone="bg-[#0071e3]/5 border-[#0071e3]/15" />
                    <SummaryTile icon={Layers} label="Kategori" value={groups.length || typeCounts.size} unit="kategori" />
                    <SummaryTile icon={Package} label="Varyant" value={totalVariants} unit="seçenek" />
                    <SummaryTile
                        icon={source === 'db' ? Check : AlertTriangle}
                        label="Kaynak"
                        value={source === 'db' ? 'Veritabanı' : 'Yerleşik'}
                        unit=""
                        tone={source === 'db' ? 'bg-[#008000]/6 border-[#008000]/18' : 'bg-[#ff9500]/8 border-[#ff9500]/20'}
                    />
                </div>
            </header>

            {/* Kaynak uyarısı: veritabanı boşsa yerleşik katalog devrede */}
            {source === 'fallback' && (
                <div className="rounded-[24px] border border-[#ff9500]/25 bg-[#ff9500]/8 p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <AlertTriangle size={18} aria-hidden="true" className="text-[#bf5b04] shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <h4 className="text-[14px] font-semibold text-[#1d1d1f]">Veritabanı boş — yerleşik katalog kullanılıyor</h4>
                                <p className="text-[12px] font-medium text-gray-600 mt-1 max-w-2xl">
                                    Şu anda hem bu ekran hem servis kabul ekranı uygulamayla gelen {FALLBACK_DEVICE_CATALOG.length} modelden
                                    besleniyor. Kataloğu veritabanına aktarırsanız modelleri düzenleyebilir, silebilir ve yeni model ekleyebilirsiniz.
                                </p>
                            </div>
                        </div>
                        {canManage && (
                            <button
                                type="button"
                                onClick={handleImport}
                                disabled={importing}
                                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#1d1d1f] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 shrink-0"
                            >
                                <Database size={16} aria-hidden="true" />
                                {importing ? 'Aktarılıyor…' : 'Veritabanına Aktar'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Arama & kategori filtresi */}
            <section aria-labelledby="dm-filter-title" className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6">
                <h4 id="dm-filter-title" className="sr-only">Arama ve kategori filtresi</h4>

                <div className="space-y-2">
                    <label htmlFor="dm-search" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Model Ara
                    </label>
                    <div className="relative">
                        <Search size={15} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            id="dm-search"
                            type="search"
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            placeholder="Model adı, kapasite veya renk ara…"
                            className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                        />
                    </div>
                </div>

                <div className="mt-5">
                    <p id="dm-type-label" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2.5">Kategori</p>
                    <div role="group" aria-labelledby="dm-type-label" className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setTypeFilter('all')}
                            aria-pressed={typeFilter === 'all'}
                            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12px] font-semibold border transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${typeFilter === 'all'
                                ? 'bg-[#1d1d1f] border-[#1d1d1f] text-white'
                                : 'bg-white border-gray-200 text-[#1d1d1f] hover:bg-[#f5f5f7]'}`}
                        >
                            Tümü <span className="opacity-60">({withVariants.length})</span>
                        </button>

                        {DEVICE_TYPES.filter(type => typeCounts.has(type)).map(type => {
                            const meta = metaFor(type);
                            const Icon = meta.icon;
                            const active = typeFilter === type;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setTypeFilter(type)}
                                    aria-pressed={active}
                                    className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12px] font-semibold border transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active
                                        ? 'bg-[#1d1d1f] border-[#1d1d1f] text-white'
                                        : 'bg-white border-gray-200 text-[#1d1d1f] hover:bg-[#f5f5f7]'}`}
                                >
                                    <Icon size={13} aria-hidden="true" className={active ? 'text-white' : meta.accent} />
                                    {type} <span className="opacity-60">({typeCounts.get(type)})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-5 border-t border-gray-100">
                    <p aria-live="polite" className="text-[12px] font-semibold text-gray-600">
                        {filtered.length === withVariants.length
                            ? `${withVariants.length} model listeleniyor`
                            : `${withVariants.length} modelden ${filtered.length} tanesi eşleşti`}
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

            {/* Kategori grupları */}
            {groups.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-gray-300 bg-white/60 py-16 text-center">
                    <Smartphone size={34} aria-hidden="true" className="mx-auto text-gray-300 mb-3" />
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">Eşleşen model bulunamadı</p>
                    <p className="text-[12px] font-medium text-gray-500 mt-1">Arama terimini değiştirin veya filtreleri temizleyin.</p>
                </div>
            ) : (
                <ul className="space-y-5 list-none p-0 m-0">
                    {groups.map(group => {
                        const meta = metaFor(group.type);
                        const Icon = meta.icon;
                        const isOpen = !collapsed.includes(group.type);
                        const panelId = `dm-group-${group.type}`;

                        return (
                            <li key={group.type} className="rounded-[24px] border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.type)}
                                    aria-expanded={isOpen}
                                    aria-controls={panelId}
                                    className="w-full flex items-center justify-between gap-4 p-5 text-left bg-[#f5f5f7]/60 hover:bg-[#f5f5f7] transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                >
                                    <span className="flex items-center gap-3.5 min-w-0">
                                        <span aria-hidden="true" className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${meta.tile}`}>
                                            <Icon size={19} className={meta.accent} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[15px] font-semibold text-[#1d1d1f]">{group.type}</span>
                                            <span className="block text-[11px] font-medium text-gray-500 mt-0.5">
                                                {group.models.reduce((sum, m) => sum + m.variantCount, 0)} seçilebilir varyant
                                            </span>
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-3 shrink-0">
                                        <span className="text-[11px] font-bold text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1">
                                            {group.models.length} model
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
                                        <ul id={panelId} className="divide-y divide-gray-100 border-t border-gray-100 list-none p-0 m-0">
                                            {group.models.map(model => (
                                                <li key={model._id || model.id || model.name} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 hover:bg-[#f5f5f7]/50 transition-colors">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h5 className="text-[14px] font-semibold text-[#1d1d1f]">{model.name}</h5>
                                                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#0071e3] bg-[#0071e3]/8 border border-[#0071e3]/15 rounded-full px-2 py-0.5">
                                                                {model.variantCount} varyant
                                                            </span>
                                                        </div>

                                                        {(model.configurations?.length > 0 || model.colors?.length > 0) ? (
                                                            <div className="mt-2.5 space-y-1.5">
                                                                {model.configurations?.length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 w-16 shrink-0">Seçenek</span>
                                                                        {model.configurations.map((config, i) => <Chip key={`${config}-${i}`}>{config}</Chip>)}
                                                                    </div>
                                                                )}
                                                                {model.colors?.length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 w-16 shrink-0">Renk</span>
                                                                        {model.colors.map((color, i) => (
                                                                            <Chip key={`${color}-${i}`} tone="bg-[#0071e3]/5 text-[#0071e3] border-[#0071e3]/15">{color}</Chip>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-[11px] font-medium text-gray-400 mt-2">
                                                                Seçenek/renk tanımlı değil — yalnızca model adı önerilir.
                                                            </p>
                                                        )}
                                                    </div>

                                                    {canManage && source === 'db' && (
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditor(model)}
                                                                aria-label={`${model.name} modelini düzenle`}
                                                                className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#0071e3] hover:border-[#0071e3]/30 hover:bg-[#0071e3]/5 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                                            >
                                                                <Edit size={15} aria-hidden="true" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(model)}
                                                                aria-label={`${model.name} modelini sil`}
                                                                className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#e30000] hover:border-[#e30000]/30 hover:bg-[#e30000]/5 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#e30000]/25"
                                                            >
                                                                <Trash2 size={15} aria-hidden="true" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Collapse>
                            </li>
                        );
                    })}
                </ul>
            )}

            <p className="flex items-start gap-2 text-[11px] font-medium text-gray-500">
                <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5" />
                Varyant sayısı, servis kabul ekranında aranabilir hale gelen tam cihaz tanımı sayısıdır
                (örn. &quot;iPhone 15 Pro, 256 GB, Blue Titanium&quot;).
            </p>

            {editorOpen && (
                <DeviceModelEditor
                    model={editing}
                    onClose={() => { setEditorOpen(false); setEditing(null); }}
                    addDeviceModel={addDeviceModel}
                    updateDeviceModel={updateDeviceModel}
                />
            )}
        </div>
    );
};

/* ------------------------------- ekleme / düzenleme ------------------------------- */

const splitList = (value) => String(value || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

const DeviceModelEditor = ({ model, onClose, addDeviceModel, updateDeviceModel }) => {
    const { closing, requestClose } = useAnimatedClose(onClose, 200);
    const dialogRef = useRef(null);
    const isEdit = Boolean(model);

    const [form, setForm] = useState(() => ({
        name: model?.name || '',
        type: model?.type || 'iPhone',
        configurations: (model?.configurations || []).join(', '),
        colors: (model?.colors || []).join(', '),
    }));
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => { dialogRef.current?.focus(); }, []);

    const closeRef = useRef(requestClose);
    closeRef.current = requestClose;
    useEffect(() => {
        const onKeyDown = (e) => { if (e.key === 'Escape') closeRef.current(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    const preview = useMemo(() => buildDeviceCombinations({
        name: form.name.trim() || 'Cihaz',
        configurations: splitList(form.configurations),
        colors: splitList(form.colors),
    }), [form]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (busy) return;

        if (!form.name.trim()) {
            setError('Cihaz model adı zorunludur.');
            return;
        }
        setError('');
        setBusy(true);

        try {
            const payload = {
                name: form.name.trim(),
                type: form.type,
                configurations: splitList(form.configurations),
                colors: splitList(form.colors),
            };

            const ok = isEdit
                ? await updateDeviceModel(model._id || model.id, payload)
                : await addDeviceModel(payload);

            if (ok) requestClose();
        } finally {
            setBusy(false);
        }
    };

    const fieldClass = 'w-full h-12 px-4 bg-[#f5f5f7] border border-gray-200 rounded-xl text-[13px] font-semibold text-[#1d1d1f] outline-none focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all';

    return (
        <div
            className={`fixed inset-0 z-[120] bg-[#1d1d1f]/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 ${closing ? 'animate-out fade-out duration-200 pointer-events-none' : 'animate-in fade-in'}`}
            onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
        >
            <form
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dm-editor-title"
                tabIndex={-1}
                noValidate
                onSubmit={handleSubmit}
                className={`bg-white w-full max-w-xl rounded-[24px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh] outline-none ${closing ? 'animate-out fade-out zoom-out-95 duration-200' : 'animate-scale-up'}`}
            >
                <header className="flex items-center justify-between gap-4 px-6 sm:px-7 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0">
                            <Smartphone size={19} />
                        </span>
                        <div className="min-w-0">
                            <h3 id="dm-editor-title" className="text-[17px] font-semibold text-[#1d1d1f] truncate">
                                {isEdit ? 'Cihaz Modelini Düzenle' : 'Yeni Cihaz Modeli'}
                            </h3>
                            <p className="text-[12px] font-medium text-gray-500 truncate">
                                Servis kabul ekranındaki önerileri doğrudan etkiler.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        aria-label="Pencereyi kapat"
                        className="h-10 w-10 shrink-0 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                <div className="p-6 sm:p-7 space-y-5 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <label htmlFor="dm-name" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            Cihaz Model Adı <span className="text-[#e30000]" aria-hidden="true">*</span>
                        </label>
                        <input
                            id="dm-name"
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Örn: iPhone 15 Pro"
                            aria-invalid={error ? 'true' : undefined}
                            aria-describedby={error ? 'dm-name-error' : undefined}
                            className={fieldClass}
                        />
                        {error && (
                            <p id="dm-name-error" role="alert" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#e30000]">
                                <AlertTriangle size={12} aria-hidden="true" /> {error}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="dm-type" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">Kategori</label>
                        <div className="relative">
                            <select
                                id="dm-type"
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className={`${fieldClass} appearance-none pr-10`}
                            >
                                {DEVICE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                            <ChevronDown size={15} aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="dm-configs" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            Kapasite / Konfigürasyon
                        </label>
                        <input
                            id="dm-configs"
                            type="text"
                            value={form.configurations}
                            onChange={(e) => setForm({ ...form, configurations: e.target.value })}
                            placeholder="128 GB, 256 GB, 512 GB"
                            aria-describedby="dm-configs-hint"
                            className={fieldClass}
                        />
                        <p id="dm-configs-hint" className="text-[11px] font-medium text-gray-500">Virgülle ayırın.</p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="dm-colors" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">Renkler</label>
                        <input
                            id="dm-colors"
                            type="text"
                            value={form.colors}
                            onChange={(e) => setForm({ ...form, colors: e.target.value })}
                            placeholder="Space Black, Silver, Gold"
                            aria-describedby="dm-colors-hint"
                            className={fieldClass}
                        />
                        <p id="dm-colors-hint" className="text-[11px] font-medium text-gray-500">Virgülle ayırın.</p>
                    </div>

                    {/* Canlı önizleme: servis kabulünde görünecek tanımlar */}
                    <div className="rounded-[18px] border border-gray-200 bg-[#f5f5f7] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                            Servis kabulünde görünecek ({preview.length} varyant)
                        </p>
                        <ul className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar list-none p-0 m-0">
                            {preview.slice(0, 12).map((combo, i) => (
                                <li key={`${combo}-${i}`} className="text-[11px] font-medium text-[#1d1d1f] truncate">{combo}</li>
                            ))}
                            {preview.length > 12 && (
                                <li className="text-[11px] font-semibold text-gray-500">+{preview.length - 12} tanım daha…</li>
                            )}
                        </ul>
                    </div>
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
                        type="submit"
                        disabled={busy}
                        className="flex-[2] inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <Check size={16} aria-hidden="true" />
                        {busy ? 'Kaydediliyor…' : (isEdit ? 'Değişiklikleri Kaydet' : 'Modeli Ekle')}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default DeviceModels;
