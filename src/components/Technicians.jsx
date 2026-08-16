import React, { useState, useMemo, useRef, useEffect, useId } from 'react';
import {
    Users, Wrench, Search, Eye, Plus, X, Trash2, ShieldCheck, Mail, Award,
    Edit3, Activity, RotateCcw, ChevronRight, Phone, Play,
    UserCheck, ClipboardList, MapPin
} from 'lucide-react';
import TechnicianWorkspace from './TechnicianWorkspace';
import RepairHistoryModal from './RepairHistoryModal';
import TechnicianPerformance from './TechnicianPerformance';
import TechnicianMetricsPanel from './TechnicianMetricsPanel';
import Collapse from './ui/Collapse';
import { getTechnicianStats, formatDuration } from '../utils/technicianStats';
import { useAppContext } from '../context/AppContext';
import { hasPermission } from '../utils/permissions';
import { appConfirm } from '../utils/alert';

const VIEW_OPTIONS = [
    { id: 'pool', label: 'İş Havuzu' },
    { id: 'stats', label: 'Performans' }
];

const STATUS_FILTERS = [
    { id: 'pending', label: 'Bekleyen' },
    { id: 'in-progress', label: 'İşlemde' },
    { id: 'completed', label: 'Tamamlanan' },
    { id: 'all', label: 'Tümü' }
];

const SPECIALTIES = [
    { value: 'iPhone', label: 'iPhone Uzmanı' },
    { value: 'Mac', label: 'Mac Uzmanı' },
    { value: 'iPad', label: 'iPad Uzmanı' },
    { value: 'Anakart', label: 'Anakart Uzmanı' }
];

const EMPTY_TECH = { name: '', specialty: 'iPhone', email: '', phone: '', avatar: '👨‍🔧', storeId: '1' };

// Havuz filtresi; eski davranışla birebir aynı eşleşme kuralları
const matchesStatusFilter = (status, filterId) => {
    const s = (status || '').toLowerCase();
    if (filterId === 'pending') return s.includes('bekliyor') || s === 'pending';
    if (filterId === 'in-progress') return s.includes('işlem') || s.includes('görev');
    if (filterId === 'completed') return s.includes('tamam') || s.includes('teslim');
    return true;
};

const statusTone = (status = '') => {
    if (status.includes('Tamam') || status.includes('Teslim')) return 'bg-[#e6f4ea] text-[#1e7e34] border-[#1e7e34]/15';
    if (status.includes('İşlem') || status.includes('Görev')) return 'bg-[#e8f2ff] text-[#0071e3] border-[#0071e3]/15';
    return 'bg-[#fff4e5] text-[#b25e00] border-[#b25e00]/15';
};

const deviceGlyph = (device = '') => {
    const d = device.toLowerCase();
    if (d.includes('iphone')) return '📱';
    if (d.includes('mac')) return '💻';
    if (d.includes('ipad')) return '📲';
    if (d.includes('watch')) return '⌚️';
    return '🎧';
};

const StatCard = ({ icon, label, value, hint, tone = 'text-gray-500 bg-gray-50' }) => {
    const Icon = icon;
    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                <Icon size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
                <p className="text-xl font-bold text-[#1d1d1f] leading-tight">{value}</p>
                {hint && <p className="text-[11px] font-medium text-gray-500 truncate">{hint}</p>}
            </div>
        </div>
    );
};

const SegmentedControl = ({ label, options, value, onChange, counts }) => (
    <div role="group" aria-label={label} className="flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-xl border border-gray-200/70">
        {options.map(option => {
            const active = value === option.id;
            return (
                <button
                    key={option.id}
                    type="button"
                    onClick={() => onChange(option.id)}
                    aria-pressed={active}
                    className={`h-9 px-3.5 rounded-lg text-[12px] font-semibold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active
                        ? 'bg-white text-[#1d1d1f] shadow-sm'
                        : 'text-gray-500 hover:text-[#1d1d1f]'}`}
                >
                    {option.label}
                    {counts?.[option.id] != null && (
                        <span className={`ml-1.5 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${active ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'bg-white text-gray-500'}`}>
                            {counts[option.id]}
                        </span>
                    )}
                </button>
            );
        })}
    </div>
);

/* ------------------------------------------------------------------
   Personel tanımlama penceresi
   Esc ile kapanır, açılınca odak ilk alana gider, form Enter ile gönderilir.
------------------------------------------------------------------ */
const TechnicianDialog = ({ editing, value, onChange, onSubmit, onClose, servicePoints }) => {
    const uid = useId();
    const dialogRef = useRef(null);
    const firstFieldRef = useRef(null);

    useEffect(() => { firstFieldRef.current?.focus(); }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const field = 'w-full px-4 py-3 bg-[#f5f5f7] border border-gray-200 rounded-xl text-sm font-semibold text-[#1d1d1f] outline-none transition-all focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/20';
    const label = 'block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-0.5';

    return (
        <div
            className="fixed inset-0 z-[100] bg-[#1d1d1f]/40 backdrop-blur-sm flex items-center justify-center p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${uid}-title`}
                className="bg-white rounded-[24px] w-full max-w-xl border border-gray-200 shadow-2xl animate-scale-up overflow-hidden"
            >
                <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                        <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0">
                            <ShieldCheck size={20} />
                        </span>
                        <div className="min-w-0">
                            <h2 id={`${uid}-title`} className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight truncate">
                                {editing ? 'Personel Bilgilerini Güncelle' : 'Yeni Personel Tanımla'}
                            </h2>
                            <p className="text-[11px] font-medium text-gray-500">Teknik ekip kadrosu ve şube ataması</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Pencereyi kapat"
                        className="w-10 h-10 shrink-0 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#1d1d1f] hover:bg-[#f5f5f7] flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <X size={18} />
                    </button>
                </header>

                <form
                    onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
                    className="px-6 py-5 space-y-4"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor={`${uid}-name`} className={label}>
                                Tam İsim <span className="text-[#e30000]" aria-hidden="true">*</span>
                            </label>
                            <div className="relative">
                                <Users size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    ref={firstFieldRef}
                                    id={`${uid}-name`}
                                    type="text"
                                    required
                                    placeholder="Ahmet Yılmaz"
                                    className={`${field} pl-11`}
                                    value={value.name}
                                    onChange={(e) => onChange({ ...value, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor={`${uid}-specialty`} className={label}>Uzmanlık</label>
                            <select
                                id={`${uid}-specialty`}
                                className={field}
                                value={value.specialty}
                                onChange={(e) => onChange({ ...value, specialty: e.target.value })}
                            >
                                {SPECIALTIES.map(item => (
                                    <option key={item.value} value={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor={`${uid}-email`} className={label}>
                            Kurumsal E-Posta <span className="text-[#e30000]" aria-hidden="true">*</span>
                        </label>
                        <div className="relative">
                            <Mail size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                id={`${uid}-email`}
                                type="email"
                                required
                                placeholder="ahmet@apple-servis.com"
                                className={`${field} pl-11`}
                                value={value.email}
                                onChange={(e) => onChange({ ...value, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor={`${uid}-phone`} className={label}>Telefon</label>
                            <div className="relative">
                                <Phone size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    id={`${uid}-phone`}
                                    type="tel"
                                    placeholder="0 (5XX) 000 00 00"
                                    className={`${field} pl-11`}
                                    value={value.phone}
                                    onChange={(e) => onChange({ ...value, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor={`${uid}-store`} className={label}>Şube Ataması</label>
                            <select
                                id={`${uid}-store`}
                                className={field}
                                value={value.storeId}
                                onChange={(e) => onChange({ ...value, storeId: e.target.value })}
                            >
                                {servicePoints.map(sp => (
                                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <fieldset>
                        <legend className={label}>Avatar</legend>
                        <div className="flex flex-wrap gap-2">
                            {['👨‍🔧', '👩‍🔧', '🧑‍💻', '👨‍💼', '👩‍💼', '🛠️'].map(emoji => {
                                const active = value.avatar === emoji;
                                return (
                                    <label
                                        key={emoji}
                                        className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xl cursor-pointer transition-all has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#0071e3]/25 ${active
                                            ? 'bg-[#0071e3]/10 border-[#0071e3]'
                                            : 'bg-[#f5f5f7] border-gray-200 hover:bg-white'}`}
                                    >
                                        <input
                                            type="radio"
                                            name={`${uid}-avatar`}
                                            className="sr-only"
                                            checked={active}
                                            onChange={() => onChange({ ...value, avatar: emoji })}
                                        />
                                        <span role="img" aria-label={`Avatar ${emoji}`}>{emoji}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-11 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-[#f5f5f7] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            Vazgeç
                        </button>
                        <button
                            type="submit"
                            className="h-11 px-6 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            {editing ? 'Güncellemeleri Kaydet' : 'Sisteme Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Technicians = () => {
    const {
        repairs, technicians, currentUser, addTechnician, removeTechnician,
        updateTechnician, showToast, servicePoints
    } = useAppContext();

    // İşlem yetkisi: teknisyen kadrosunu değiştirme (görüntüleme herkese açık)
    const canManageTech = hasPermission(currentUser, 'manage_technicians');
    const uid = useId();

    const [activeRepairId, setActiveRepairId] = useState(null);
    const [selectedHistoryRepair, setSelectedHistoryRepair] = useState(null);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('pool');
    // Adına tıklanan teknisyenin metrikleri kendi kartının içinde açılır
    const [openMetricsFor, setOpenMetricsFor] = useState(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTech, setEditingTech] = useState(null);
    const [newTech, setNewTech] = useState({ ...EMPTY_TECH, storeId: currentUser?.storeId || '1' });

    // Her teknisyenin performans özeti (isim -> istatistik)
    const statsByTech = useMemo(() => {
        const map = new Map();
        (technicians || []).forEach(tech => map.set(tech.name, getTechnicianStats(repairs, tech.name)));
        return map;
    }, [technicians, repairs]);

    const storeNameById = useMemo(
        () => new Map((servicePoints || []).map(sp => [String(sp.id), sp.name])),
        [servicePoints]
    );

    const query = searchTerm.trim().toLowerCase();

    const searchedRepairs = useMemo(
        () => (repairs || []).filter(r =>
            !query
            || (r.device || '').toLowerCase().includes(query)
            || String(r.id || '').toLowerCase().includes(query)
        ),
        [repairs, query]
    );

    const filterCounts = useMemo(() => {
        const counts = {};
        STATUS_FILTERS.forEach(f => {
            counts[f.id] = searchedRepairs.filter(r => matchesStatusFilter(r.status, f.id)).length;
        });
        return counts;
    }, [searchedRepairs]);

    const filteredRepairs = useMemo(
        () => searchedRepairs.filter(r => matchesStatusFilter(r.status, statusFilter)),
        [searchedRepairs, statusFilter]
    );

    const teamSummary = useMemo(() => {
        const list = technicians || [];
        const busy = list.filter(t => t.status === 'busy' || t.currentJob).length;
        return {
            total: list.length,
            busy,
            available: list.filter(t => !(t.status === 'busy' || t.currentJob) && t.status !== 'offline').length,
            openJobs: (repairs || []).filter(r => matchesStatusFilter(r.status, 'pending')).length
        };
    }, [technicians, repairs]);

    const openCreateDialog = () => {
        setEditingTech(null);
        setNewTech({ ...EMPTY_TECH, storeId: currentUser?.storeId || '1' });
        setShowAddModal(true);
    };

    const openEditDialog = (tech) => {
        setEditingTech(tech);
        setNewTech({ ...tech });
        setShowAddModal(true);
    };

    const handleAddOrUpdate = async () => {
        if (!newTech.name || !newTech.email) {
            showToast('Lütfen isim ve e-posta alanlarını doldurun.', 'warning');
            return;
        }

        if (editingTech) {
            await updateTechnician(editingTech.id, newTech);
            showToast('Teknisyen bilgileri güncellendi.', 'success');
        } else {
            const id = 'T' + Math.floor(Math.random() * 1000);
            await addTechnician({ ...newTech, id, status: 'available', currentJob: null });
            showToast('Yeni teknisyen başarıyla eklendi.', 'success');
        }

        setShowAddModal(false);
        setEditingTech(null);
        setNewTech({ ...EMPTY_TECH, storeId: currentUser?.storeId || '1' });
    };

    const handleDelete = async (tech) => {
        const confirmed = await appConfirm(`<strong>${tech.name}</strong> adlı teknisyeni sistemden silmek istediğinize emin misiniz?`);
        if (confirmed) {
            await removeTechnician(tech._id || tech.id);
            showToast('Teknisyen silindi.', 'info');
        }
    };

    // Atama yapmadan doğrudan çalışma alanına gidilir, teknisyen içeride seçilir
    const handleStartJob = (repairId) => setActiveRepairId(repairId);

    return (
        <div className="page-shell animate-fade-in">
            {activeRepairId && <TechnicianWorkspace repairId={activeRepairId} onClose={() => setActiveRepairId(null)} />}
            {selectedHistoryRepair && <RepairHistoryModal repair={selectedHistoryRepair} onClose={() => setSelectedHistoryRepair(null)} />}

            {/* Başlık */}
            <div className="shrink-0 flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="min-w-0">
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        <span>Servis Yönetimi</span>
                        <ChevronRight size={10} aria-hidden="true" />
                        <span className="text-[#0071e3]">Teknik Ekip</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Teknik Ekip</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Ekip performansını izleyin, iş emirlerini havuzdan teknisyenlere yönlendirin.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <SegmentedControl
                        label="Görünüm"
                        options={VIEW_OPTIONS}
                        value={viewMode}
                        onChange={setViewMode}
                    />

                    {canManageTech && (
                        <button
                            type="button"
                            onClick={openCreateDialog}
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            <Plus size={16} aria-hidden="true" /> Personel Ekle
                        </button>
                    )}
                </div>
            </div>

            <div className="page-scroll py-5 pr-1 space-y-6">
                {/* Özet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard icon={Users} label="Kadro" value={teamSummary.total} hint="Tanımlı teknisyen" />
                    <StatCard icon={UserCheck} label="Müsait" value={teamSummary.available} tone="text-[#1e7e34] bg-[#e6f4ea]" hint="Görev bekliyor" />
                    <StatCard icon={Wrench} label="Meşgul" value={teamSummary.busy} tone="text-[#b25e00] bg-[#fff4e5]" hint="Aktif işte" />
                    <StatCard icon={ClipboardList} label="Bekleyen İş" value={teamSummary.openJobs} tone="text-[#0071e3] bg-[#e8f2ff]" hint="Havuzda atama bekliyor" />
                </div>

                {viewMode === 'pool' ? (
                    <>
                        {/* Ekip */}
                        <section aria-labelledby={`${uid}-team`} className="space-y-3">
                            <h2 id={`${uid}-team`} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">
                                Ekip ({(technicians || []).length})
                            </h2>

                            {(technicians || []).length === 0 ? (
                                <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm py-14 text-center">
                                    <Users size={36} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
                                    <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Kadro henüz boş</h3>
                                    <p className="text-[13px] text-gray-500 mt-1">
                                        {canManageTech ? 'İlk teknisyeni tanımlayarak başlayın.' : 'Yetkili bir kullanıcı teknisyen tanımlamalı.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                    {(technicians || []).map(tech => {
                                        const techKey = tech._id || tech.id;
                                        const activeRepair = (repairs || []).find(r => r.id === tech.currentJob);
                                        const steps = activeRepair?.steps || [];
                                        const progress = steps.length > 0
                                            ? Math.round((steps.filter(s => s.checked).length / steps.length) * 100)
                                            : 0;
                                        const isBusy = tech.status === 'busy' || !!tech.currentJob;
                                        const stats = statsByTech.get(tech.name);
                                        const metricsOpen = openMetricsFor === techKey;

                                        return (
                                            <article
                                                key={techKey}
                                                className={`bg-white rounded-[24px] border shadow-sm flex flex-col transition-colors ${metricsOpen
                                                    ? 'border-[#0071e3]/40 md:col-span-2'
                                                    : 'border-gray-200'}`}
                                            >
                                                <div className="p-5 flex items-start gap-3">
                                                    <span aria-hidden="true" className="relative shrink-0">
                                                        <span className="w-14 h-14 bg-[#f5f5f7] rounded-2xl border border-gray-200 flex items-center justify-center text-2xl">
                                                            {tech.avatar || '👨‍🔧'}
                                                        </span>
                                                        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[3px] border-white ${isBusy ? 'bg-[#ff9500]' : tech.status === 'offline' ? 'bg-gray-300' : 'bg-[#1e7e34]'}`} />
                                                    </span>

                                                    <div className="min-w-0 flex-1">
                                                        {/* İsme tıklanınca performans verileri bu kartın içinde açılır */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenMetricsFor(metricsOpen ? null : techKey)}
                                                            aria-expanded={metricsOpen}
                                                            aria-controls={`tech-metrics-${techKey}`}
                                                            className="group/name text-left w-full rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                                        >
                                                            <span className="flex items-center gap-1.5 min-w-0">
                                                                <span className="text-[15px] font-semibold text-[#1d1d1f] truncate group-hover/name:text-[#0071e3] transition-colors">
                                                                    {tech.name}
                                                                </span>
                                                                <ChevronRight
                                                                    size={14}
                                                                    aria-hidden="true"
                                                                    className={`text-gray-400 shrink-0 transition-transform ${metricsOpen ? 'rotate-90 text-[#0071e3]' : ''}`}
                                                                />
                                                            </span>
                                                            <span className="block text-[11px] font-semibold text-gray-500 truncate">
                                                                {tech.specialty || 'Genel'} · {storeNameById.get(String(tech.storeId)) || 'Şube atanmamış'}
                                                            </span>
                                                        </button>

                                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${isBusy
                                                                ? 'bg-[#fff4e5] text-[#b25e00] border-[#b25e00]/15'
                                                                : tech.status === 'offline'
                                                                    ? 'bg-gray-50 text-gray-500 border-gray-200'
                                                                    : 'bg-[#e6f4ea] text-[#1e7e34] border-[#1e7e34]/15'}`}>
                                                                {isBusy ? 'Meşgul' : tech.status === 'offline' ? 'Çevrimdışı' : 'Müsait'}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-[#f5f5f7] border border-gray-200 px-2 py-0.5 rounded-full">
                                                                <Activity size={10} aria-hidden="true" /> {stats?.active ?? 0} aktif iş
                                                            </span>
                                                            {tech.specialty && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-[#f5f5f7] border border-gray-200 px-2 py-0.5 rounded-full">
                                                                    <Award size={10} aria-hidden="true" /> {tech.specialty}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {canManageTech && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditDialog(tech)}
                                                                aria-label={`${tech.name} bilgilerini düzenle`}
                                                                className="w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#0071e3] hover:border-[#0071e3]/30 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                                            >
                                                                <Edit3 size={15} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(tech)}
                                                                aria-label={`${tech.name} kaydını sil`}
                                                                className="w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#e30000] hover:border-[#e30000]/30 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#e30000]/25"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {stats && (
                                                    <div className="px-5">
                                                        {/* Açıkken tam metrik paneli, kapalıyken iki temel gösterge */}
                                                        <Collapse open={metricsOpen}>
                                                            <div id={`tech-metrics-${techKey}`} className="pb-4">
                                                                <TechnicianMetricsPanel stats={stats} compact />
                                                            </div>
                                                        </Collapse>

                                                        <Collapse open={!metricsOpen}>
                                                            <dl className="grid grid-cols-2 gap-2 pb-4">
                                                                <div className="rounded-xl bg-[#f5f5f7] border border-gray-200 px-3 py-2">
                                                                    <dt className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Ort. Süre</dt>
                                                                    <dd className="text-[13px] font-bold text-[#1d1d1f] mt-0.5">{formatDuration(stats.avgDurationMinutes)}</dd>
                                                                </div>
                                                                <div className="rounded-xl bg-[#f5f5f7] border border-gray-200 px-3 py-2">
                                                                    <dt className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Günlük Cihaz</dt>
                                                                    <dd className="text-[13px] font-bold text-[#1d1d1f] mt-0.5">
                                                                        {stats.perActiveDay != null ? stats.perActiveDay.toFixed(1) : '—'}
                                                                    </dd>
                                                                </div>
                                                            </dl>
                                                        </Collapse>
                                                    </div>
                                                )}

                                                <div className="mt-auto px-5 pb-5">
                                                    {tech.currentJob ? (
                                                        <div className="rounded-2xl bg-[#fff4e5]/70 border border-[#b25e00]/15 p-3.5">
                                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#b25e00] font-mono">
                                                                    <RotateCcw size={11} aria-hidden="true" /> #{tech.currentJob}
                                                                </span>
                                                                <span className="text-[11px] font-bold text-[#b25e00] tabular-nums">%{progress}</span>
                                                            </div>
                                                            <div
                                                                role="progressbar"
                                                                aria-valuenow={progress}
                                                                aria-valuemin={0}
                                                                aria-valuemax={100}
                                                                aria-label={`${tech.name} işlem ilerlemesi`}
                                                                className="w-full bg-white h-1.5 rounded-full overflow-hidden border border-[#b25e00]/10"
                                                            >
                                                                <div className="bg-[#ff9500] h-full transition-all duration-700" style={{ width: `${progress}%` }} />
                                                            </div>
                                                            <p className="text-[11px] font-semibold text-gray-600 mt-2 truncate">
                                                                {activeRepair?.device || 'Cihaz bilgisi yok'}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveRepairId(tech.currentJob)}
                                                                className="mt-3 w-full h-10 rounded-xl bg-[#1d1d1f] text-white text-[12px] font-semibold hover:bg-black transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                                            >
                                                                <Eye size={14} aria-hidden="true" /> İşi İzle
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <p className="rounded-2xl bg-[#e6f4ea]/60 border border-dashed border-[#1e7e34]/25 py-3.5 text-center text-[11px] font-bold text-[#1e7e34] uppercase tracking-widest">
                                                            Görev bekliyor
                                                        </p>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* İş emirleri havuzu */}
                        <section aria-labelledby={`${uid}-pool`} className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-4 sm:p-5 flex flex-col xl:flex-row xl:items-end gap-4 border-b border-gray-100">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#1d1d1f] text-white flex items-center justify-center shrink-0">
                                        <Wrench size={20} />
                                    </span>
                                    <div className="min-w-0">
                                        <h2 id={`${uid}-pool`} className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">İş Emirleri Havuzu</h2>
                                        <p aria-live="polite" className="text-[11px] font-semibold text-gray-500">
                                            {filteredRepairs.length} kayıt listeleniyor
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <SegmentedControl
                                        label="Duruma göre filtrele"
                                        options={STATUS_FILTERS}
                                        value={statusFilter}
                                        onChange={setStatusFilter}
                                        counts={filterCounts}
                                    />

                                    <div className="relative w-full sm:w-72">
                                        <label htmlFor={`${uid}-search`} className="sr-only">İş emri veya cihaz ara</label>
                                        <Search size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            id={`${uid}-search`}
                                            type="search"
                                            placeholder="Takip no veya cihaz ara…"
                                            className="w-full h-11 pl-11 pr-4 bg-white border border-gray-300 rounded-xl text-sm font-medium text-[#1d1d1f] placeholder:text-gray-400 outline-none transition-all focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {filteredRepairs.length === 0 ? (
                                <div className="py-14 text-center">
                                    <ClipboardList size={36} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
                                    <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Bu koşullara uyan iş emri yok</h3>
                                    <p className="text-[13px] text-gray-500 mt-1">Filtreyi değiştirin ya da arama ifadesini sadeleştirin.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <caption className="sr-only">Teknisyen atanmayı bekleyen ve devam eden iş emirleri</caption>
                                        <thead>
                                            <tr className="bg-[#f5f5f7]/70 border-b border-gray-100">
                                                <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Takip No</th>
                                                <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cihaz / Sorun</th>
                                                <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lokasyon</th>
                                                <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Durum</th>
                                                <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredRepairs.map(repair => (
                                                <tr key={repair._id || repair.id} className="hover:bg-[#f5f5f7]/60 transition-colors">
                                                    <td className="px-5 py-3.5 align-middle">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedHistoryRepair(repair)}
                                                            className="font-mono text-[12px] font-bold text-[#0071e3] hover:underline rounded outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                                        >
                                                            #{repair.id}
                                                        </button>
                                                    </td>
                                                    <td className="px-5 py-3.5 align-middle">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span aria-hidden="true" className="w-10 h-10 rounded-xl bg-[#f5f5f7] border border-gray-200 flex items-center justify-center text-lg shrink-0">
                                                                {deviceGlyph(repair.device)}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">{repair.device || 'Cihaz belirtilmemiş'}</p>
                                                                <p className="text-[11px] text-gray-500 truncate max-w-[280px]">{repair.issue || 'Sorun açıklaması yok'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 align-middle">
                                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-[#f5f5f7] border border-gray-200 px-2.5 py-1 rounded-full">
                                                            <MapPin size={11} aria-hidden="true" />
                                                            {storeNameById.get(String(repair.storeId)) || 'Mobil'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 align-middle">
                                                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${statusTone(repair.status)}`}>
                                                            {repair.status || 'Beklemede'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 align-middle">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedHistoryRepair(repair)}
                                                                aria-label={`${repair.id} numaralı kaydın detaylarını aç`}
                                                                className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#0071e3] hover:border-[#0071e3]/30 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            {!repair.status?.includes('Tamam') && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStartJob(repair.id)}
                                                                    aria-label={`${repair.id} numaralı iş emrini başlat`}
                                                                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#1d1d1f] text-white text-[12px] font-semibold hover:bg-black transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                                                >
                                                                    <Play size={12} fill="currentColor" aria-hidden="true" /> Başlat
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </>
                ) : (
                    <TechnicianPerformance />
                )}
            </div>

            {showAddModal && (
                <TechnicianDialog
                    editing={editingTech}
                    value={newTech}
                    onChange={setNewTech}
                    onSubmit={handleAddOrUpdate}
                    onClose={() => { setShowAddModal(false); setEditingTech(null); }}
                    servicePoints={servicePoints}
                />
            )}
        </div>
    );
};

export default Technicians;
