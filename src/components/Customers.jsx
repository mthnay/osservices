import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    User, Users, Plus, Search, Mail, MapPin, Trash2, Pencil, X, Check, Copy,
    ChevronDown, ChevronRight, MessageCircle, Tag, Clock, Building2, FileText,
    Wrench, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { hasPermission } from '../utils/permissions';
import {
    findCustomerMatches, describeMatch, blocksCreate, isForceable, isValidTc,
} from '../utils/customerMatch';
import { ARCHIVE_STATUSES, parseRepairDate } from '../utils/archiveFilters';
import MyPhoneIcon from './LocalIcons';
import Collapse from './ui/Collapse';
import useAnimatedClose from './ui/useAnimatedClose';
import { StatTile, Field, TextAreaField, SelectField, SegmentButton, EmptyState } from './ui/FormControls';
import { appConfirm } from '../utils/alert';

/* ------------------------------------------------------------------
   Müşteri Rehberi
   Solda gruplanmış müşteri listesi, sağda seçili müşterinin künyesi ve
   servis geçmişi. Tüm sayılar gerçek kayıtlardan türetilir.
------------------------------------------------------------------ */

const TR_FOLD = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
const normalize = (value) => String(value ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (ch) => TR_FOLD[ch] || ch);

const CUSTOMER_TAGS = ['VIP', 'Kurumsal', 'Sadık Müşteri', 'Sorunlu'];
const TYPE_FILTERS = [
    { id: 'all', label: 'Tümü' },
    { id: 'bireysel', label: 'Bireysel' },
    { id: 'kurumsal', label: 'Kurumsal' },
];

const customerKey = (customer) => customer?._id || customer?.id;
const isCorporate = (customer) => normalize(customer?.type) === 'kurumsal';
const isClosed = (repair) => ARCHIVE_STATUSES.includes(repair?.status);

const initialsOf = (name) => String(name || '?')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toLocaleUpperCase('tr')
    .substring(0, 2);

const formatDay = (value) => {
    const date = parseRepairDate(value);
    if (!date) return String(value || '—');
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ------------------------------- liste satırı ------------------------------- */

const CustomerRow = ({ customer, selected, canDelete, onSelect, onDelete }) => {
    const tags = customer.tags || [];

    return (
        <li>
            <div className={`flex items-stretch gap-1 rounded-[16px] border transition-all ${selected
                ? 'border-[#0071e3] bg-[#0071e3]/5'
                : 'border-gray-200 bg-white hover:border-[#0071e3]/30'}`}
            >
                <button
                    type="button"
                    onClick={() => onSelect(customer)}
                    aria-current={selected ? 'true' : undefined}
                    className="flex-1 min-w-0 flex items-center gap-3 px-3.5 py-3 text-left rounded-[16px] outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                >
                    <span
                        aria-hidden="true"
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-semibold shrink-0 ${selected
                            ? 'bg-[#0071e3] text-white'
                            : 'bg-[#f5f5f7] text-[#1d1d1f] border border-gray-200'}`}
                    >
                        {initialsOf(customer.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-[#1d1d1f] truncate">{customer.name}</span>
                        <span className="block text-[11px] font-medium text-gray-500 truncate font-mono">
                            {customer.phone || 'Telefon yok'}
                        </span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                        {isCorporate(customer) && (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 bg-[#f5f5f7] border border-gray-200 rounded-full px-2 py-0.5">
                                Kurumsal
                            </span>
                        )}
                        {tags.includes('VIP') && (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#bf5b04] bg-[#ff9500]/10 border border-[#ff9500]/25 rounded-full px-2 py-0.5">
                                VIP
                            </span>
                        )}
                    </span>
                </button>

                {canDelete && (
                    <button
                        type="button"
                        onClick={() => onDelete(customer)}
                        className="w-10 shrink-0 rounded-r-[16px] text-gray-400 hover:text-[#e30000] hover:bg-[#e30000]/5 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#e30000]/25"
                    >
                        <Trash2 size={14} aria-hidden="true" />
                        <span className="sr-only">{customer.name} müşterisini sil</span>
                    </button>
                )}
            </div>
        </li>
    );
};

/* ------------------------------ künye satırı ------------------------------ */

const ContactLine = ({ icon: Icon, label, value, mono, onCopy, action }) => (
    <div className="flex items-center gap-3 py-2.5">
        {/* Yerel ikon bileşeni aria özniteliği almadığı için sarmalayıcıda gizlenir */}
        <span aria-hidden="true" className="text-gray-400 shrink-0 flex items-center">
            <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
            <p className={`text-[13px] font-semibold text-[#1d1d1f] truncate ${mono ? 'font-mono' : ''}`}>
                {value || <span className="font-medium text-gray-400">Tanımlı değil</span>}
            </p>
        </div>
        {value && onCopy && (
            <button
                type="button"
                onClick={onCopy}
                className="h-8 w-8 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-[#0071e3] hover:border-[#0071e3]/30 flex items-center justify-center transition-all shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
            >
                <Copy size={13} aria-hidden="true" />
                <span className="sr-only">{label} kopyala</span>
            </button>
        )}
        {action}
    </div>
);

/* ---------------------------- mükerrer cari uyarısı ---------------------------- */

/**
 * Girilen bilgilerle eşleşen mevcut carileri gösterir. "exact" (TC) eşleşmesinde
 * yeni kayıt hiç açılamaz; "confirm" (telefon / ad soyad) eşleşmesinde kullanıcı
 * farklı kişi olduğunu onaylayabilir.
 */
const DuplicateNotice = ({ duplicate, canOverride, forceCreate, onToggleForce, onUseExisting, isEdit }) => {
    const exact = duplicate.level === 'exact';

    return (
        <div
            role="alert"
            className={`rounded-[18px] border p-4 space-y-3 ${exact
                ? 'border-[#e30000]/30 bg-[#e30000]/5'
                : 'border-[#ff9500]/35 bg-[#ff9500]/5'}`}
        >
            <div className="flex items-start gap-3">
                <span aria-hidden="true" className={exact ? 'text-[#e30000] mt-0.5' : 'text-[#bf5b04] mt-0.5'}>
                    <AlertTriangle size={16} />
                </span>
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#1d1d1f]">
                        {exact ? 'Bu kişi zaten kayıtlı' : 'Eşleşen cari bulundu'}
                    </p>
                    <p className="text-[11px] font-medium text-gray-600 leading-snug mt-0.5">
                        {exact
                            ? `Aynı TC kimlik numarasıyla bir cari mevcut. ${isEdit ? 'Bu bilgiler başka bir cariye ait.' : 'Yeni cari açılamaz; mevcut kaydı kullanın veya düzenleyin.'}`
                            : 'Aşağıdaki cari(ler) aynı kişi olabilir. Mevcut kaydı kullanın ya da farklı kişi olduğunu onaylayın.'}
                    </p>
                </div>
            </div>

            <ul className="space-y-2">
                {duplicate.matches.slice(0, 3).map((match) => (
                    <li key={customerKey(match.customer)}>
                        <button
                            type="button"
                            onClick={() => onUseExisting(match.customer)}
                            className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left hover:border-[#0071e3]/40 hover:bg-[#0071e3]/5 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            <span aria-hidden="true" className="w-9 h-9 rounded-xl bg-[#f5f5f7] border border-gray-200 text-[#1d1d1f] flex items-center justify-center text-[11px] font-semibold shrink-0">
                                {initialsOf(match.customer.name)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-semibold text-[#1d1d1f] truncate">
                                    {match.customer.name} <span className="text-gray-400 font-mono text-[11px]">{match.customer.id}</span>
                                </span>
                                <span className="block text-[11px] font-medium text-gray-500 truncate">
                                    {describeMatch(match.reasons)} — bu kaydı açıp düzenle
                                </span>
                            </span>
                            <ChevronRight size={16} className="text-[#0071e3] shrink-0" aria-hidden="true" />
                        </button>
                    </li>
                ))}
            </ul>

            {canOverride && (
                <label className="flex items-start gap-2.5 text-[12px] font-medium text-gray-700 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={forceCreate}
                        onChange={(e) => onToggleForce(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#0071e3]"
                    />
                    <span>
                        {isEdit
                            ? 'Bu farklı bir kişi, değişikliği yine de kaydet.'
                            : 'Bu farklı bir kişi, yine de yeni cari aç.'}
                    </span>
                </label>
            )}
        </div>
    );
};

/* -------------------------------- düzenleyici -------------------------------- */

const CustomerEditor = ({ customer, existingCustomers, onClose, onSubmit, onUseExisting }) => {
    const { closing, requestClose } = useAnimatedClose(onClose, 200);
    const dialogRef = useRef(null);
    const isEdit = Boolean(customer);

    const [form, setForm] = useState(() => ({
        name: customer?.name || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        tc: customer?.tc || '',
        type: isCorporate(customer) ? 'Kurumsal' : 'Bireysel',
        address: customer?.address || '',
        notes: customer?.notes || '',
    }));
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    // Kullanıcı "farklı kişi" onayı verdiğinde telefon/ad-soyad eşleşmesi aşılabilir
    const [forceCreate, setForceCreate] = useState(false);

    /** Girilen bilgilerle çakışan mevcut cariler (kendisi hariç) */
    const duplicate = useMemo(
        () => findCustomerMatches(existingCustomers, form, { excludeKey: customerKey(customer) }),
        [existingCustomers, form, customer]
    );
    const blocking = blocksCreate(duplicate.level);
    const canOverride = isForceable(duplicate.level);

    // Bilgi değişince "farklı kişi" onayı sıfırlanır
    useEffect(() => { setForceCreate(false); }, [duplicate.level, duplicate.matches.length]);

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
        // Kimlik alanı değişince sunucudan gelen mükerrer uyarısı da geçersizleşir
        setErrors(prev => ({ ...prev, [key]: undefined, duplicate: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = 'Ad soyad / ünvan zorunludur.';

        const digits = form.phone.replace(/\D/g, '');
        if (!digits) {
            next.phone = 'Telefon zorunludur.';
        } else if (digits.length < 10) {
            next.phone = 'Telefon en az 10 hane olmalıdır.';
        }

        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            next.email = 'Geçerli bir e-posta adresi girin.';
        }

        if (form.tc.trim() && isValidTc(form.tc) !== true) {
            next.tc = 'T.C. kimlik numarası 11 haneli ve geçerli olmalıdır.';
        }

        // Mükerrer cari engeli: kesin eşleşme hiç geçilemez, olası eşleşme onay ister
        if (blocking && !(canOverride && forceCreate)) {
            next.duplicate = duplicate.level === 'exact'
                ? 'Bu TC kimlik numarası başka bir cariye ait. Mevcut kaydı kullanın veya düzenleyin.'
                : 'Eşleşen bir cari var. Mevcut kaydı kullanın ya da farklı kişi olduğunu onaylayın.';
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (busy || !validate()) return;

        setBusy(true);
        try {
            const result = await onSubmit({
                name: form.name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim(),
                tc: form.tc.replace(/\D/g, ''),
                type: form.type,
                address: form.address.trim(),
                notes: form.notes.trim(),
                force: forceCreate,
            });
            // Sunucu da mükerrer bulabilir (başka kullanıcı arada kayıt açmış olabilir)
            if (result?.duplicate) {
                setErrors({ duplicate: result.message || 'Bu bilgilerle kayıtlı bir cari zaten var.' });
                return;
            }
            if (result) requestClose();
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
                aria-labelledby="customer-editor-title"
                tabIndex={-1}
                noValidate
                onSubmit={handleSubmit}
                className={`bg-white w-full max-w-2xl rounded-[24px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[92vh] outline-none ${closing ? 'animate-out fade-out zoom-out-95 duration-200' : 'animate-scale-up'}`}
            >
                <header className="flex items-center justify-between gap-4 px-6 sm:px-7 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#0071e3] text-white flex items-center justify-center shrink-0">
                            {isEdit ? <Pencil size={18} /> : <Plus size={19} />}
                        </span>
                        <div className="min-w-0">
                            <h3 id="customer-editor-title" className="text-[17px] font-semibold text-[#1d1d1f] truncate">
                                {isEdit ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'}
                            </h3>
                            <p className="text-[12px] font-medium text-gray-500 truncate">
                                {isEdit ? customer.name : 'Servis kaydı açarken bu bilgiler otomatik dolar.'}
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

                <div className="p-6 sm:p-7 overflow-y-auto custom-scrollbar space-y-5">
                    {blocking && (
                        <DuplicateNotice
                            duplicate={duplicate}
                            canOverride={canOverride}
                            forceCreate={forceCreate}
                            onToggleForce={setForceCreate}
                            onUseExisting={onUseExisting}
                            isEdit={isEdit}
                        />
                    )}
                    {errors.duplicate && (
                        <p role="alert" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#e30000]">
                            <AlertTriangle size={12} aria-hidden="true" /> {errors.duplicate}
                        </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                            <Field
                                id="cst-name" label="Ad Soyad / Ünvan" required error={errors.name}
                                value={form.name} onChange={(v) => setField('name', v)}
                                placeholder="Örn: Ayşe Yılmaz"
                            />
                        </div>
                        <Field
                            id="cst-phone" label="Telefon" type="tel" inputMode="tel" mono required error={errors.phone}
                            value={form.phone} onChange={(v) => setField('phone', v)}
                            placeholder="0532 000 00 00"
                        />
                        <Field
                            id="cst-tc" label="TC Kimlik No" inputMode="numeric" mono error={errors.tc}
                            value={form.tc} onChange={(v) => setField('tc', v.replace(/\D/g, '').slice(0, 11))}
                            placeholder="11 haneli"
                            hint="Mükerrer cari kontrolü öncelikle bu numaradan yapılır."
                        />
                        <Field
                            id="cst-email" label="E-Posta" type="email" error={errors.email}
                            value={form.email} onChange={(v) => setField('email', v)}
                            placeholder="ad.soyad@ornek.com"
                        />
                        <SelectField
                            id="cst-type" label="Müşteri Tipi"
                            value={form.type} onChange={(v) => setField('type', v)}
                            options={[
                                { value: 'Bireysel', label: 'Bireysel Müşteri' },
                                { value: 'Kurumsal', label: 'Kurumsal Müşteri' },
                            ]}
                        />
                        <div className="sm:col-span-2">
                            <TextAreaField
                                id="cst-address" label="Adres"
                                value={form.address} onChange={(v) => setField('address', v)}
                                placeholder="Mahalle, cadde, no, ilçe / il"
                                rows={2}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <TextAreaField
                                id="cst-notes" label="Özel Notlar"
                                value={form.notes} onChange={(v) => setField('notes', v)}
                                placeholder="Müşteriyle ilgili hatırlatmalar…"
                                rows={2}
                                hint="Bu not yalnızca ekip içinde görünür, müşteriye gönderilmez."
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
                        disabled={busy || (blocking && !(canOverride && forceCreate))}
                        className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <Check size={16} aria-hidden="true" />
                        {busy ? 'Kaydediliyor…' : (isEdit ? 'Değişiklikleri Kaydet' : 'Müşteriyi Kaydet')}
                    </button>
                </footer>
            </form>
        </div>
    );
};

/* --------------------------------- ana ekran --------------------------------- */

const Customers = ({ setActiveTab, setServiceInitialData }) => {
    const {
        customers, addCustomer, updateCustomer, removeCustomer,
        repairs, sendWhatsApp, currentUser, showToast,
    } = useAppContext();

    const canManageCustomers = hasPermission(currentUser, 'manage_customers');
    const canDeleteCustomers = hasPermission(currentUser, 'delete_customers');
    const canMessage = hasPermission(currentUser, 'send_customer_message');

    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [groupBy, setGroupBy] = useState('letter'); // 'letter' | 'type'
    const [collapsedGroups, setCollapsedGroups] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const list = customers || [];

    /** Seçili müşteri her zaman güncel listeden okunur; düzenleme sonrası tazelenir */
    const selectedCustomer = useMemo(
        () => list.find(c => String(customerKey(c)) === String(selectedId)) || null,
        [list, selectedId]
    );

    const totals = useMemo(() => {
        const withHistory = new Set(
            (repairs || []).map(r => normalize(r.customerPhone || '')).filter(Boolean)
        );
        return {
            all: list.length,
            corporate: list.filter(isCorporate).length,
            individual: list.filter(c => !isCorporate(c)).length,
            active: list.filter(c => withHistory.has(normalize(c.phone || ''))).length,
        };
    }, [list, repairs]);

    const filtered = useMemo(() => {
        const q = normalize(query.trim());
        return list
            .filter(c => typeFilter === 'all' || (typeFilter === 'kurumsal' ? isCorporate(c) : !isCorporate(c)))
            .filter(c => !q || [c.name, c.phone, c.email, c.id, c.address]
                .some(v => normalize(v).includes(q)))
            .slice()
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr'));
    }, [list, query, typeFilter]);

    /** Harfe ya da tipe göre gruplar */
    const groups = useMemo(() => {
        const map = new Map();
        filtered.forEach(customer => {
            const key = groupBy === 'letter'
                ? (String(customer.name || '#').charAt(0).toLocaleUpperCase('tr') || '#')
                : (isCorporate(customer) ? 'Kurumsal' : 'Bireysel');
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(customer);
        });
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'tr'));
    }, [filtered, groupBy]);

    // Gruplama biçimi değişince kapatılmış grupları sıfırla (hepsi açık başlar)
    useEffect(() => { setCollapsedGroups([]); }, [groupBy]);

    const allCollapsed = groups.length > 0 && groups.every(([key]) => collapsedGroups.includes(key));

    const toggleGroup = (key) => {
        setCollapsedGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    /** Seçili müşterinin servis geçmişi, tarihe göre yeniden eskiye */
    const history = useMemo(() => {
        if (!selectedCustomer) return [];
        const name = normalize(selectedCustomer.name);
        const phone = String(selectedCustomer.phone || '').replace(/\D/g, '');
        return (repairs || [])
            .filter(r => {
                if (phone && String(r.customerPhone || '').replace(/\D/g, '') === phone) return true;
                return Boolean(name) && normalize(r.customer) === name;
            })
            .slice()
            .sort((a, b) => {
                const da = parseRepairDate(a.date);
                const db = parseRepairDate(b.date);
                if (!da && !db) return 0;
                if (!da) return 1;
                if (!db) return -1;
                return db - da;
            });
    }, [selectedCustomer, repairs]);

    const historyStats = useMemo(() => ({
        total: history.length,
        open: history.filter(r => !isClosed(r)).length,
        closed: history.filter(isClosed).length,
        last: history[0]?.date || null,
    }), [history]);

    const openEditor = (customer = null) => {
        setEditing(customer);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setEditing(null);
    };

    const handleSubmit = async (data) => {
        if (editing) {
            const ok = await updateCustomer(customerKey(editing), data);
            if (ok) showToast('Müşteri bilgileri güncellendi.', 'success');
            return ok;
        }
        const result = await addCustomer(data);
        if (result?.success) {
            showToast(`${data.name} rehbere eklendi.`, 'success');
            setSelectedId(customerKey(result.customer));
            return true;
        }
        // Mükerrer kaydı düzenleyici gösterir; burada kapatılmaz
        if (result?.duplicate) return result;
        return false;
    };

    /** Mükerrer uyarısındaki kayda geçiş: yeni cari yerine mevcut olan düzenlenir */
    const handleUseExisting = (existing) => {
        setSelectedId(customerKey(existing));
        setEditing(existing);
        showToast(`${existing.name} kaydı açıldı. Bilgileri buradan güncelleyebilirsiniz.`, 'info');
    };

    const handleDelete = async (customer) => {
        const confirmed = await appConfirm(
            `${customer.name} müşterisi veritabanından kalıcı olarak silinecek. Servis kayıtları silinmez ancak müşteri kartıyla bağı kopar. Onaylıyor musunuz?`
        );
        if (!confirmed) return;

        const ok = await removeCustomer(customerKey(customer));
        if (ok) {
            if (String(customerKey(customer)) === String(selectedId)) setSelectedId(null);
            showToast(`${customer.name} rehberden silindi.`, 'success');
        } else {
            showToast('Müşteri silinemedi. Yetkinizi kontrol edin.', 'error');
        }
    };

    const toggleTag = async (tag) => {
        if (!selectedCustomer) return;
        const current = selectedCustomer.tags || [];
        const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
        const ok = await updateCustomer(customerKey(selectedCustomer), { tags: next });
        if (ok) showToast(current.includes(tag) ? `"${tag}" etiketi kaldırıldı.` : `"${tag}" etiketi eklendi.`, 'success');
    };

    const handleNewRepair = () => {
        if (!selectedCustomer) return;
        setServiceInitialData({
            // Servis ekranı bu cariye bağlanır; oradan ikinci bir cari açılmaz
            customerId: customerKey(selectedCustomer),
            customerName: selectedCustomer.name,
            customerPhone: selectedCustomer.phone,
            customerEmail: selectedCustomer.email,
            customerAddress: selectedCustomer.address,
            customerTC: selectedCustomer.tc || '',
        });
        setActiveTab('service');
    };

    const copy = async (value, label) => {
        try {
            await navigator.clipboard.writeText(String(value));
            showToast(`${label} kopyalandı.`, 'success');
        } catch {
            showToast(`Kopyalanamadı: ${value}`, 'warning');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Başlık + özet */}
            <header className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3]">Müşteri Yönetimi</p>
                        <h3 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">Müşteri Rehberi</h3>
                        <p className="text-[13px] font-medium text-gray-500 mt-1">
                            Müşteri künyelerini ve servis geçmişlerini tek ekrandan yönetin.
                        </p>
                    </div>

                    {canManageCustomers && (
                        <button
                            type="button"
                            onClick={() => openEditor()}
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            <Plus size={16} aria-hidden="true" /> Yeni Müşteri
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatTile icon={Users} label="Toplam Müşteri" value={totals.all} unit="kayıt" />
                    <StatTile icon={User} label="Bireysel" value={totals.individual} unit="kayıt" />
                    <StatTile icon={Building2} label="Kurumsal" value={totals.corporate} unit="kayıt" tone="bg-[#0071e3]/5 border-[#0071e3]/15" />
                    <StatTile icon={Wrench} label="Servis Geçmişi Olan" value={totals.active} unit="kayıt" tone="bg-[#008000]/6 border-[#008000]/18" />
                </div>
            </header>

            {/* Araç çubuğu */}
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <label htmlFor="cst-search" className="sr-only">Müşteri ara</label>
                    <Search size={15} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        id="cst-search"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ad, telefon, e-posta veya adres ara…"
                        className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div role="group" aria-label="Müşteri tipine göre filtrele" className="flex bg-[#f5f5f7] p-1 rounded-xl border border-gray-200/60">
                        {TYPE_FILTERS.map(filter => (
                            <SegmentButton
                                key={filter.id}
                                active={typeFilter === filter.id}
                                onClick={() => setTypeFilter(filter.id)}
                                count={filter.id === 'all' ? totals.all : (filter.id === 'kurumsal' ? totals.corporate : totals.individual)}
                            >
                                {filter.label}
                            </SegmentButton>
                        ))}
                    </div>

                    <div role="group" aria-label="Gruplama biçimi" className="flex bg-[#f5f5f7] p-1 rounded-xl border border-gray-200/60">
                        <SegmentButton active={groupBy === 'letter'} onClick={() => setGroupBy('letter')}>Harfe Göre</SegmentButton>
                        <SegmentButton active={groupBy === 'type'} onClick={() => setGroupBy('type')}>Tipe Göre</SegmentButton>
                    </div>

                    {groups.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setCollapsedGroups(allCollapsed ? [] : groups.map(([key]) => key))}
                            className="h-11 px-4 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-gray-600 hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            {allCollapsed ? 'Tümünü Aç' : 'Tümünü Kapat'}
                        </button>
                    )}
                </div>
            </div>

            {/* Liste + künye */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <section
                    aria-label="Müşteri listesi"
                    className={selectedCustomer ? 'xl:col-span-5' : 'xl:col-span-12'}
                >
                    {groups.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title={list.length === 0 ? 'Rehber henüz boş' : 'Eşleşen müşteri yok'}
                            description={list.length === 0
                                ? 'İlk müşteri kaydını oluşturarak başlayın.'
                                : 'Arama ya da filtreleri değiştirerek tekrar deneyin.'}
                        />
                    ) : (
                        <div className={`space-y-3 ${selectedCustomer ? 'xl:max-h-[calc(100vh-320px)] xl:overflow-y-auto xl:pr-2 custom-scrollbar' : ''}`}>
                            {groups.map(([key, groupCustomers]) => {
                                const collapsed = collapsedGroups.includes(key);
                                const panelId = `customer-group-${normalize(key).replace(/[^a-z0-9]+/g, '-') || 'grup'}`;

                                return (
                                    <div key={key} className="rounded-[20px] border border-gray-200 bg-white overflow-hidden">
                                        <h4 className="m-0">
                                            <button
                                                type="button"
                                                onClick={() => toggleGroup(key)}
                                                aria-expanded={!collapsed}
                                                aria-controls={panelId}
                                                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[#f5f5f7]/70 hover:bg-[#f5f5f7] transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                            >
                                                <span className="flex items-center gap-3 min-w-0">
                                                    <span aria-hidden="true" className="w-8 h-8 rounded-lg bg-[#1d1d1f] text-white flex items-center justify-center text-[12px] font-semibold shrink-0">
                                                        {key}
                                                    </span>
                                                    <span className="text-[12px] font-semibold text-[#1d1d1f] truncate">
                                                        {groupBy === 'letter' ? `${key} ile başlayanlar` : `${key} müşteriler`}
                                                    </span>
                                                </span>
                                                <span className="flex items-center gap-2.5 shrink-0">
                                                    <span className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1">
                                                        {groupCustomers.length} kişi
                                                    </span>
                                                    <ChevronDown
                                                        size={15}
                                                        aria-hidden="true"
                                                        className={`text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                                                    />
                                                </span>
                                            </button>
                                        </h4>

                                        <Collapse open={!collapsed}>
                                            {() => (
                                                <ul id={panelId} className="list-none p-3 m-0 space-y-2">
                                                    {groupCustomers.map(customer => (
                                                        <CustomerRow
                                                            key={customerKey(customer)}
                                                            customer={customer}
                                                            selected={String(customerKey(customer)) === String(selectedId)}
                                                            canDelete={canDeleteCustomers}
                                                            onSelect={(c) => setSelectedId(customerKey(c))}
                                                            onDelete={handleDelete}
                                                        />
                                                    ))}
                                                </ul>
                                            )}
                                        </Collapse>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {selectedCustomer && (
                    <section aria-label="Müşteri künyesi" className="xl:col-span-7 space-y-5">
                        {/* Künye başlığı */}
                        <div className="rounded-[24px] border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 min-w-0">
                                    <span aria-hidden="true" className="w-14 h-14 rounded-2xl bg-[#1d1d1f] text-white flex items-center justify-center text-[17px] font-semibold shrink-0">
                                        {initialsOf(selectedCustomer.name)}
                                    </span>
                                    <div className="min-w-0">
                                        <h4 className="text-[18px] font-semibold text-[#1d1d1f] truncate">{selectedCustomer.name}</h4>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-[#f5f5f7] border border-gray-200 rounded-full px-2.5 py-1">
                                                {isCorporate(selectedCustomer) ? 'Kurumsal' : 'Bireysel'}
                                            </span>
                                            {(selectedCustomer.tags || []).map(tag => (
                                                <span key={tag} className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3] bg-[#0071e3]/8 border border-[#0071e3]/20 rounded-full px-2.5 py-1">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedId(null)}
                                    className="xl:hidden h-9 w-9 shrink-0 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-[#1d1d1f] flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                >
                                    <X size={16} aria-hidden="true" />
                                    <span className="sr-only">Künyeyi kapat</span>
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2.5 mt-5 pt-5 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={handleNewRepair}
                                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#0071e3] text-white text-[12px] font-semibold hover:bg-[#0077ed] transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                >
                                    <Plus size={15} aria-hidden="true" /> Yeni Servis Kaydı
                                </button>
                                {canMessage && selectedCustomer.phone && (
                                    <button
                                        type="button"
                                        onClick={() => sendWhatsApp(
                                            selectedCustomer.phone,
                                            `Merhaba ${selectedCustomer.name}, Troy Teknik Servis'ten yazıyoruz.`
                                        )}
                                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-[#1d7a4c] hover:bg-[#008000]/5 hover:border-[#008000]/25 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#008000]/25"
                                    >
                                        <MessageCircle size={15} aria-hidden="true" /> WhatsApp
                                    </button>
                                )}
                                {canManageCustomers && (
                                    <button
                                        type="button"
                                        onClick={() => openEditor(selectedCustomer)}
                                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-[#1d1d1f] hover:bg-[#f5f5f7] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                    >
                                        <Pencil size={15} aria-hidden="true" /> Düzenle
                                    </button>
                                )}
                                {canDeleteCustomers && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(selectedCustomer)}
                                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[12px] font-semibold text-[#c30000] hover:bg-[#e30000]/5 hover:border-[#e30000]/25 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#e30000]/25"
                                    >
                                        <Trash2 size={15} aria-hidden="true" /> Sil
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Servis özeti */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatTile icon={Clock} label="Toplam Servis" value={historyStats.total} unit="kayıt" />
                            <StatTile icon={Wrench} label="Açık Kayıt" value={historyStats.open} unit="adet" tone={historyStats.open ? 'bg-[#ff9500]/8 border-[#ff9500]/20' : 'bg-white border-gray-200'} />
                            <StatTile icon={CheckCircle} label="Kapanan" value={historyStats.closed} unit="adet" tone="bg-[#008000]/6 border-[#008000]/18" />
                            <StatTile icon={Tag} label="Son Servis" value={historyStats.last ? formatDay(historyStats.last) : '—'} />
                        </div>

                        {/* İletişim + adres */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6">
                                <h5 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">İletişim</h5>
                                <div className="divide-y divide-gray-100">
                                    <ContactLine
                                        icon={MyPhoneIcon} label="Telefon" value={selectedCustomer.phone} mono
                                        onCopy={() => copy(selectedCustomer.phone, 'Telefon')}
                                    />
                                    <ContactLine
                                        icon={Mail} label="E-Posta" value={selectedCustomer.email}
                                        onCopy={() => copy(selectedCustomer.email, 'E-posta')}
                                    />
                                    <ContactLine
                                        icon={Tag} label="Müşteri No" value={selectedCustomer.id} mono
                                        onCopy={() => copy(selectedCustomer.id, 'Müşteri no')}
                                    />
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6 space-y-5">
                                <div>
                                    <h5 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                                        <MapPin size={12} aria-hidden="true" /> Adres
                                    </h5>
                                    <p className="text-[13px] font-medium text-gray-600 leading-relaxed">
                                        {selectedCustomer.address || <span className="text-gray-400">Adres girilmemiş.</span>}
                                    </p>
                                </div>
                                <div className="pt-4 border-t border-gray-100">
                                    <h5 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                                        <FileText size={12} aria-hidden="true" /> Özel Not
                                    </h5>
                                    <p className="text-[13px] font-medium text-gray-600 leading-relaxed">
                                        {selectedCustomer.notes || <span className="text-gray-400">Not eklenmemiş.</span>}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Segmentasyon */}
                        <div className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6">
                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Segmentasyon</h5>
                            <div role="group" aria-label="Müşteri etiketleri" className="flex flex-wrap gap-2">
                                {CUSTOMER_TAGS.map(tag => {
                                    const active = (selectedCustomer.tags || []).includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            disabled={!canManageCustomers}
                                            aria-pressed={active}
                                            className={`h-9 px-4 rounded-full border text-[12px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active
                                                ? 'bg-[#0071e3] text-white border-[#0071e3]'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-[#0071e3]/30'}`}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                            {!canManageCustomers && (
                                <p className="text-[11px] font-medium text-gray-500 mt-3">
                                    Etiket değiştirmek için müşteri yönetimi yetkisi gerekir.
                                </p>
                            )}
                        </div>

                        {/* Servis geçmişi */}
                        <div className="rounded-[24px] border border-gray-200 bg-white overflow-hidden">
                            <header className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-100">
                                <h5 className="flex items-center gap-2 text-[13px] font-semibold text-[#1d1d1f]">
                                    <Clock size={14} aria-hidden="true" className="text-gray-500" /> Servis Geçmişi
                                </h5>
                                <span className="text-[10px] font-bold text-gray-600 bg-[#f5f5f7] border border-gray-200 rounded-full px-2.5 py-1">
                                    {history.length} kayıt
                                </span>
                            </header>

                            {history.length === 0 ? (
                                <p className="px-6 py-12 text-center text-[13px] font-medium text-gray-400">
                                    Bu müşteri için henüz servis kaydı oluşturulmamış.
                                </p>
                            ) : (
                                <ul className="list-none p-0 m-0 divide-y divide-gray-100 max-h-96 overflow-y-auto custom-scrollbar">
                                    {history.map(repair => (
                                        <li key={repair.id} className="flex items-center gap-4 px-5 sm:px-6 py-3.5">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">
                                                    {repair.device || 'Cihaz belirtilmemiş'}
                                                </p>
                                                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-gray-500 mt-0.5">
                                                    <span className="font-mono">#{repair.id}</span>
                                                    <span>{formatDay(repair.date)}</span>
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0 ${isClosed(repair)
                                                ? 'text-[#1d7a4c] bg-[#008000]/8 border-[#008000]/20'
                                                : 'text-[#0071e3] bg-[#0071e3]/8 border-[#0071e3]/20'}`}
                                            >
                                                {repair.status || 'Durum yok'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </section>
                )}
            </div>

            {editorOpen && (
                <CustomerEditor
                    // Mevcut kayda geçildiğinde form o kaydın bilgileriyle yeniden kurulur
                    key={customerKey(editing) || 'new'}
                    customer={editing}
                    existingCustomers={list}
                    onClose={closeEditor}
                    onSubmit={handleSubmit}
                    onUseExisting={handleUseExisting}
                />
            )}
        </div>
    );
};

export default Customers;
