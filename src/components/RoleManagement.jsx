import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Shield, ShieldCheck, Key, Plus, Search, X, Check, Trash2, ChevronDown,
    AlertTriangle, Info, Lock, Users, Edit
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { appConfirm } from '../utils/alert';
import { isSuperAdmin, isYonetici, normalizeRoleName } from '../utils/permissions';
import {
    PERMISSION_CATEGORIES, PERMISSIONS, PERMISSION_MAP, RISK_LABELS,
    expandPermissions, isLegacyPermissionSet, permissionsByCategory,
} from '../utils/permissionCatalog';
import Collapse from './ui/Collapse';
import useAnimatedClose from './ui/useAnimatedClose';

/* ------------------------------------------------------------------
   Yetki ve Rol Yönetimi
   Yetki alanları utils/permissionCatalog içinde tanımlıdır.
------------------------------------------------------------------ */

const normalize = (value) => String(value ?? '').toLocaleLowerCase('tr');

const RISK_STYLES = {
    normal: 'text-gray-600 bg-[#f5f5f7] border-gray-200',
    high: 'text-[#bf5b04] bg-[#ff9500]/8 border-[#ff9500]/25',
    critical: 'text-[#c30000] bg-[#e30000]/8 border-[#e30000]/20',
};

const PROTECTED_ROLE_NAMES = ['superadmin', 'admin'];

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

/* --------------------------------- ana ekran --------------------------------- */

const RoleManagement = () => {
    const { roles, addRole, updateRole, deleteRole, users, currentUser, showToast } = useAppContext();

    const canManage = isSuperAdmin(currentUser) || isYonetici(currentUser);

    const [term, setTerm] = useState('');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    /** Rol başına kaç kullanıcı var */
    const userCounts = useMemo(() => {
        const counts = new Map();
        (users || []).forEach(user => {
            const key = normalizeRoleName(user.role);
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        return counts;
    }, [users]);

    const enriched = useMemo(() => (roles || []).map(role => {
        const granted = role.permissions || [];
        const effective = expandPermissions(granted);
        const criticalCount = [...effective].filter(id => PERMISSION_MAP[id]?.risk === 'critical').length;

        return {
            ...role,
            granted,
            effective,
            criticalCount,
            legacy: isLegacyPermissionSet(granted),
            userCount: userCounts.get(normalizeRoleName(role.name)) || 0,
            protectedRole: PROTECTED_ROLE_NAMES.includes(normalize(role.name)),
        };
    }), [roles, userCounts]);

    const filtered = useMemo(() => {
        const q = normalize(term.trim());
        if (!q) return enriched;
        return enriched.filter(role =>
            normalize(role.displayName).includes(q) || normalize(role.name).includes(q)
        );
    }, [enriched, term]);

    const totalCritical = useMemo(
        () => enriched.filter(r => r.criticalCount > 0).length,
        [enriched]
    );

    const canEditRole = (role) => {
        if (!canManage) return false;
        if (isYonetici(currentUser) && role.protectedRole) return false;
        return true;
    };

    const handleDelete = async (role) => {
        if (role.userCount > 0) {
            showToast(`Bu rol ${role.userCount} kullanıcıda tanımlı. Önce kullanıcıların rolünü değiştirin.`, 'error');
            return;
        }
        const confirmed = await appConfirm(
            `"${role.displayName}" rolü silinecek. Bu işlem geri alınamaz. Onaylıyor musunuz?`
        );
        if (confirmed) await deleteRole(role._id || role.id);
    };

    const openEditor = (role = null) => {
        setEditing(role);
        setEditorOpen(true);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Başlık */}
            <header className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3]">Erişim Yönetimi</p>
                        <h3 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">Yetki ve Rol Yönetimi</h3>
                        <p className="text-[13px] font-medium text-gray-500 mt-1">
                            Rollerin sistemde neye erişebileceğini {PERMISSIONS.length} ayrı yetki alanıyla belirleyin.
                        </p>
                    </div>

                    {canManage && (
                        <button
                            type="button"
                            onClick={() => openEditor(null)}
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            <Plus size={16} aria-hidden="true" /> Yeni Rol
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryTile icon={Shield} label="Tanımlı Rol" value={enriched.length} unit="rol" tone="bg-[#0071e3]/5 border-[#0071e3]/15" />
                    <SummaryTile icon={Key} label="Yetki Alanı" value={PERMISSIONS.length} unit="yetki" />
                    <SummaryTile icon={Lock} label="Kategori" value={PERMISSION_CATEGORIES.length} unit="alan" />
                    <SummaryTile icon={AlertTriangle} label="Kritik Yetkili Rol" value={totalCritical} unit="rol" tone={totalCritical > 0 ? 'bg-[#ff9500]/8 border-[#ff9500]/20' : 'bg-white border-gray-200'} />
                </div>
            </header>

            {/* Arama */}
            <div className="relative max-w-md">
                <label htmlFor="role-search" className="sr-only">Rol ara</label>
                <Search size={15} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                    id="role-search"
                    type="search"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Rol adı ara…"
                    className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                />
            </div>

            {/* Rol listesi */}
            {filtered.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-gray-300 bg-white/60 py-16 text-center">
                    <Shield size={34} aria-hidden="true" className="mx-auto text-gray-300 mb-3" />
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">Eşleşen rol bulunamadı</p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 xl:grid-cols-2 gap-5 list-none p-0 m-0">
                    {filtered.map(role => {
                        const editable = canEditRole(role);

                        return (
                            <li key={role._id || role.name} className="rounded-[24px] border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 sm:p-6">
                                <div className="flex items-start justify-between gap-4 mb-5">
                                    <div className="flex items-start gap-3.5 min-w-0">
                                        <span
                                            aria-hidden="true"
                                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${role.criticalCount > 0
                                                ? 'bg-[#1d1d1f] text-white'
                                                : 'bg-[#f5f5f7] text-[#1d1d1f] border border-gray-200'}`}
                                        >
                                            {role.criticalCount > 0 ? <ShieldCheck size={19} /> : <Shield size={19} />}
                                        </span>
                                        <div className="min-w-0">
                                            <h4 className="text-[16px] font-semibold text-[#1d1d1f] truncate">{role.displayName}</h4>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                <span className="text-[9px] font-mono font-bold text-gray-500 bg-[#f5f5f7] border border-gray-200 rounded-full px-2 py-0.5">
                                                    {role.name}
                                                </span>
                                                {role.isSystem && (
                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-600 bg-[#f5f5f7] border border-gray-200 rounded-full px-2 py-0.5">
                                                        Sistem
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#0071e3] bg-[#0071e3]/8 border border-[#0071e3]/15 rounded-full px-2 py-0.5">
                                                    <Users size={9} aria-hidden="true" /> {role.userCount} kullanıcı
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {editable ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => openEditor(role)}
                                                    aria-label={`${role.displayName} rolünü düzenle`}
                                                    className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#0071e3] hover:border-[#0071e3]/30 hover:bg-[#0071e3]/5 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                                >
                                                    <Edit size={15} aria-hidden="true" />
                                                </button>
                                                {!role.isSystem && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(role)}
                                                        aria-label={`${role.displayName} rolünü sil`}
                                                        className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-[#e30000] hover:border-[#e30000]/30 hover:bg-[#e30000]/5 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#e30000]/25"
                                                    >
                                                        <Trash2 size={15} aria-hidden="true" />
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#bf5b04] bg-[#ff9500]/10 border border-[#ff9500]/25 rounded-full px-2.5 py-1">
                                                <Lock size={10} aria-hidden="true" /> Kilitli
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Kategori bazlı kapsama */}
                                <div className="space-y-2">
                                    {PERMISSION_CATEGORIES.map(cat => {
                                        const all = permissionsByCategory(cat.id);
                                        const owned = all.filter(p => role.effective.has(p.id)).length;
                                        const pct = all.length ? Math.round((owned / all.length) * 100) : 0;

                                        return (
                                            <div key={cat.id} className="flex items-center gap-3">
                                                <span className="text-[10px] font-semibold text-gray-600 w-[120px] shrink-0 truncate">{cat.label}</span>
                                                <span
                                                    className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden"
                                                    role="img"
                                                    aria-label={`${cat.label}: ${all.length} yetkiden ${owned} tanesi`}
                                                >
                                                    <span
                                                        className={`block h-full rounded-full ${pct === 100 ? 'bg-[#008000]' : pct > 0 ? 'bg-[#0071e3]' : 'bg-transparent'}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-500 w-10 text-right tabular-nums shrink-0">
                                                    {owned}/{all.length}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-5 pt-5 border-t border-gray-100">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                        {role.effective.size} / {PERMISSIONS.length} yetki
                                    </span>
                                    {role.criticalCount > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-[#c30000] bg-[#e30000]/8 border border-[#e30000]/20 rounded-full px-2 py-0.5">
                                            <AlertTriangle size={9} aria-hidden="true" /> {role.criticalCount} kritik
                                        </span>
                                    )}
                                    {role.legacy && (
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#bf5b04] bg-[#ff9500]/8 border border-[#ff9500]/25 rounded-full px-2 py-0.5">
                                            Varsayılan taban
                                        </span>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {enriched.some(r => r.legacy) && (
                <p className="flex items-start gap-2 text-[11px] font-medium text-gray-500">
                    <Info size={13} aria-hidden="true" className="shrink-0 mt-0.5" />
                    &quot;Varsayılan taban&quot; işaretli roller henüz bu ekrandan kaydedilmedi; yetkileri rolün yerleşik
                    varsayılanıyla destekleniyor. Bir kez kaydettiğinizde liste tamamen sizin seçiminize göre çalışır.
                </p>
            )}

            {editorOpen && (
                <RoleEditor
                    role={editing}
                    existingRoles={enriched}
                    onClose={() => { setEditorOpen(false); setEditing(null); }}
                    addRole={addRole}
                    updateRole={updateRole}
                    showToast={showToast}
                />
            )}
        </div>
    );
};

/* ------------------------------- rol düzenleyici ------------------------------- */

const RoleEditor = ({ role, existingRoles, onClose, addRole, updateRole, showToast }) => {
    const { closing, requestClose } = useAnimatedClose(onClose, 200);
    const dialogRef = useRef(null);
    const isEdit = Boolean(role);

    const [name, setName] = useState(role?.name || '');
    const [displayName, setDisplayName] = useState(role?.displayName || '');
    // Düzenlemede kapsama uygulanmış hali gösterilir; kaydedildiğinde liste açık hale gelir
    const [selected, setSelected] = useState(() => new Set(role ? [...expandPermissions(role.permissions || [])] : []));
    const [permQuery, setPermQuery] = useState('');
    const [openCategories, setOpenCategories] = useState(() => PERMISSION_CATEGORIES.map(c => c.id));
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

    /** Kapsama uygulanmış etkili küme (ör. manage_stock -> view_stock) */
    const effective = useMemo(() => expandPermissions([...selected]), [selected]);

    const visiblePermissions = useMemo(() => {
        const q = normalize(permQuery.trim());
        if (!q) return PERMISSIONS;
        return PERMISSIONS.filter(p =>
            normalize(p.label).includes(q) ||
            normalize(p.description).includes(q) ||
            normalize(p.id).includes(q)
        );
    }, [permQuery]);

    const toggle = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleCategory = (categoryId, allOn) => {
        const ids = permissionsByCategory(categoryId).map(p => p.id);
        setSelected(prev => {
            const next = new Set(prev);
            ids.forEach(id => { if (allOn) next.delete(id); else next.add(id); });
            return next;
        });
    };

    const criticalSelected = useMemo(
        () => [...effective].filter(id => PERMISSION_MAP[id]?.risk === 'critical'),
        [effective]
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (busy) return;

        const cleanName = name.trim();
        const cleanDisplay = displayName.trim();

        if (!cleanName) return setError('Sistem adı (ID) zorunludur.');
        if (!/^[a-z0-9_]+$/.test(cleanName)) return setError('Sistem adı yalnızca küçük harf, rakam ve alt çizgi içerebilir.');
        if (!cleanDisplay) return setError('Görünen ad zorunludur.');

        if (!isEdit && existingRoles.some(r => normalize(r.name) === normalize(cleanName))) {
            return setError('Bu sistem adı zaten kullanılıyor.');
        }
        if (selected.size === 0) return setError('En az bir yetki seçmelisiniz.');

        // Kritik yetkiler için ek onay
        if (criticalSelected.length > 0) {
            const labels = criticalSelected.map(id => PERMISSION_MAP[id]?.label || id).join(', ');
            const confirmed = await appConfirm(
                `Bu role kritik yetkiler veriliyor: ${labels}. Bu yetkiler sistem ayarlarını, kullanıcıları ve güvenlik erişimini değiştirebilir. Onaylıyor musunuz?`
            );
            if (!confirmed) return;
        }

        setError('');
        setBusy(true);
        try {
            // Kapsama uygulanmış tam liste kaydedilir; böylece rol artık
            // varsayılan tabana değil, yalnızca bu seçime göre çalışır.
            const payload = {
                name: cleanName,
                displayName: cleanDisplay,
                permissions: [...effective],
            };

            const ok = isEdit
                ? await updateRole(role._id || role.id, payload)
                : await addRole(payload);

            if (ok !== false) {
                showToast(isEdit ? 'Rol güncellendi.' : 'Rol oluşturuldu.', 'success');
                requestClose();
            } else {
                setError('Kaydedilemedi. Yetkinizi kontrol edin.');
            }
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
                aria-labelledby="role-editor-title"
                tabIndex={-1}
                noValidate
                onSubmit={handleSubmit}
                className={`bg-white w-full max-w-3xl rounded-[24px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[92vh] outline-none ${closing ? 'animate-out fade-out zoom-out-95 duration-200' : 'animate-scale-up'}`}
            >
                <header className="flex items-center justify-between gap-4 px-6 sm:px-7 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0">
                            <Shield size={19} />
                        </span>
                        <div className="min-w-0">
                            <h3 id="role-editor-title" className="text-[17px] font-semibold text-[#1d1d1f] truncate">
                                {isEdit ? 'Rolü Düzenle' : 'Yeni Rol Oluştur'}
                            </h3>
                            <p className="text-[12px] font-medium text-gray-500 truncate">
                                {effective.size} / {PERMISSIONS.length} yetki seçili
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

                <div className="p-6 sm:p-7 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label htmlFor="role-name" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Sistem Adı (ID) <span className="text-[#e30000]" aria-hidden="true">*</span>
                            </label>
                            <input
                                id="role-name" type="text" value={name} disabled={isEdit}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="servis_muduru"
                                aria-describedby="role-name-hint"
                                className={`${fieldClass} font-mono disabled:opacity-50 disabled:cursor-not-allowed`}
                            />
                            <p id="role-name-hint" className="text-[11px] font-medium text-gray-500">
                                {isEdit ? 'Sistem adı sonradan değiştirilemez.' : 'Küçük harf, rakam ve alt çizgi.'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="role-display" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Görünen Ad <span className="text-[#e30000]" aria-hidden="true">*</span>
                            </label>
                            <input
                                id="role-display" type="text" value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Servis Müdürü"
                                className={fieldClass}
                            />
                        </div>
                    </div>

                    {/* Yetki arama */}
                    <div className="space-y-2">
                        <label htmlFor="perm-search" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            Yetki Ara
                        </label>
                        <div className="relative">
                            <Search size={15} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                id="perm-search" type="search" value={permQuery}
                                onChange={(e) => setPermQuery(e.target.value)}
                                placeholder="Yetki adı veya açıklaması…"
                                className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                            />
                        </div>
                    </div>

                    {/* Kategori bazlı yetki listesi */}
                    <div className="space-y-3">
                        {PERMISSION_CATEGORIES.map(cat => {
                            const all = permissionsByCategory(cat.id);
                            const shown = all.filter(p => visiblePermissions.includes(p));
                            if (shown.length === 0) return null;

                            const ownedCount = all.filter(p => effective.has(p.id)).length;
                            const allOn = ownedCount === all.length;
                            const isOpen = openCategories.includes(cat.id);
                            const panelId = `perm-cat-${cat.id}`;

                            return (
                                <div key={cat.id} className="rounded-[18px] border border-gray-200 overflow-hidden">
                                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#f5f5f7]/70 border-b border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setOpenCategories(prev =>
                                                prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
                                            )}
                                            aria-expanded={isOpen}
                                            aria-controls={panelId}
                                            className="flex items-center gap-2 min-w-0 text-left outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 rounded-lg"
                                        >
                                            <ChevronDown size={14} aria-hidden="true" className={`text-gray-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                            <span className="min-w-0">
                                                <span className="block text-[12px] font-semibold text-[#1d1d1f] truncate">{cat.label}</span>
                                                <span className="block text-[10px] font-medium text-gray-500 truncate">{cat.description}</span>
                                            </span>
                                        </button>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded-full px-2 py-0.5 tabular-nums">
                                                {ownedCount}/{all.length}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => toggleCategory(cat.id, allOn)}
                                                className="text-[11px] font-semibold text-[#0071e3] hover:underline outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 rounded px-1"
                                            >
                                                {allOn ? 'Kaldır' : 'Tümünü seç'}
                                            </button>
                                        </div>
                                    </div>

                                    <Collapse open={isOpen}>
                                        {() => (
                                            <div id={panelId} className="p-3 space-y-2">
                                                {shown.map(perm => {
                                                    const checked = selected.has(perm.id);
                                                    // Doğrudan seçilmemiş ama başka bir yetkinin kapsamından gelmiş
                                                    const inherited = !checked && effective.has(perm.id);

                                                    return (
                                                        <label
                                                            key={perm.id}
                                                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#0071e3]/25 ${checked
                                                                ? 'bg-[#0071e3]/5 border-[#0071e3]/25'
                                                                : inherited
                                                                    ? 'bg-[#f5f5f7] border-gray-200'
                                                                    : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked || inherited}
                                                                onChange={() => toggle(perm.id)}
                                                                aria-describedby={`${perm.id}-desc`}
                                                                className="w-4 h-4 mt-0.5 accent-[#0071e3] shrink-0"
                                                            />
                                                            <span className="min-w-0 flex-1">
                                                                <span className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="text-[12px] font-semibold text-[#1d1d1f]">{perm.label}</span>
                                                                    {perm.risk !== 'normal' && (
                                                                        <span className={`text-[9px] font-bold uppercase tracking-widest rounded-full px-1.5 py-0.5 border ${RISK_STYLES[perm.risk]}`}>
                                                                            {RISK_LABELS[perm.risk]}
                                                                        </span>
                                                                    )}
                                                                    {inherited && (
                                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 bg-white border border-gray-200 rounded-full px-1.5 py-0.5">
                                                                            Kapsam gereği
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <span id={`${perm.id}-desc`} className="block text-[11px] font-medium text-gray-500 mt-0.5">
                                                                    {perm.description}
                                                                </span>
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </Collapse>
                                </div>
                            );
                        })}
                    </div>

                    {criticalSelected.length > 0 && (
                        <div className="flex items-start gap-2.5 p-4 rounded-[16px] bg-[#e30000]/[0.04] border border-[#e30000]/20">
                            <AlertTriangle size={15} aria-hidden="true" className="text-[#c30000] shrink-0 mt-0.5" />
                            <p className="text-[12px] font-medium text-[#1d1d1f]">
                                Bu rol {criticalSelected.length} kritik yetkiye sahip olacak:{' '}
                                <b>{criticalSelected.map(id => PERMISSION_MAP[id]?.label || id).join(', ')}</b>.
                                Kaydetmeden önce ek onay istenecek.
                            </p>
                        </div>
                    )}

                    {error && (
                        <p role="alert" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#e30000]">
                            <AlertTriangle size={12} aria-hidden="true" /> {error}
                        </p>
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
                        type="submit"
                        disabled={busy}
                        className="flex-[2] inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <Check size={16} aria-hidden="true" />
                        {busy ? 'Kaydediliyor…' : (isEdit ? 'Değişiklikleri Kaydet' : 'Rolü Oluştur')}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default RoleManagement;
