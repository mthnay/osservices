import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Shield, Key, Lock, Search, X, Check, AlertTriangle, ChevronDown, Clock,
    UserX, UserCheck, RefreshCw, Info, Eye, EyeOff, Users
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { appConfirm } from '../utils/alert';
import { hasPermission, isSuperAdmin, isYonetici, ROLE_DISPLAY_NAMES } from '../utils/permissions';
import Collapse from './ui/Collapse';
import useAnimatedClose from './ui/useAnimatedClose';

/* ------------------------------------------------------------------
   Sistem Güvenliği
   - Kullanıcı şifrelerini belirleme (sistemde tek yetkili ekran)
   - Sisteme erişimi kapatma / açma
   - Kendi şifresini değiştirme
------------------------------------------------------------------ */

const MIN_PASSWORD_LENGTH = 6;
const normalize = (value) => String(value ?? '').toLocaleLowerCase('tr');

const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString('tr-TR');
};

/** Basit şifre gücü değerlendirmesi */
const passwordStrength = (value) => {
    const pwd = String(value || '');
    if (pwd.length < MIN_PASSWORD_LENGTH) return { level: 0, label: 'Çok kısa', tone: 'bg-[#e30000]' };
    let score = 0;
    if (pwd.length >= 10) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { level: 1, label: 'Zayıf', tone: 'bg-[#e30000]' };
    if (score === 2) return { level: 2, label: 'Orta', tone: 'bg-[#ff9500]' };
    if (score === 3) return { level: 3, label: 'İyi', tone: 'bg-[#0071e3]' };
    return { level: 4, label: 'Güçlü', tone: 'bg-[#008000]' };
};

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

const SecurityCenter = ({ onReboot }) => {
    const { users, updateUser, currentUser, showToast, allServicePoints, API_URL } = useAppContext();

    const canManage = hasPermission(currentUser, 'manage_security');

    const [term, setTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [passwordTarget, setPasswordTarget] = useState(null);
    const [ownPanelOpen, setOwnPanelOpen] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const currentId = String(currentUser?._id || currentUser?.id || '');

    /** Yönetici, SuperAdmin hesaplarına müdahale edemez (sunucu da engeller) */
    const canTouch = (user) => {
        if (!canManage) return false;
        if (isYonetici(currentUser) && isSuperAdmin(user)) return false;
        return true;
    };

    const rows = useMemo(() => (users || []).map(user => ({
        ...user,
        uid: String(user._id || user.id || ''),
        active: user.isActive !== false,
    })), [users]);

    const filtered = useMemo(() => {
        const q = normalize(term.trim());
        return rows.filter(user => {
            if (statusFilter === 'active' && !user.active) return false;
            if (statusFilter === 'disabled' && user.active) return false;
            if (!q) return true;
            return normalize(user.name).includes(q) || normalize(user.email).includes(q);
        });
    }, [rows, term, statusFilter]);

    const disabledCount = useMemo(() => rows.filter(u => !u.active).length, [rows]);

    const toggleAccess = async (user) => {
        if (user.uid === currentId) {
            showToast('Kendi sistem erişiminizi kapatamazsınız.', 'error');
            return;
        }

        const turningOff = user.active;
        const confirmed = await appConfirm(
            turningOff
                ? `${user.name} adlı kullanıcının sisteme erişimi kapatılacak. Açık oturumu da anında sonlanır ve tekrar giriş yapamaz. Onaylıyor musunuz?`
                : `${user.name} adlı kullanıcının sistem erişimi yeniden açılacak. Onaylıyor musunuz?`
        );
        if (!confirmed) return;

        setBusyId(user.uid);
        try {
            const ok = await updateUser(user.uid, { isActive: !turningOff });
            if (ok) {
                showToast(
                    turningOff
                        ? `${user.name} için sistem erişimi kapatıldı.`
                        : `${user.name} için sistem erişimi açıldı.`,
                    turningOff ? 'warning' : 'success'
                );
            } else {
                showToast('İşlem tamamlanamadı. Yetkinizi kontrol edin.', 'error');
            }
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Başlık */}
            <header className="space-y-6">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3]">Güvenlik</p>
                    <h3 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">Sistem Güvenliği</h3>
                    <p className="text-[13px] font-medium text-gray-500 mt-1">
                        Kullanıcı şifreleri ve sistem erişimi yalnızca bu ekrandan yönetilir.
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryTile icon={Users} label="Toplam Hesap" value={rows.length} unit="kullanıcı" />
                    <SummaryTile icon={UserCheck} label="Erişimi Açık" value={rows.length - disabledCount} unit="hesap" tone="bg-[#008000]/6 border-[#008000]/18" />
                    <SummaryTile icon={UserX} label="Erişimi Kapalı" value={disabledCount} unit="hesap" tone={disabledCount > 0 ? 'bg-[#e30000]/5 border-[#e30000]/15' : 'bg-white border-gray-200'} />
                    <SummaryTile icon={Shield} label="Yetki Seviyeniz" value={ROLE_DISPLAY_NAMES[currentUser?.role?.toLowerCase()] || currentUser?.role || '—'} unit="" tone="bg-[#0071e3]/5 border-[#0071e3]/15" />
                </div>
            </header>

            {/* Kendi şifrem */}
            <section aria-labelledby="own-password-title" className="rounded-[24px] border border-gray-200 bg-white overflow-hidden">
                <button
                    type="button"
                    onClick={() => setOwnPanelOpen(v => !v)}
                    aria-expanded={ownPanelOpen}
                    aria-controls="own-password-panel"
                    className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-[#f5f5f7]/60 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                >
                    <span className="flex items-center gap-3.5 min-w-0">
                        <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#f5f5f7] border border-gray-200 text-[#1d1d1f] flex items-center justify-center shrink-0">
                            <Key size={19} />
                        </span>
                        <span className="min-w-0">
                            <span id="own-password-title" className="block text-[15px] font-semibold text-[#1d1d1f]">Kendi Şifremi Değiştir</span>
                            <span className="block text-[12px] font-medium text-gray-500 mt-0.5">
                                {currentUser?.email || 'Oturum açan hesap'}
                            </span>
                        </span>
                    </span>
                    <ChevronDown size={16} aria-hidden="true" className={`text-gray-400 shrink-0 transition-transform duration-300 ${ownPanelOpen ? 'rotate-180' : ''}`} />
                </button>

                <Collapse open={ownPanelOpen}>
                    {() => (
                        <div id="own-password-panel" className="border-t border-gray-100">
                            <OwnPasswordForm
                                currentUser={currentUser}
                                updateUser={updateUser}
                                showToast={showToast}
                                API_URL={API_URL}
                                onDone={() => setOwnPanelOpen(false)}
                            />
                        </div>
                    )}
                </Collapse>
            </section>

            {!canManage ? (
                <div className="rounded-[24px] border border-gray-200 bg-white p-6 flex items-start gap-3">
                    <Info size={16} aria-hidden="true" className="text-gray-400 shrink-0 mt-0.5" />
                    <p className="text-[13px] font-medium text-gray-600">
                        Diğer kullanıcıların şifrelerini ve sistem erişimini yönetmek için yönetici yetkisi gerekir.
                    </p>
                </div>
            ) : (
                <>
                    {/* Arama & durum filtresi */}
                    <section aria-labelledby="sec-filter-title" className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6">
                        <h4 id="sec-filter-title" className="sr-only">Kullanıcı arama ve durum filtresi</h4>

                        <div className="space-y-2">
                            <label htmlFor="sec-search" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Kullanıcı Ara
                            </label>
                            <div className="relative">
                                <Search size={15} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    id="sec-search"
                                    type="search"
                                    value={term}
                                    onChange={(e) => setTerm(e.target.value)}
                                    placeholder="Ad veya e-posta ara…"
                                    className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                                />
                            </div>
                        </div>

                        <div className="mt-5">
                            <p id="sec-status-label" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2.5">Erişim Durumu</p>
                            <div role="group" aria-labelledby="sec-status-label" className="flex flex-wrap gap-2">
                                {[
                                    { key: 'all', label: 'Tümü', count: rows.length },
                                    { key: 'active', label: 'Erişimi açık', count: rows.length - disabledCount },
                                    { key: 'disabled', label: 'Erişimi kapalı', count: disabledCount },
                                ].map(opt => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setStatusFilter(opt.key)}
                                        aria-pressed={statusFilter === opt.key}
                                        className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12px] font-semibold border transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${statusFilter === opt.key
                                            ? 'bg-[#1d1d1f] border-[#1d1d1f] text-white'
                                            : 'bg-white border-gray-200 text-[#1d1d1f] hover:bg-[#f5f5f7]'}`}
                                    >
                                        {opt.label} <span className="opacity-60">({opt.count})</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <p aria-live="polite" className="text-[12px] font-semibold text-gray-600 mt-5 pt-5 border-t border-gray-100">
                            {filtered.length === rows.length
                                ? `${rows.length} hesap listeleniyor`
                                : `${rows.length} hesaptan ${filtered.length} tanesi eşleşti`}
                        </p>
                    </section>

                    {/* Kullanıcı listesi */}
                    {filtered.length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-gray-300 bg-white/60 py-16 text-center">
                            <Users size={34} aria-hidden="true" className="mx-auto text-gray-300 mb-3" />
                            <p className="text-[14px] font-semibold text-[#1d1d1f]">Eşleşen hesap bulunamadı</p>
                        </div>
                    ) : (
                        <ul className="space-y-3 list-none p-0 m-0">
                            {filtered.map(user => {
                                const editable = canTouch(user);
                                const isSelf = user.uid === currentId;
                                const lastLogin = formatDate(user.lastLogin);
                                const disabledAt = formatDate(user.disabledAt);
                                const storeNames = (user.storeIds?.length ? user.storeIds : [user.storeId])
                                    .map(sid => allServicePoints?.find(sp => Number(sp.id) === Number(sid))?.name)
                                    .filter(Boolean);

                                return (
                                    <li
                                        key={user.uid || user.email}
                                        className={`rounded-[20px] border bg-white p-5 flex flex-wrap items-start justify-between gap-4 transition-colors ${user.active ? 'border-gray-200' : 'border-[#e30000]/25 bg-[#e30000]/[0.03]'}`}
                                    >
                                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                            <span
                                                aria-hidden="true"
                                                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-semibold text-[15px] ${user.active
                                                    ? 'bg-[#1d1d1f] text-white'
                                                    : 'bg-[#f5f5f7] text-gray-400 border border-gray-200'}`}
                                            >
                                                {user.avatar || String(user.name || '?').substring(0, 1).toUpperCase()}
                                            </span>

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-[15px] font-semibold text-[#1d1d1f] truncate">{user.name}</h4>
                                                    {isSelf && (
                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#0071e3] bg-[#0071e3]/8 border border-[#0071e3]/15 rounded-full px-2 py-0.5">
                                                            Siz
                                                        </span>
                                                    )}
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 border ${user.active
                                                        ? 'text-[#1d7a4c] bg-[#008000]/8 border-[#008000]/20'
                                                        : 'text-[#c30000] bg-[#e30000]/8 border-[#e30000]/20'}`}>
                                                        {user.active ? 'Erişim açık' : 'Erişim kapalı'}
                                                    </span>
                                                </div>

                                                <p className="text-[12px] font-medium text-gray-500 truncate mt-0.5">{user.email}</p>

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                                        {ROLE_DISPLAY_NAMES[user.role?.toLowerCase()] || user.role}
                                                    </span>
                                                    {storeNames.length > 0 && (
                                                        <span className="text-[10px] font-medium text-gray-400 truncate max-w-[240px]">
                                                            {storeNames.join(', ')}
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400">
                                                        <Clock size={10} aria-hidden="true" />
                                                        {lastLogin ? `Son giriş: ${lastLogin}` : 'Henüz giriş yapılmamış'}
                                                    </span>
                                                </div>

                                                {!user.active && (
                                                    <p className="flex items-start gap-1.5 text-[11px] font-medium text-[#c30000] mt-2">
                                                        <AlertTriangle size={12} aria-hidden="true" className="shrink-0 mt-0.5" />
                                                        <span>
                                                            {disabledAt ? `${disabledAt} tarihinde kapatıldı` : 'Erişim kapalı'}
                                                            {user.disabledBy ? ` · ${user.disabledBy}` : ''}
                                                            {user.disabledReason ? ` · ${user.disabledReason}` : ''}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            {editable ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPasswordTarget(user)}
                                                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-gray-200 bg-white text-[12px] font-semibold text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                                    >
                                                        <Key size={14} aria-hidden="true" /> Şifre Belirle
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleAccess(user)}
                                                        disabled={busyId === user.uid || isSelf}
                                                        title={isSelf ? 'Kendi erişiminizi kapatamazsınız' : undefined}
                                                        className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-[12px] font-semibold transition-all outline-none disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-4 ${user.active
                                                            ? 'border-[#e30000]/25 bg-white text-[#c30000] hover:bg-[#e30000]/5 focus-visible:ring-[#e30000]/25'
                                                            : 'border-[#008000]/25 bg-white text-[#1d7a4c] hover:bg-[#008000]/5 focus-visible:ring-[#008000]/25'}`}
                                                    >
                                                        {user.active
                                                            ? <><UserX size={14} aria-hidden="true" /> Erişimi Kapat</>
                                                            : <><UserCheck size={14} aria-hidden="true" /> Erişimi Aç</>}
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#bf5b04] bg-[#ff9500]/10 border border-[#ff9500]/25 rounded-full px-2.5 py-1">
                                                    Süper Admin — korumalı
                                                </span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}

            {/* Sunucu yönetimi */}
            {isSuperAdmin(currentUser) && typeof onReboot === 'function' && (
                <section aria-labelledby="server-title" className="rounded-[24px] border border-[#e30000]/20 bg-[#e30000]/[0.03] p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <RefreshCw size={18} aria-hidden="true" className="text-[#c30000] shrink-0 mt-0.5" />
                            <div className="min-w-0">
                                <h4 id="server-title" className="text-[14px] font-semibold text-[#1d1d1f]">Sunucu Yönetimi</h4>
                                <p className="text-[12px] font-medium text-gray-600 mt-1 max-w-2xl">
                                    Sistem hatası veya performans düşüklüğü durumunda ana sunucu işlemini yeniden başlatabilirsiniz.
                                    Bu sırada tüm kullanıcılar kısa süreli bağlantı kaybı yaşar.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onReboot}
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#c30000] text-white text-[13px] font-semibold hover:bg-[#a30000] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#e30000]/25 shrink-0"
                        >
                            <RefreshCw size={16} aria-hidden="true" /> Sunucuyu Yeniden Başlat
                        </button>
                    </div>
                </section>
            )}

            {passwordTarget && (
                <SetPasswordDialog
                    user={passwordTarget}
                    onClose={() => setPasswordTarget(null)}
                    updateUser={updateUser}
                    showToast={showToast}
                />
            )}
        </div>
    );
};

/* ----------------------------- kendi şifresi ----------------------------- */

const OwnPasswordForm = ({ currentUser, updateUser, showToast, API_URL, onDone }) => {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [repeat, setRepeat] = useState('');
    const [reveal, setReveal] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const strength = passwordStrength(next);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (busy) return;

        if (!current) return setError('Mevcut şifrenizi girin.');
        if (next.length < MIN_PASSWORD_LENGTH) return setError(`Yeni şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`);
        if (next !== repeat) return setError('Yeni şifre tekrarı eşleşmiyor.');
        if (next === current) return setError('Yeni şifre mevcut şifreyle aynı olamaz.');

        setError('');
        setBusy(true);
        try {
            const userId = currentUser?._id || currentUser?.id;

            // Önce mevcut şifre doğrulanır
            const res = await fetch(`${API_URL}/users/verify-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                },
                body: JSON.stringify({ userId, password: current }),
            });

            if (!res.ok) {
                setError('Mevcut şifre hatalı.');
                return;
            }

            const ok = await updateUser(userId, { password: next });
            if (ok) {
                setCurrent(''); setNext(''); setRepeat('');
                showToast('Şifreniz güncellendi.', 'success');
                onDone?.();
            } else {
                setError('Şifre güncellenemedi. Lütfen tekrar deneyin.');
            }
        } catch {
            setError('Bağlantı hatası. Lütfen tekrar deneyin.');
        } finally {
            setBusy(false);
        }
    };

    const fieldClass = 'w-full h-12 px-4 pr-12 bg-[#f5f5f7] border border-gray-200 rounded-xl text-[13px] font-semibold text-[#1d1d1f] outline-none focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all';

    return (
        <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-6 space-y-5 max-w-lg">
            <div className="space-y-2">
                <label htmlFor="own-current" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Mevcut Şifre <span className="text-[#e30000]" aria-hidden="true">*</span>
                </label>
                <input
                    id="own-current" type={reveal ? 'text' : 'password'} autoComplete="current-password"
                    value={current} onChange={(e) => setCurrent(e.target.value)}
                    className={fieldClass}
                />
            </div>

            <div className="space-y-2">
                <label htmlFor="own-next" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Yeni Şifre <span className="text-[#e30000]" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                    <input
                        id="own-next" type={reveal ? 'text' : 'password'} autoComplete="new-password"
                        value={next} onChange={(e) => setNext(e.target.value)}
                        aria-describedby="own-next-strength"
                        className={fieldClass}
                    />
                    <button
                        type="button"
                        onClick={() => setReveal(v => !v)}
                        aria-label={reveal ? 'Şifreleri gizle' : 'Şifreleri göster'}
                        aria-pressed={reveal}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-gray-400 hover:text-[#1d1d1f] hover:bg-white flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        {reveal ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                    </button>
                </div>
                {next && (
                    <div id="own-next-strength" className="flex items-center gap-2">
                        <span className="flex gap-1 flex-1" aria-hidden="true">
                            {[1, 2, 3, 4].map(i => (
                                <span key={i} className={`h-1 flex-1 rounded-full ${i <= strength.level ? strength.tone : 'bg-gray-200'}`} />
                            ))}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{strength.label}</span>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label htmlFor="own-repeat" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    Yeni Şifre (Tekrar) <span className="text-[#e30000]" aria-hidden="true">*</span>
                </label>
                <input
                    id="own-repeat" type={reveal ? 'text' : 'password'} autoComplete="new-password"
                    value={repeat} onChange={(e) => setRepeat(e.target.value)}
                    className={fieldClass}
                />
            </div>

            {error && (
                <p role="alert" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#e30000]">
                    <AlertTriangle size={12} aria-hidden="true" /> {error}
                </p>
            )}

            <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
            >
                <Check size={16} aria-hidden="true" />
                {busy ? 'Güncelleniyor…' : 'Şifremi Güncelle'}
            </button>
        </form>
    );
};

/* ------------------------- başka kullanıcıya şifre ------------------------- */

const SetPasswordDialog = ({ user, onClose, updateUser, showToast }) => {
    const { closing, requestClose } = useAnimatedClose(onClose, 200);
    const dialogRef = useRef(null);

    const [next, setNext] = useState('');
    const [repeat, setRepeat] = useState('');
    const [reveal, setReveal] = useState(false);
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

    const strength = passwordStrength(next);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (busy) return;

        if (next.length < MIN_PASSWORD_LENGTH) return setError(`Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`);
        if (next !== repeat) return setError('Şifre tekrarı eşleşmiyor.');

        setError('');
        setBusy(true);
        try {
            const ok = await updateUser(user._id || user.id, { password: next });
            if (ok) {
                showToast(`${user.name} için yeni şifre belirlendi.`, 'success');
                requestClose();
            } else {
                setError('Şifre belirlenemedi. Yetkinizi kontrol edin.');
            }
        } finally {
            setBusy(false);
        }
    };

    const fieldClass = 'w-full h-12 px-4 pr-12 bg-[#f5f5f7] border border-gray-200 rounded-xl text-[13px] font-semibold text-[#1d1d1f] outline-none focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all';

    return (
        <div
            className={`fixed inset-0 z-[120] bg-[#1d1d1f]/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 ${closing ? 'animate-out fade-out duration-200 pointer-events-none' : 'animate-in fade-in'}`}
            onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
        >
            <form
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="set-pw-title"
                tabIndex={-1}
                noValidate
                onSubmit={handleSubmit}
                className={`bg-white w-full max-w-lg rounded-[24px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh] outline-none ${closing ? 'animate-out fade-out zoom-out-95 duration-200' : 'animate-scale-up'}`}
            >
                <header className="flex items-center justify-between gap-4 px-6 sm:px-7 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0">
                            <Lock size={19} />
                        </span>
                        <div className="min-w-0">
                            <h3 id="set-pw-title" className="text-[17px] font-semibold text-[#1d1d1f] truncate">Şifre Belirle</h3>
                            <p className="text-[12px] font-medium text-gray-500 truncate">{user.name} · {user.email}</p>
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
                    <div className="flex items-start gap-2.5 p-4 rounded-[16px] bg-[#ff9500]/8 border border-[#ff9500]/25">
                        <Info size={15} aria-hidden="true" className="text-[#bf5b04] shrink-0 mt-0.5" />
                        <p className="text-[12px] font-medium text-[#1d1d1f]">
                            Kullanıcının mevcut şifresi doğrudan yenisiyle değiştirilir. Yeni şifreyi kullanıcıya güvenli bir kanaldan iletin.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="set-pw-next" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            Yeni Şifre <span className="text-[#e30000]" aria-hidden="true">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="set-pw-next" type={reveal ? 'text' : 'password'} autoComplete="new-password"
                                value={next} onChange={(e) => setNext(e.target.value)}
                                aria-describedby="set-pw-strength"
                                className={fieldClass}
                            />
                            <button
                                type="button"
                                onClick={() => setReveal(v => !v)}
                                aria-label={reveal ? 'Şifreleri gizle' : 'Şifreleri göster'}
                                aria-pressed={reveal}
                                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-gray-400 hover:text-[#1d1d1f] hover:bg-white flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                            >
                                {reveal ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                            </button>
                        </div>
                        {next && (
                            <div id="set-pw-strength" className="flex items-center gap-2">
                                <span className="flex gap-1 flex-1" aria-hidden="true">
                                    {[1, 2, 3, 4].map(i => (
                                        <span key={i} className={`h-1 flex-1 rounded-full ${i <= strength.level ? strength.tone : 'bg-gray-200'}`} />
                                    ))}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{strength.label}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="set-pw-repeat" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            Yeni Şifre (Tekrar) <span className="text-[#e30000]" aria-hidden="true">*</span>
                        </label>
                        <input
                            id="set-pw-repeat" type={reveal ? 'text' : 'password'} autoComplete="new-password"
                            value={repeat} onChange={(e) => setRepeat(e.target.value)}
                            className={fieldClass}
                        />
                    </div>

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
                        {busy ? 'Kaydediliyor…' : 'Şifreyi Belirle'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default SecurityCenter;
