import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Users, UserPlus, Search, Trash2, X, Check, Shield, ShieldCheck, Store,
    Mail, Pencil, Lock, AlertTriangle, Key, UserX, Building,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { appConfirm } from '../utils/alert';
import {
    hasPermission, isSuperAdmin, isYonetici, normalizeRoleName, ROLE_DISPLAY_NAMES,
} from '../utils/permissions';
import Collapse from './ui/Collapse';
import useAnimatedClose from './ui/useAnimatedClose';
import { StatTile, Field, SelectField, SegmentButton, EmptyState } from './ui/FormControls';

/* ------------------------------------------------------------------
   Personel & Rol Yönetimi
   Hesap kimliği, rolü ve mağaza erişimi bu ekrandan yönetilir.
   Şifre sıfırlama ve sistem erişimini kapatma Sistem Güvenliği ekranındadır;
   rol içeriği (yetki listesi) Yetki ve Rol Yönetimi ekranındadır.
------------------------------------------------------------------ */

const TR_FOLD = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
const normalize = (value) => String(value ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (ch) => TR_FOLD[ch] || ch);

const PRIVILEGED_ROLES = ['superadmin', 'admin', 'yonetici'];
const isPrivilegedRole = (role) => PRIVILEGED_ROLES.includes(String(role || '').toLowerCase());

const userKey = (user) => user?._id || user?.id;
const storeListOf = (user) => (user?.storeIds && user.storeIds.length ? user.storeIds : [user?.storeId]).filter(v => v !== undefined && v !== null);

const initialsOf = (name) => String(name || '?')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toLocaleUpperCase('tr')
    .substring(0, 2);

const roleLabel = (role, roles) => {
    const fromCatalog = (roles || []).find(r => normalize(r.name) === normalize(role));
    if (fromCatalog?.displayName) return fromCatalog.displayName;
    return ROLE_DISPLAY_NAMES[String(role || '').toLowerCase()] || role || 'Tanımsız';
};

const roleTone = (role) => {
    const normalized = normalizeRoleName(role);
    if (normalized === 'superadmin' || normalized === 'yonetici') return 'bg-[#1d1d1f] text-white border-[#1d1d1f]';
    if (normalized === 'storemanager') return 'bg-[#0071e3] text-white border-[#0071e3]';
    if (normalized === 'technician') return 'bg-[#008000]/10 text-[#1d7a4c] border-[#008000]/25';
    if (normalized === 'accountant') return 'bg-[#ff9500]/10 text-[#bf5b04] border-[#ff9500]/25';
    return 'bg-[#f5f5f7] text-gray-600 border-gray-200';
};

const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ---------------------------- mağaza seçim kutusu ---------------------------- */

const StorePicker = ({ id, stores, selected, onToggle, onAll, onNone, disabled, error, note }) => {
    const selectedIds = (selected || []).map(String);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <label htmlFor={id} className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Erişilebilir Mağazalar {!disabled && <span className="text-[#e30000]" aria-hidden="true">*</span>}
                </label>
                {!disabled && (
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={onAll} className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3] hover:underline">Tümü</button>
                        <span aria-hidden="true" className="text-gray-300">·</span>
                        <button type="button" onClick={onNone} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:underline">Temizle</button>
                    </div>
                )}
            </div>

            <div
                id={id}
                className={`rounded-xl border bg-[#f5f5f7] p-3 max-h-44 overflow-y-auto custom-scrollbar ${error ? 'border-[#e30000]' : 'border-gray-200'}`}
            >
                {disabled ? (
                    <p className="text-[12px] font-medium text-gray-500 py-1">{note}</p>
                ) : stores.length === 0 ? (
                    <p className="text-[12px] font-medium text-gray-500 py-1">Önce Mağaza & Lokasyon Ağı ekranından lokasyon tanımlayın.</p>
                ) : (
                    <div className="space-y-1.5">
                        {stores.map(store => {
                            const checked = selectedIds.includes(String(store.id));
                            return (
                                <label key={store.id} className="flex items-center gap-2.5 cursor-pointer text-[12px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => onToggle(store.id)}
                                        className="w-4 h-4 rounded border-gray-300 text-[#0071e3] focus-visible:ring-2 focus-visible:ring-[#0071e3]/40"
                                    />
                                    <span className="truncate">{store.name}</span>
                                    {store.shipTo && (
                                        <span className="ml-auto text-[10px] font-mono font-semibold text-gray-400 shrink-0">{store.shipTo}</span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            {error ? (
                <p role="alert" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#e30000]">
                    <AlertTriangle size={12} aria-hidden="true" /> {error}
                </p>
            ) : !disabled && (
                <p className="text-[11px] font-medium text-gray-500">
                    İlk seçilen mağaza birincil mağaza olur; kayıtlar varsayılan olarak oraya bağlanır.
                </p>
            )}
        </div>
    );
};

/* ------------------------------- personel kartı ------------------------------- */

const StaffRow = ({ user, roles, stores, canManage, isSelf, locked, onEdit, onRemove }) => {
    const privileged = isPrivilegedRole(user.role);
    const passive = user.isActive === false;
    const assigned = storeListOf(user);
    const storeNames = assigned
        .map(sid => stores.find(s => String(s.id) === String(sid))?.name)
        .filter(Boolean);
    const lastLogin = formatDate(user.lastLogin);

    return (
        <li className={`rounded-[20px] border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all ${passive ? 'border-gray-200 opacity-75' : 'border-gray-200'}`}>
            <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Kimlik */}
                <div className="flex items-center gap-3.5 min-w-0 lg:w-72 shrink-0">
                    <span
                        aria-hidden="true"
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-[13px] font-semibold shrink-0 ${passive
                            ? 'bg-[#f5f5f7] text-gray-400 border border-gray-200'
                            : 'bg-[#1d1d1f] text-white'}`}
                    >
                        {user.avatar || initialsOf(user.name)}
                    </span>
                    <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{user.name}</p>
                        <p className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 truncate">
                            <Mail size={11} aria-hidden="true" className="shrink-0" />
                            {user.email}
                        </p>
                    </div>
                </div>

                {/* Rol + kapsam */}
                <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${roleTone(user.role)}`}>
                        {roleLabel(user.role, roles)}
                    </span>

                    {privileged ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#0071e3] bg-[#0071e3]/8 border border-[#0071e3]/20 rounded-full px-2.5 py-1">
                            <ShieldCheck size={10} aria-hidden="true" /> Tüm Mağazalar
                        </span>
                    ) : storeNames.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#bf5b04] bg-[#ff9500]/10 border border-[#ff9500]/25 rounded-full px-2.5 py-1">
                            <AlertTriangle size={10} aria-hidden="true" /> Mağaza Atanmamış
                        </span>
                    ) : (
                        <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600 bg-[#f5f5f7] border border-gray-200 rounded-full px-2.5 py-1 max-w-full truncate"
                            title={storeNames.join(', ')}
                        >
                            <Store size={10} aria-hidden="true" className="shrink-0" />
                            {storeNames.length === 1 ? storeNames[0] : `${storeNames.length} Mağaza`}
                        </span>
                    )}

                    {passive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#c30000] bg-[#e30000]/8 border border-[#e30000]/20 rounded-full px-2.5 py-1">
                            <UserX size={10} aria-hidden="true" /> Erişim Kapalı
                        </span>
                    )}

                    {lastLogin && (
                        <span className="text-[11px] font-medium text-gray-400 ml-1">Son giriş {lastLogin}</span>
                    )}
                </div>

                {/* İşlemler */}
                <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-auto">
                    {locked ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-[#f5f5f7] border border-gray-200 rounded-lg px-3 py-2">
                            <Shield size={12} aria-hidden="true" /> Süper Admin
                        </span>
                    ) : canManage && (
                        <>
                            <button
                                type="button"
                                onClick={() => onEdit(user)}
                                className="h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-[12px] font-semibold text-gray-600 hover:text-[#0071e3] hover:border-[#0071e3]/30 inline-flex items-center gap-1.5 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                            >
                                <Pencil size={13} aria-hidden="true" /> Düzenle
                            </button>
                            {!isSelf && (
                                <button
                                    type="button"
                                    onClick={() => onRemove(user)}
                                    className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#e30000] hover:border-[#e30000]/30 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#e30000]/25"
                                >
                                    <Trash2 size={14} aria-hidden="true" />
                                    <span className="sr-only">{user.name} hesabını sil</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </li>
    );
};

/* -------------------------------- düzenleyici -------------------------------- */

const StaffEditor = ({ user, roles, stores, currentUser, existingUsers, onClose, onSubmit }) => {
    const { closing, requestClose } = useAnimatedClose(onClose, 200);
    const dialogRef = useRef(null);
    const isEdit = Boolean(user);

    const assignableRoles = useMemo(() => {
        const list = (roles || []).filter(role => {
            if (!isYonetici(currentUser)) return true;
            // Yönetici, SuperAdmin/Admin rolünü yalnızca hâlihazırda o role sahip
            // hesapta görebilir; yeni atama yapamaz.
            const roleIsSuper = ['superadmin', 'admin'].includes(normalize(role.name));
            if (!roleIsSuper) return true;
            return isEdit && isSuperAdmin(user);
        });
        return list.map(role => ({ value: role.name, label: role.displayName || role.name }));
    }, [roles, currentUser, isEdit, user]);

    const [form, setForm] = useState(() => {
        // Hesaptaki rol adı katalogdakiyle harf farkı taşıyabilir ("Admin" ↔ "admin");
        // seçim kutusunun boş görünmemesi için katalogdaki tam ada eşlenir.
        const matched = (roles || []).find(r => normalize(r.name) === normalize(user?.role));
        return {
            name: user?.name || '',
            email: user?.email || '',
            password: '',
            role: matched?.name || user?.role || assignableRoles[0]?.value || 'technician',
            storeIds: storeListOf(user || {}).map(Number).filter(n => !Number.isNaN(n)),
        };
    });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);

    const privileged = isPrivilegedRole(form.role);

    // Katalogda olmayan bir rol (silinmiş ya da elle atanmış) seçim kutusundan
    // düşmesin; aksi halde kaydet denince rol sessizce başkasına dönerdi.
    const roleOptions = useMemo(() => {
        if (assignableRoles.some(opt => normalize(opt.value) === normalize(form.role))) return assignableRoles;
        return [{ value: form.role, label: `${roleLabel(form.role, roles)} · katalog dışı` }, ...assignableRoles];
    }, [assignableRoles, form.role, roles]);

    useEffect(() => { dialogRef.current?.focus(); }, []);

    const closeRef = useRef(requestClose);
    closeRef.current = requestClose;
    useEffect(() => {
        const onKeyDown = (e) => { if (e.key === 'Escape') closeRef.current(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    const setField = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const toggleStore = (sid) => {
        const id = Number(sid);
        setErrors(prev => ({ ...prev, storeIds: undefined }));
        setForm(prev => {
            const list = (prev.storeIds || []).map(Number);
            return { ...prev, storeIds: list.includes(id) ? list.filter(x => x !== id) : [...list, id] };
        });
    };

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = 'Ad soyad zorunludur.';

        const email = form.email.trim();
        if (!email) {
            next.email = 'E-posta zorunludur.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            next.email = 'Geçerli bir e-posta adresi girin.';
        } else if (existingUsers.some(u => userKey(u) !== userKey(user) && normalize(u.email) === normalize(email))) {
            next.email = 'Bu e-posta adresi başka bir hesapta kayıtlı.';
        }

        if (!isEdit) {
            if (!form.password) next.password = 'Şifre zorunludur.';
            else if (form.password.length < 6) next.password = 'Şifre en az 6 karakter olmalıdır.';
        }

        if (!privileged && (form.storeIds || []).length === 0) {
            next.storeIds = 'En az bir mağaza seçilmelidir.';
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (busy || !validate()) return;

        // Yetkili roller tüm mağazalara erişir; birincil mağaza olarak merkez atanır.
        const merkez = stores.find(s => s.type === 'Merkez') || stores[0];
        const selected = privileged
            ? (form.storeIds.length ? form.storeIds : [Number(merkez?.id)].filter(n => n))
            : form.storeIds.map(Number);

        setBusy(true);
        try {
            const ok = await onSubmit({
                name: form.name.trim(),
                email: form.email.trim(),
                role: form.role,
                storeId: selected[0],
                storeIds: selected,
                ...(isEdit ? {} : { password: form.password }),
            });
            if (ok) requestClose();
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className={`fixed inset-0 z-[120] bg-[#1d1d1f]/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 ${closing ? 'animate-out fade-out duration-200 pointer-events-none' : 'animate-in fade-in'}`}
            onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
        >
            <form
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="staff-editor-title"
                tabIndex={-1}
                noValidate
                onSubmit={handleSubmit}
                className={`bg-white w-full max-w-2xl rounded-[24px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[92vh] outline-none ${closing ? 'animate-out fade-out zoom-out-95 duration-200' : 'animate-scale-up'}`}
            >
                <header className="flex items-center justify-between gap-4 px-6 sm:px-7 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0">
                            {isEdit ? <Pencil size={18} /> : <UserPlus size={19} />}
                        </span>
                        <div className="min-w-0">
                            <h3 id="staff-editor-title" className="text-[17px] font-semibold text-[#1d1d1f] truncate">
                                {isEdit ? 'Personeli Düzenle' : 'Yeni Personel'}
                            </h3>
                            <p className="text-[12px] font-medium text-gray-500 truncate">
                                {isEdit ? user.email : 'Hesap oluşturulduğunda personel hemen giriş yapabilir.'}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field
                            id="staff-name" label="Ad Soyad" required error={errors.name}
                            value={form.name} onChange={(v) => setField('name', v)}
                            placeholder="Örn: Ayşe Yılmaz" autoComplete="off"
                        />
                        <Field
                            id="staff-email" label="E-Posta" type="email" required error={errors.email}
                            value={form.email} onChange={(v) => setField('email', v)}
                            placeholder="ad.soyad@firma.com" autoComplete="off"
                        />

                        {isEdit ? (
                            <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-[#f5f5f7] px-4 py-3.5 flex items-start gap-2.5">
                                <Key size={14} aria-hidden="true" className="text-gray-500 mt-0.5 shrink-0" />
                                <p className="text-[12px] font-medium text-gray-600 leading-relaxed">
                                    Şifre sıfırlama ve sistem erişimini kapatma işlemleri
                                    <strong className="font-semibold text-[#1d1d1f]"> Ayarlar › Sistem Güvenliği </strong>
                                    ekranından yapılır.
                                </p>
                            </div>
                        ) : (
                            <Field
                                id="staff-password" label="Başlangıç Şifresi" type="password" required error={errors.password}
                                value={form.password} onChange={(v) => setField('password', v)}
                                placeholder="En az 6 karakter" autoComplete="new-password"
                                hint="Personelin ilk girişte kullanacağı şifre."
                            />
                        )}

                        <SelectField
                            id="staff-role" label="Rol" required
                            value={form.role} onChange={(v) => setField('role', v)}
                            options={roleOptions}
                            hint="Rolün yetki içeriği Yetki ve Rol Yönetimi ekranından belirlenir."
                        />

                        <div>
                            <StorePicker
                                id="staff-stores"
                                stores={stores}
                                selected={form.storeIds}
                                disabled={privileged}
                                note="Bu rol tüm mağazalara erişir; ayrıca seçim gerekmez."
                                error={errors.storeIds}
                                onToggle={toggleStore}
                                onAll={() => setField('storeIds', stores.map(s => Number(s.id)))}
                                onNone={() => setField('storeIds', [])}
                            />
                        </div>
                    </div>
                </div>

                <footer className="flex flex-wrap justify-end gap-3 px-6 sm:px-7 py-5 bg-[#f5f5f7] border-t border-gray-100 shrink-0">
                    <button
                        type="button"
                        onClick={requestClose}
                        className="h-11 px-5 rounded-xl text-[13px] font-semibold text-gray-600 hover:bg-white transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        Vazgeç
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <Check size={16} aria-hidden="true" />
                        {busy ? 'Kaydediliyor…' : (isEdit ? 'Değişiklikleri Kaydet' : 'Hesabı Oluştur')}
                    </button>
                </footer>
            </form>
        </div>
    );
};

/* --------------------------------- ana ekran --------------------------------- */

const StaffManagement = ({ onOpenRoles }) => {
    const {
        users, roles, allServicePoints, servicePoints,
        addUser, updateUser, removeUser, currentUser, showToast,
    } = useAppContext();

    const stores = allServicePoints?.length ? allServicePoints : (servicePoints || []);
    const canManageUsers = hasPermission(currentUser, 'manage_users');

    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [storeFilter, setStoreFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const staff = users || [];

    const totals = useMemo(() => ({
        all: staff.length,
        active: staff.filter(u => u.isActive !== false).length,
        passive: staff.filter(u => u.isActive === false).length,
        unassigned: staff.filter(u => !isPrivilegedRole(u.role) && storeListOf(u).length === 0).length,
    }), [staff]);

    /** Rol dağılımı: filtreye tıklanabilir kısayol olarak da çalışır */
    const roleBreakdown = useMemo(() => {
        const counts = new Map();
        staff.forEach(u => {
            const key = normalizeRoleName(u.role);
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        // Birden fazla katalog adı aynı role indirgenebilir (servis_sorumlusu →
        // storemanager); aynı sayıyı iki kez göstermemek için tekilleştirilir.
        const seen = new Set();
        return (roles || [])
            .map(role => ({
                name: role.name,
                key: normalizeRoleName(role.name),
                label: role.displayName || role.name,
                count: counts.get(normalizeRoleName(role.name)) || 0,
            }))
            .filter(item => {
                if (item.count === 0 || seen.has(item.key)) return false;
                seen.add(item.key);
                return true;
            })
            .sort((a, b) => b.count - a.count);
    }, [staff, roles]);

    const visibleStaff = useMemo(() => {
        const q = normalize(query.trim());
        return staff
            .filter(u => !q || normalize(u.name).includes(q) || normalize(u.email).includes(q))
            .filter(u => roleFilter === 'all' || normalizeRoleName(u.role) === normalizeRoleName(roleFilter))
            .filter(u => {
                if (storeFilter === 'all') return true;
                if (isPrivilegedRole(u.role)) return true;
                return storeListOf(u).map(String).includes(String(storeFilter));
            })
            .filter(u => statusFilter === 'all'
                || (statusFilter === 'active' ? u.isActive !== false : u.isActive === false))
            .slice()
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr'));
    }, [staff, query, roleFilter, storeFilter, statusFilter]);

    const openEditor = (user = null) => {
        setEditing(user);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setEditing(null);
    };

    const handleSubmit = async (data) => {
        if (editing) {
            const ok = await updateUser(userKey(editing), data);
            showToast(
                ok ? 'Personel bilgileri güncellendi.' : 'Güncelleme yapılamadı. Yetkinizi kontrol edin.',
                ok ? 'success' : 'error'
            );
            return ok;
        }
        const ok = await addUser({
            ...data,
            avatar: initialsOf(data.name),
        });
        if (ok) showToast(`${data.name} sisteme eklendi.`, 'success');
        return ok;
    };

    const handleRemove = async (user) => {
        if (!await appConfirm(`${user.name} hesabı sistemden kalıcı olarak silinecek. Onaylıyor musunuz?`)) return;
        const ok = await removeUser(userKey(user));
        showToast(ok ? `${user.name} hesabı silindi.` : 'Hesap silinemedi.', ok ? 'success' : 'error');
    };

    const isSelf = (user) => String(userKey(user)) === String(userKey(currentUser));
    const isLocked = (user) => isYonetici(currentUser) && isSuperAdmin(user);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Başlık + özet */}
            <header className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3]">Erişim Yönetimi</p>
                        <h3 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">Personel & Rol Yönetimi</h3>
                        <p className="text-[13px] font-medium text-gray-500 mt-1">
                            Hesapların rolünü ve mağaza erişimini yönetin.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {onOpenRoles && (
                            <button
                                type="button"
                                onClick={onOpenRoles}
                                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                            >
                                <Shield size={15} aria-hidden="true" /> Rol Yetkileri
                            </button>
                        )}
                        {canManageUsers && (
                            <button
                                type="button"
                                onClick={() => openEditor()}
                                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                            >
                                <UserPlus size={16} aria-hidden="true" /> Yeni Personel
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatTile icon={Users} label="Toplam Personel" value={totals.all} unit="hesap" />
                    <StatTile icon={ShieldCheck} label="Aktif" value={totals.active} unit="hesap" tone="bg-[#008000]/6 border-[#008000]/18" />
                    <StatTile icon={UserX} label="Erişimi Kapalı" value={totals.passive} unit="hesap" tone={totals.passive ? 'bg-[#e30000]/6 border-[#e30000]/18' : 'bg-white border-gray-200'} />
                    <StatTile icon={Building} label="Mağazasız" value={totals.unassigned} unit="hesap" tone={totals.unassigned ? 'bg-[#ff9500]/8 border-[#ff9500]/20' : 'bg-white border-gray-200'} />
                </div>
            </header>

            {/* Mağazasız hesap uyarısı */}
            <Collapse open={totals.unassigned > 0}>
                <div className="rounded-[18px] border border-[#ff9500]/25 bg-[#ff9500]/8 px-5 py-4 flex items-start gap-3">
                    <AlertTriangle size={15} aria-hidden="true" className="text-[#bf5b04] mt-0.5 shrink-0" />
                    <p className="text-[12px] font-medium text-[#8a4503] leading-relaxed">
                        <strong className="font-semibold">{totals.unassigned} hesabın</strong> tanımlı mağazası yok.
                        Bu hesaplar servis kaydı açamaz ve stok girişi yapamaz; düzenleyip en az bir mağaza seçin.
                    </p>
                </div>
            </Collapse>

            {/* Rol dağılımı */}
            {roleBreakdown.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mr-1">Rol Dağılımı</span>
                    {roleBreakdown.map(item => {
                        const active = normalizeRoleName(roleFilter) === normalizeRoleName(item.name);
                        return (
                            <button
                                key={item.name}
                                type="button"
                                onClick={() => setRoleFilter(active ? 'all' : item.name)}
                                aria-pressed={active}
                                className={`inline-flex items-center gap-2 h-8 px-3 rounded-full border text-[11px] font-semibold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active
                                    ? 'bg-[#0071e3] text-white border-[#0071e3]'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#0071e3]/30'}`}
                            >
                                {item.label}
                                <span className={`text-[10px] font-bold ${active ? 'text-white/75' : 'text-gray-400'}`}>{item.count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Araç çubuğu */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <label htmlFor="staff-search" className="sr-only">Personel ara</label>
                    <Search size={15} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        id="staff-search"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ad veya e-posta ara…"
                        className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-full sm:w-56">
                        <label htmlFor="staff-store-filter" className="sr-only">Mağazaya göre filtrele</label>
                        <SelectField
                            id="staff-store-filter"
                            value={storeFilter}
                            onChange={setStoreFilter}
                            options={[
                                { value: 'all', label: 'Tüm mağazalar' },
                                ...stores.map(s => ({ value: String(s.id), label: s.name })),
                            ]}
                        />
                    </div>

                    <div role="group" aria-label="Duruma göre filtrele" className="flex bg-[#f5f5f7] p-1 rounded-xl border border-gray-200/60">
                        <SegmentButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} count={totals.all}>Tümü</SegmentButton>
                        <SegmentButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} count={totals.active}>Aktif</SegmentButton>
                        <SegmentButton active={statusFilter === 'passive'} onClick={() => setStatusFilter('passive')} count={totals.passive}>Kapalı</SegmentButton>
                    </div>
                </div>
            </div>

            {/* Yetki uyarısı */}
            <Collapse open={!canManageUsers}>
                <div className="rounded-[18px] border border-gray-200 bg-[#f5f5f7] px-5 py-4 flex items-start gap-3">
                    <Lock size={15} aria-hidden="true" className="text-gray-500 mt-0.5 shrink-0" />
                    <p className="text-[12px] font-medium text-gray-600 leading-relaxed">
                        Personel hesaplarını yalnızca görüntüleyebilirsiniz. Değişiklik için
                        <strong className="font-semibold"> kullanıcı yönetimi </strong> yetkisi gerekir.
                    </p>
                </div>
            </Collapse>

            {/* Personel listesi */}
            {visibleStaff.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title={staff.length === 0 ? 'Henüz personel hesabı yok' : 'Eşleşen personel yok'}
                    description={staff.length === 0
                        ? 'Ekibinizi sisteme eklemek için ilk hesabı oluşturun.'
                        : 'Arama ya da filtreleri değiştirerek tekrar deneyin.'}
                />
            ) : (
                <ul className="space-y-3 list-none p-0 m-0">
                    {visibleStaff.map(user => (
                        <StaffRow
                            key={userKey(user)}
                            user={user}
                            roles={roles}
                            stores={stores}
                            canManage={canManageUsers}
                            isSelf={isSelf(user)}
                            locked={isLocked(user)}
                            onEdit={openEditor}
                            onRemove={handleRemove}
                        />
                    ))}
                </ul>
            )}

            {editorOpen && (
                <StaffEditor
                    user={editing}
                    roles={roles}
                    stores={stores}
                    currentUser={currentUser}
                    existingUsers={staff}
                    onClose={closeEditor}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
};

export default StaffManagement;
