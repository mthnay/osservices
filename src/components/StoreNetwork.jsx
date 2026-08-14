import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Building, MapPin, Plus, Search, Trash2, X, Check, Store, Users, Wrench,
    Package, Copy, Pencil, Phone, Mail, Globe, AlertTriangle,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { appConfirm } from '../utils/alert';
import { hasPermission } from '../utils/permissions';
import { PROVINCES, districtsOf } from '../utils/turkeyRegions';
import Collapse from './ui/Collapse';
import useAnimatedClose from './ui/useAnimatedClose';
import PickerModal from './ui/PickerModal';
import { StatTile, Field, TextAreaField, SelectField, PickerField, SegmentButton, EmptyState } from './ui/FormControls';

/* ------------------------------------------------------------------
   Mağaza & Lokasyon Ağı
   Servis noktalarının kimlik, iletişim ve kapsama bilgisini yönetir.
   Stok alanları (KGB/KBB/ödünç) Ambar & Lojistik ekranındadır; burada
   yalnızca lokasyonun kendisi ve ona bağlı yükün özeti gösterilir.
------------------------------------------------------------------ */

const TR_FOLD = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
const normalize = (value) => String(value ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (ch) => TR_FOLD[ch] || ch);

/** Şehir başlıklarını geçerli bir HTML id'sine çevirir (boşluk kalmaz) */
const slug = (value) => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'grup';

const NO_CITY = 'Konum Belirtilmemiş';
const TYPE_FILTERS = [
    { id: 'all', label: 'Tümü' },
    { id: 'Merkez', label: 'Merkez' },
    { id: 'Şube', label: 'Şube' },
];

const emptyForm = {
    name: '', shipTo: '', type: 'Şube', city: '', district: '',
    address: '', phone: '', email: '',
};

/* ------------------------------ lokasyon kartı ------------------------------ */

const StoreCard = ({ point, metrics, canManage, onEdit, onRemove, onCopyShipTo, removing }) => {
    const isMerkez = point.type === 'Merkez';
    const location = [point.district, point.city].filter(Boolean).join(', ');

    return (
        <li className="rounded-[24px] border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                        <span
                            aria-hidden="true"
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isMerkez
                                ? 'bg-[#1d1d1f] text-white'
                                : 'bg-[#f5f5f7] text-[#1d1d1f] border border-gray-200'}`}
                        >
                            {isMerkez ? <Building size={19} /> : <MapPin size={19} />}
                        </span>
                        <div className="min-w-0">
                            <h4 className="text-[15px] font-semibold text-[#1d1d1f] truncate">{point.name}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <button
                                    type="button"
                                    onClick={() => onCopyShipTo(point)}
                                    title="Ship-To numarasını kopyala"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#0071e3] bg-[#0071e3]/8 border border-[#0071e3]/20 rounded-full px-2.5 py-1 hover:bg-[#0071e3]/12 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                >
                                    <Copy size={10} aria-hidden="true" />
                                    Ship-To {point.shipTo || '—'}
                                </button>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-[#f5f5f7] border border-gray-200 rounded-full px-2.5 py-1">
                                    {point.type || 'Şube'}
                                </span>
                                {location && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 rounded-full px-2.5 py-1">
                                        <Globe size={10} aria-hidden="true" /> {location}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {canManage && (
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => onEdit(point)}
                                className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#0071e3] hover:border-[#0071e3]/30 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                            >
                                <Pencil size={15} aria-hidden="true" />
                                <span className="sr-only">{point.name} lokasyonunu düzenle</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => onRemove(point)}
                                disabled={removing}
                                className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#e30000] hover:border-[#e30000]/30 disabled:opacity-40 flex items-center justify-center transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#e30000]/25"
                            >
                                <Trash2 size={15} aria-hidden="true" />
                                <span className="sr-only">{point.name} lokasyonunu kaldır</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Bağlı yük özeti */}
                <div className="grid grid-cols-3 gap-2.5 mt-5">
                    <div className="rounded-[16px] border border-gray-200 bg-[#f5f5f7]/60 p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Users size={11} aria-hidden="true" className="text-gray-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Personel</span>
                        </div>
                        <p className="text-[17px] font-semibold text-[#1d1d1f] leading-none tabular-nums">{metrics.staff}</p>
                    </div>
                    <div className="rounded-[16px] border border-gray-200 bg-[#f5f5f7]/60 p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Wrench size={11} aria-hidden="true" className="text-gray-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Servis</span>
                        </div>
                        <p className="text-[17px] font-semibold text-[#1d1d1f] leading-none tabular-nums">{metrics.repairs}</p>
                    </div>
                    <div className="rounded-[16px] border border-gray-200 bg-[#f5f5f7]/60 p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Package size={11} aria-hidden="true" className="text-gray-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Stok</span>
                        </div>
                        <p className="text-[17px] font-semibold text-[#1d1d1f] leading-none tabular-nums">{metrics.stock}</p>
                    </div>
                </div>

                {/* İletişim */}
                <dl className="mt-5 pt-5 border-t border-gray-100 space-y-2">
                    <div className="flex items-start gap-2">
                        <dt className="sr-only">Adres</dt>
                        <MapPin size={13} aria-hidden="true" className="text-gray-400 mt-0.5 shrink-0" />
                        <dd className="text-[12px] font-medium text-gray-600 leading-relaxed">
                            {point.address || <span className="text-gray-400">Adres girilmemiş.</span>}
                        </dd>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <dt className="sr-only">Telefon</dt>
                            <Phone size={13} aria-hidden="true" className="text-gray-400 shrink-0" />
                            <dd className="text-[12px] font-medium text-gray-600 truncate">
                                {point.phone || <span className="text-gray-400">—</span>}
                            </dd>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <dt className="sr-only">E-posta</dt>
                            <Mail size={13} aria-hidden="true" className="text-gray-400 shrink-0" />
                            <dd className="text-[12px] font-medium text-gray-600 truncate">
                                {point.email || <span className="text-gray-400">—</span>}
                            </dd>
                        </div>
                    </div>
                </dl>
            </div>
        </li>
    );
};

/* ------------------------------ düzenleyici ------------------------------ */

const StoreEditor = ({ point, existingPoints, onClose, onSubmit }) => {
    const { closing, requestClose } = useAnimatedClose(onClose, 200);
    const dialogRef = useRef(null);
    const isEdit = Boolean(point);

    const [form, setForm] = useState(() => ({
        ...emptyForm,
        ...(point || {}),
        type: point?.type || 'Şube',
    }));
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [picker, setPicker] = useState(null); // 'city' | 'district'

    useEffect(() => { dialogRef.current?.focus(); }, []);

    const closeRef = useRef(requestClose);
    closeRef.current = requestClose;
    useEffect(() => {
        const onKeyDown = (e) => { if (e.key === 'Escape' && !picker) closeRef.current(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [picker]);

    const setField = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!String(form.name).trim()) next.name = 'Lokasyon adı zorunludur.';
        if (!String(form.shipTo).trim()) {
            next.shipTo = 'Ship-To numarası zorunludur.';
        } else if (existingPoints.some(p =>
            String(p.id) !== String(point?.id) &&
            normalize(p.shipTo).trim() === normalize(form.shipTo).trim()
        )) {
            next.shipTo = 'Bu Ship-To numarası başka bir lokasyonda kullanılıyor.';
        }
        if (!String(form.address).trim()) next.address = 'Adres zorunludur.';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email).trim())) {
            next.email = 'Geçerli bir e-posta adresi girin.';
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (busy || !validate()) return;

        setBusy(true);
        try {
            const ok = await onSubmit({
                name: String(form.name).trim(),
                shipTo: String(form.shipTo).trim(),
                type: form.type,
                city: String(form.city || '').trim(),
                district: String(form.district || '').trim(),
                address: String(form.address).trim(),
                phone: String(form.phone || '').trim(),
                email: String(form.email || '').trim(),
            });
            if (ok) requestClose();
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div
                className={`fixed inset-0 z-[120] bg-[#1d1d1f]/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 ${closing ? 'animate-out fade-out duration-200 pointer-events-none' : 'animate-in fade-in'}`}
                onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
            >
                <form
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="store-editor-title"
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
                                <h3 id="store-editor-title" className="text-[17px] font-semibold text-[#1d1d1f] truncate">
                                    {isEdit ? 'Lokasyonu Düzenle' : 'Yeni Lokasyon'}
                                </h3>
                                <p className="text-[12px] font-medium text-gray-500 truncate">
                                    {isEdit ? point.name : 'Ship-To numarası Apple sevkiyatlarında kullanılır.'}
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
                                id="sp-name" label="Lokasyon Adı" required error={errors.name}
                                value={form.name} onChange={(v) => setField('name', v)}
                                placeholder="Örn: Troy Servis Kanyon"
                            />
                            <Field
                                id="sp-shipto" label="Ship-To No" required error={errors.shipTo} mono
                                value={form.shipTo} onChange={(v) => setField('shipTo', v)}
                                placeholder="Örn: 0000512345"
                            />
                            <SelectField
                                id="sp-type" label="Lokasyon Tipi"
                                value={form.type} onChange={(v) => setField('type', v)}
                                options={[
                                    { value: 'Merkez', label: 'Merkez Servis' },
                                    { value: 'Şube', label: 'Şube' },
                                ]}
                            />
                            <Field
                                id="sp-phone" label="Telefon" type="tel" inputMode="tel"
                                value={form.phone} onChange={(v) => setField('phone', v)}
                                placeholder="0216 000 00 00"
                            />
                            <PickerField
                                id="sp-city" label="İl" value={form.city}
                                placeholder="İl seçiniz…" onOpen={() => setPicker('city')}
                            />
                            <PickerField
                                id="sp-district" label="İlçe" value={form.district}
                                placeholder={form.city ? 'İlçe seçiniz…' : 'Önce il seçiniz'}
                                disabled={!form.city} onOpen={() => setPicker('district')}
                            />
                            <div className="sm:col-span-2">
                                <Field
                                    id="sp-email" label="E-Posta" type="email" error={errors.email}
                                    value={form.email} onChange={(v) => setField('email', v)}
                                    placeholder="magaza@firma.com"
                                    hint="Müşteri bildirimlerinde bu lokasyonun iletişim adresi olarak görünür."
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <TextAreaField
                                    id="sp-address" label="Açık Adres" required error={errors.address}
                                    value={form.address} onChange={(v) => setField('address', v)}
                                    placeholder="Mahalle, cadde, no, AVM adı…"
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
                            {busy ? 'Kaydediliyor…' : (isEdit ? 'Değişiklikleri Kaydet' : 'Lokasyonu Oluştur')}
                        </button>
                    </footer>
                </form>
            </div>

            {picker === 'city' && (
                <PickerModal
                    title="İl Seçimi"
                    description="Lokasyonun bulunduğu il."
                    options={PROVINCES}
                    value={form.city}
                    onSelect={(city) => {
                        // İl değişince ilçe geçersiz kalır; pencereyi PickerModal kendi kapatır
                        setForm(prev => ({ ...prev, city, district: prev.city === city ? prev.district : '' }));
                        setErrors(prev => ({ ...prev, city: undefined }));
                    }}
                    onClose={() => setPicker(null)}
                    placeholder="İl ara…"
                />
            )}
            {picker === 'district' && (
                <PickerModal
                    title="İlçe Seçimi"
                    description={`${form.city} ilçeleri.`}
                    options={districtsOf(form.city)}
                    value={form.district}
                    onSelect={(district) => setField('district', district)}
                    onClose={() => setPicker(null)}
                    placeholder="İlçe ara…"
                />
            )}
        </>
    );
};

/* -------------------------------- ana ekran -------------------------------- */

const StoreNetwork = () => {
    const {
        allServicePoints, servicePoints, users, allRepairs, allInventory,
        addServicePoint, updateServicePoint, removeServicePoint,
        currentUser, showToast,
    } = useAppContext();

    const points = allServicePoints?.length ? allServicePoints : (servicePoints || []);
    const canManage = hasPermission(currentUser, 'manage_warehouses');

    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [removingId, setRemovingId] = useState(null);

    /** Lokasyon başına personel / servis / stok yükü */
    const metricsById = useMemo(() => {
        const map = new Map();
        (points || []).forEach(point => {
            const key = String(point.id);
            const staff = (users || []).filter(u => {
                const list = (u.storeIds && u.storeIds.length) ? u.storeIds : [u.storeId];
                return list.map(String).includes(key);
            }).length;
            map.set(key, {
                staff,
                repairs: (allRepairs || []).filter(r => String(r.storeId) === key).length,
                stock: (allInventory || []).filter(i => String(i.storeId) === key).length,
            });
        });
        return map;
    }, [points, users, allRepairs, allInventory]);

    const totals = useMemo(() => ({
        all: points.length,
        merkez: points.filter(p => p.type === 'Merkez').length,
        sube: points.filter(p => p.type !== 'Merkez').length,
        cities: new Set(points.map(p => String(p.city || '').trim()).filter(Boolean)).size,
    }), [points]);

    const visiblePoints = useMemo(() => {
        const q = normalize(query.trim());
        return points
            .filter(p => typeFilter === 'all' || (typeFilter === 'Merkez' ? p.type === 'Merkez' : p.type !== 'Merkez'))
            .filter(p => !q || [p.name, p.shipTo, p.address, p.city, p.district, p.phone]
                .some(v => normalize(v).includes(q)))
            .slice()
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'tr'));
    }, [points, query, typeFilter]);

    /** Şehir kırılımı: ağın coğrafi dağılımını okunur kılar */
    const groups = useMemo(() => {
        const map = new Map();
        visiblePoints.forEach(point => {
            const city = String(point.city || '').trim() || NO_CITY;
            if (!map.has(city)) map.set(city, []);
            map.get(city).push(point);
        });
        return [...map.entries()].sort(([a], [b]) => {
            if (a === NO_CITY) return 1;
            if (b === NO_CITY) return -1;
            return a.localeCompare(b, 'tr');
        });
    }, [visiblePoints]);

    const openEditor = (point = null) => {
        setEditing(point);
        setEditorOpen(true);
    };

    const closeEditor = () => {
        setEditorOpen(false);
        setEditing(null);
    };

    const handleSubmit = async (data) => {
        if (editing) {
            const ok = await updateServicePoint(editing.id, data);
            if (ok) showToast(`"${data.name}" lokasyonu güncellendi.`, 'success');
            return ok;
        }
        const result = await addServicePoint(data);
        if (result?.success) {
            showToast(`"${data.name}" lokasyonu ağa eklendi.`, 'success');
            return true;
        }
        showToast(result?.message || 'Lokasyon oluşturulamadı.', 'error');
        return false;
    };

    const handleRemove = async (point) => {
        const stats = metricsById.get(String(point.id)) || { staff: 0, repairs: 0, stock: 0 };
        const warnings = [];
        if (stats.staff) warnings.push(`${stats.staff} personel`);
        if (stats.repairs) warnings.push(`${stats.repairs} servis kaydı`);
        if (stats.stock) warnings.push(`${stats.stock} stok kalemi`);

        const message = warnings.length
            ? `"${point.name}" lokasyonuna bağlı kayıtlar var: ${warnings.join(', ')}. Lokasyon kaldırılırsa bu kayıtlar sahipsiz kalır. Yine de kaldırılsın mı?`
            : `"${point.name}" lokasyonu ağdan kaldırılacak. Bu işlem geri alınamaz. Onaylıyor musunuz?`;

        if (!await appConfirm(message)) return;

        setRemovingId(point.id);
        try {
            const ok = await removeServicePoint(point.id);
            if (ok) showToast(`"${point.name}" lokasyonu kaldırıldı.`, 'success');
        } finally {
            setRemovingId(null);
        }
    };

    const handleCopyShipTo = async (point) => {
        const value = String(point.shipTo || '').trim();
        if (!value) {
            showToast('Bu lokasyonda Ship-To numarası tanımlı değil.', 'warning');
            return;
        }
        try {
            await navigator.clipboard.writeText(value);
            showToast(`Ship-To ${value} kopyalandı.`, 'success');
        } catch {
            showToast('Kopyalanamadı. Numarayı elle alabilirsiniz: ' + value, 'warning');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Başlık + ağ özeti */}
            <header className="space-y-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#0071e3]">Ağ Yönetimi</p>
                        <h3 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">Mağaza & Lokasyon Ağı</h3>
                        <p className="text-[13px] font-medium text-gray-500 mt-1">
                            Servis noktalarının kimlik, iletişim ve kapsama bilgilerini yönetin.
                        </p>
                    </div>

                    {canManage && (
                        <button
                            type="button"
                            onClick={() => openEditor()}
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] transition-all shadow-sm shadow-[#0071e3]/20 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            <Plus size={16} aria-hidden="true" /> Yeni Lokasyon
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatTile icon={Store} label="Toplam Lokasyon" value={totals.all} unit="nokta" />
                    <StatTile icon={Building} label="Merkez Servis" value={totals.merkez} unit="nokta" tone="bg-[#0071e3]/5 border-[#0071e3]/15" />
                    <StatTile icon={MapPin} label="Şube" value={totals.sube} unit="nokta" />
                    <StatTile icon={Globe} label="Şehir" value={totals.cities} unit="il" tone="bg-[#008000]/6 border-[#008000]/18" />
                </div>
            </header>

            {/* Araç çubuğu */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <label htmlFor="sp-search" className="sr-only">Lokasyon ara</label>
                    <Search size={15} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        id="sp-search"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ad, Ship-To, il veya adres ara…"
                        className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                    />
                </div>

                <div role="group" aria-label="Lokasyon tipine göre filtrele" className="flex bg-[#f5f5f7] p-1 rounded-xl border border-gray-200/60 self-start">
                    {TYPE_FILTERS.map(filter => (
                        <SegmentButton
                            key={filter.id}
                            active={typeFilter === filter.id}
                            onClick={() => setTypeFilter(filter.id)}
                            count={filter.id === 'all' ? totals.all : (filter.id === 'Merkez' ? totals.merkez : totals.sube)}
                        >
                            {filter.label}
                        </SegmentButton>
                    ))}
                </div>
            </div>

            {/* Yetki uyarısı */}
            <Collapse open={!canManage}>
                <div className="rounded-[18px] border border-[#ff9500]/25 bg-[#ff9500]/8 px-5 py-4 flex items-start gap-3">
                    <AlertTriangle size={15} aria-hidden="true" className="text-[#bf5b04] mt-0.5 shrink-0" />
                    <p className="text-[12px] font-medium text-[#8a4503] leading-relaxed">
                        Lokasyonları yalnızca görüntüleyebilirsiniz. Ekleme, düzenleme ve kaldırma için
                        <strong className="font-semibold"> ambar yönetimi </strong> yetkisi gerekir.
                    </p>
                </div>
            </Collapse>

            {/* Ağ listesi */}
            {visiblePoints.length === 0 ? (
                <EmptyState
                    icon={Store}
                    title={query || typeFilter !== 'all' ? 'Eşleşen lokasyon yok' : 'Henüz lokasyon tanımlanmamış'}
                    description={query || typeFilter !== 'all'
                        ? 'Farklı bir arama ya da filtre deneyin.'
                        : 'Servis ağınızı kurmak için ilk lokasyonu ekleyin.'}
                />
            ) : (
                <div className="space-y-8">
                    {groups.map(([city, cityPoints]) => (
                        <section key={city} aria-labelledby={`city-${slug(city)}`}>
                            <div className="flex items-center gap-3 mb-4">
                                <h4 id={`city-${slug(city)}`} className="text-[12px] font-bold uppercase tracking-widest text-gray-500">
                                    {city}
                                </h4>
                                <span className="text-[10px] font-bold text-gray-500 bg-[#f5f5f7] border border-gray-200 rounded-full px-2.5 py-0.5">
                                    {cityPoints.length}
                                </span>
                                <span aria-hidden="true" className="flex-1 h-px bg-gray-200" />
                            </div>

                            <ul className="grid grid-cols-1 xl:grid-cols-2 gap-5 list-none p-0 m-0">
                                {cityPoints.map(point => (
                                    <StoreCard
                                        key={point.id}
                                        point={point}
                                        metrics={metricsById.get(String(point.id)) || { staff: 0, repairs: 0, stock: 0 }}
                                        canManage={canManage}
                                        removing={removingId === point.id}
                                        onEdit={openEditor}
                                        onRemove={handleRemove}
                                        onCopyShipTo={handleCopyShipTo}
                                    />
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            )}

            {editorOpen && (
                <StoreEditor
                    point={editing}
                    existingPoints={points}
                    onClose={closeEditor}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
};

export default StoreNetwork;
