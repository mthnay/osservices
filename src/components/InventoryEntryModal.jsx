import React, { useState, useEffect, useId, useRef, useMemo } from 'react';
import { X, Plus, Package, Recycle, Box, Store, AlertCircle, CheckCircle, Smartphone, Layers } from 'lucide-react';
import { WAREHOUSE_WHOLE_UNIT } from '../utils/warehouse';

const CATEGORIES = ['iPhone', 'iPad', 'Mac', 'Watch', 'Aksesuar', 'Diğer'];

// Giriş türüne göre başlık, alan etiketleri ve kaydedilecek alanlar
const MODES = {
    KGB: {
        crumb: 'KGB · Yeni Parça',
        title: 'Yeni Parça Kaydı',
        icon: Box,
        accent: 'bg-[#0071e3]',
        serialLabel: 'KGB Seri Numaraları',
        serialHint: 'Takılacak yeni parçaların seri numaraları. Her satıra bir adet ya da virgülle ayırın.',
        serialPlaceholder: 'KGB123, KGB456',
        serialField: 'kgbSerials'
    },
    KBB: {
        crumb: 'KBB · İade / Sökülen Parça',
        title: 'Yeni KBB Girişi',
        icon: Recycle,
        accent: 'bg-indigo-600',
        serialLabel: 'KBB Seri Numaraları',
        serialHint: 'Cihazdan sökülen arızalı parçaların seri numaraları. Her satıra bir adet ya da virgülle ayırın.',
        serialPlaceholder: 'KBB123, KBB456',
        serialField: 'kbbSerials'
    },
    // Bütün birim: stok tutulmaz, yalnızca kod + açıklama kataloğu
    [WAREHOUSE_WHOLE_UNIT]: {
        crumb: 'Bütün Birim · Kod Kaydı',
        title: 'Yeni Bütün Birim Parçası',
        icon: Layers,
        accent: 'bg-[#bf5b04]',
        serialLabel: null,
        serialHint: null,
        serialPlaceholder: null,
        serialField: null
    },
    loaner: {
        crumb: 'Ödünç Cihaz',
        title: 'Yeni Ödünç Cihaz',
        icon: Smartphone,
        accent: 'bg-purple-600',
        serialLabel: null,
        serialHint: null,
        serialPlaceholder: null,
        serialField: null
    }
};

const parseSerials = (value) =>
    (value || '')
        .split(/[\n,;]+/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

/**
 * Envanter girişi: KGB parçası, KBB (sökülen) parçası veya ödünç cihaz.
 * Tek modal, mode'a göre alanlar değişir.
 */
const InventoryEntryModal = ({ mode = 'KGB', stores = [], defaultStoreId = '', onClose, onSave }) => {
    const config = MODES[mode] || MODES.KGB;
    const Icon = config.icon;
    // Bütün birim yalnızca kod kataloğudur: stok, seri, fiyat ve raf alanı yok
    const isWholeUnit = mode === WAREHOUSE_WHOLE_UNIT;
    const uid = useId();
    const fieldId = (name) => `${uid}-${name}`;
    const dialogRef = useRef(null);
    const errorRef = useRef(null);

    const [form, setForm] = useState({
        name: '',
        partNumber: '',
        category: mode === 'loaner' ? 'iPhone' : 'iPhone',
        price: '',
        location: '',
        minLevel: 5,
        storeId: defaultStoreId ? String(defaultStoreId) : '',
        serials: '',
        serialNumber: '',
        loanNote: ''
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const serials = useMemo(() => parseSerials(form.serials), [form.serials]);
    const effectiveQty = isWholeUnit ? 0 : (mode === 'loaner' ? 1 : (serials.length || 1));

    // Kayıt yalnızca sayısal mağaza id'sine bağlanabilir; id'si olmayan mağaza
    // seçilirse parça hiçbir ambarda görünmez, bu yüzden listelenmez.
    const selectableStores = useMemo(
        () => stores.filter(s => Number(s?.id) > 0),
        [stores]
    );
    const noStoreAvailable = selectableStores.length === 0;
    const storeName = selectableStores.find(s => String(s.id) === String(form.storeId))?.name;

    // Varsayılan mağaza artık mevcut değilse (silinmiş/erişim kalkmış) seçim
    // boşta kalıyor ve kayıt tanımsız bir ambara gidiyordu. Tek mağaza varsa
    // doğrudan seçilir, geçersiz varsayılan temizlenir.
    useEffect(() => {
        setForm(prev => {
            const exists = selectableStores.some(s => String(s.id) === String(prev.storeId));
            if (exists) return prev;
            const only = selectableStores.length === 1 ? String(selectableStores[0].id) : '';
            return prev.storeId === only ? prev : { ...prev, storeId: only };
        });
    }, [selectableStores]);

    // Odak YALNIZCA açılışta alınır. Bu efekt [onClose] ile çalışsaydı, onClose
    // üst bileşende satır içi tanımlandığı için her render'da kimliği değişir,
    // efekt yeniden çalışır ve kullanıcı form doldururken odak forma geri
    // çekilerek yazılanlar kaybolurdu.
    useEffect(() => { dialogRef.current?.focus(); }, []);

    // Esc dinleyicisi bir kez bağlanır; güncel onClose ref üzerinden okunur.
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        const onKeyDown = (e) => { if (e.key === 'Escape') closeRef.current?.(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    const setField = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!form.name.trim()) {
            next.name = mode === 'loaner' ? 'Cihaz adı zorunludur.' : 'Parça tanımı zorunludur.';
        }
        if (mode !== 'loaner' && !form.partNumber.trim()) {
            next.partNumber = isWholeUnit ? 'Bütün birim kodu zorunludur.' : 'Parça kodu (P/N) zorunludur.';
        }
        if (mode === 'loaner' && !form.serialNumber.trim()) next.serialNumber = 'Cihaz seri numarası zorunludur.';

        // Bütün birim kodu sistem geneli kaydedilir; mağaza ambarı istenmez
        if (!isWholeUnit) {
            if (noStoreAvailable) {
                next.storeId = 'Hesabınıza tanımlı bir mağaza ambarı yok. Ayarlar › Mağazalar bölümünden mağaza tanımlayın veya yöneticinizden mağaza yetkisi isteyin.';
            } else if (!form.storeId || !(Number(form.storeId) > 0)) {
                next.storeId = 'Mağaza ambarı seçilmelidir.';
            }
        }

        const duplicate = serials.find((s, i) => serials.indexOf(s) !== i);
        if (duplicate) next.serials = `Aynı seri numarası iki kez girilmiş: ${duplicate}`;

        setErrors(next);
        if (Object.keys(next).length) {
            requestAnimationFrame(() => errorRef.current?.focus());
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving || !validate()) return;

        const payload = {
            name: form.name.trim(),
            category: mode === 'loaner' ? 'loaner' : form.category,
            // Bütün birim ambara bağlı değildir; 0 "sistem geneli" demektir
            storeId: isWholeUnit ? 0 : Number(form.storeId),
            price: Number(form.price) || 0,
            location: form.location.trim(),
            warehouseType: mode === 'loaner' ? 'KGB' : mode,
            quantity: effectiveQty
        };

        if (mode === 'loaner') {
            payload.serialNumber = form.serialNumber.trim().toUpperCase();
            payload.loanNote = form.loanNote.trim();
            payload.minLevel = 0;
            payload.currentCustomer = '';
        } else if (isWholeUnit) {
            // Stoksuz katalog kaydı: kritik seviye ve fiyat takibi yapılmaz
            payload.partNumber = form.partNumber.trim().toUpperCase();
            payload.minLevel = 0;
            payload.price = 0;
            payload.location = '';
        } else {
            payload.partNumber = form.partNumber.trim().toUpperCase();
            payload.minLevel = Number(form.minLevel) || 0;
            payload[config.serialField] = serials;
        }

        setSaving(true);
        const ok = await onSave(payload);
        setSaving(false);
        if (ok) onClose?.();
    };

    const inputCls = 'w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm font-semibold text-[#1d1d1f] placeholder:text-gray-400 outline-none transition-all focus-visible:bg-white focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15';
    const labelCls = 'block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1';
    const errorList = Object.values(errors).filter(Boolean);

    return (
        <div className="fixed inset-0 bg-[#1d1d1f]/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <form
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={fieldId('title')}
                onSubmit={handleSubmit}
                className="bg-white rounded-[24px] w-full max-w-3xl shadow-2xl animate-scale-up overflow-hidden flex flex-col max-h-[92vh] outline-none"
            >
                {/* Başlık */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${config.accent} rounded-2xl flex items-center justify-center`}>
                            <Icon size={22} className="text-white" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{config.crumb}</p>
                            <h3 id={fieldId('title')} className="text-xl font-bold text-[#1d1d1f] tracking-tight">{config.title}</h3>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#1d1d1f] hover:bg-gray-100 rounded-full transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <X size={20} aria-hidden="true" />
                        <span className="sr-only">Kapat</span>
                    </button>
                </div>

                {/* Gövde */}
                <div className="p-8 space-y-7 overflow-y-auto custom-scrollbar">
                    {errorList.length > 0 && (
                        <div
                            ref={errorRef}
                            tabIndex={-1}
                            role="alert"
                            className="rounded-2xl border border-[#c30000]/25 bg-[#fff5f5] px-5 py-4 outline-none focus-visible:ring-4 focus-visible:ring-[#c30000]/20"
                        >
                            <p className="flex items-center gap-2 text-[13px] font-semibold text-[#c30000]">
                                <AlertCircle size={15} aria-hidden="true" />
                                {errorList.length} alanı düzeltin
                            </p>
                            <ul className="mt-2 ml-6 list-disc space-y-1 text-[12px] font-medium text-[#8a0000]">
                                {errorList.map((msg, i) => <li key={i}>{msg}</li>)}
                            </ul>
                        </div>
                    )}

                    <div>
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Package size={13} className="text-[#0071e3]" aria-hidden="true" />
                            {mode === 'loaner' ? 'Cihaz Bilgileri' : isWholeUnit ? 'Bütün Birim Bilgileri' : 'Parça Bilgileri'}
                        </h4>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor={fieldId('name')} className={labelCls}>
                                    {mode === 'loaner' ? 'Cihaz Adı' : isWholeUnit ? 'Açıklama' : 'Parça Tanımı'} <span className="text-[#c30000]" aria-hidden="true">*</span>
                                </label>
                                <input
                                    id={fieldId('name')}
                                    type="text"
                                    className={inputCls}
                                    placeholder={mode === 'loaner' ? 'Örn: iPhone 13 (Ödünç)' : isWholeUnit ? 'Örn: iPhone 13 Pro Bütün Birim' : 'Örn: iPhone 13 Pro Ekran'}
                                    value={form.name}
                                    onChange={(e) => setField('name', e.target.value)}
                                    aria-required="true"
                                    aria-invalid={errors.name ? 'true' : undefined}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {mode === 'loaner' ? (
                                    <div>
                                        <label htmlFor={fieldId('serialNumber')} className={labelCls}>
                                            Cihaz Seri No <span className="text-[#c30000]" aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id={fieldId('serialNumber')}
                                            type="text"
                                            className={`${inputCls} font-mono uppercase`}
                                            placeholder="F2LX..."
                                            value={form.serialNumber}
                                            onChange={(e) => setField('serialNumber', e.target.value)}
                                            aria-required="true"
                                            aria-invalid={errors.serialNumber ? 'true' : undefined}
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor={fieldId('partNumber')} className={labelCls}>
                                            {isWholeUnit ? 'Bütün Birim Kodu' : 'Parça Kodu (P/N)'} <span className="text-[#c30000]" aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id={fieldId('partNumber')}
                                            type="text"
                                            className={`${inputCls} font-mono uppercase`}
                                            placeholder={isWholeUnit ? 'Bütün birim kodu' : '661-XXXXX'}
                                            value={form.partNumber}
                                            onChange={(e) => setField('partNumber', e.target.value)}
                                            aria-required="true"
                                            aria-invalid={errors.partNumber ? 'true' : undefined}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label htmlFor={fieldId('category')} className={labelCls}>Kategori</label>
                                    <select
                                        id={fieldId('category')}
                                        className={inputCls}
                                        value={form.category}
                                        onChange={(e) => setField('category', e.target.value)}
                                        disabled={mode === 'loaner'}
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {isWholeUnit ? (
                                <p className="text-[11px] font-medium text-gray-500 leading-snug bg-[#f5f5f7] border border-gray-200 rounded-xl px-4 py-3">
                                    Bütün birim kayıtlarında stok, seri numarası, fiyat ve raf bilgisi tutulmaz.
                                    Yalnızca kod ve açıklaması saklanır; KGB/KBB ambarlarına karışmaz.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor={fieldId('price')} className={labelCls}>
                                            {mode === 'KBB' ? 'Tahmini Değer (₺)' : 'Birim Fiyat (₺)'}
                                        </label>
                                        <input
                                            id={fieldId('price')}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className={inputCls}
                                            placeholder="0"
                                            value={form.price}
                                            onChange={(e) => setField('price', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={fieldId('location')} className={labelCls}>Raf / Konum</label>
                                        <input
                                            id={fieldId('location')}
                                            type="text"
                                            className={inputCls}
                                            placeholder="Örn: A-3 Rafı"
                                            value={form.location}
                                            onChange={(e) => setField('location', e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bütün birim kodu hiçbir ambara bağlanmaz; mağaza bölümü hiç gösterilmez */}
                    {isWholeUnit ? (
                        <div className="pt-2 border-t border-gray-100">
                            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Layers size={13} className="text-[#bf5b04]" aria-hidden="true" /> Kayıt Kapsamı
                            </h4>
                            <p className="text-[11px] font-medium text-gray-500 leading-snug bg-[#f5f5f7] border border-gray-200 rounded-xl px-4 py-3">
                                Bu kod sisteme geneline kaydedilir; herhangi bir mağaza ambarına bağlanmaz
                                ve tüm mağazalardan görünür.
                            </p>
                        </div>
                    ) : (
                    <div className="pt-2 border-t border-gray-100">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Store size={13} className="text-[#0071e3]" aria-hidden="true" /> Mağaza Ambarı
                            {mode !== 'loaner' && ' & Stok'}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor={fieldId('storeId')} className={labelCls}>
                                    Mağaza Ambarı <span className="text-[#c30000]" aria-hidden="true">*</span>
                                </label>
                                <select
                                    id={fieldId('storeId')}
                                    className={`${inputCls} ${errors.storeId ? 'ring-4 ring-[#c30000]/20 border-[#c30000]' : ''}`}
                                    value={form.storeId}
                                    onChange={(e) => setField('storeId', e.target.value)}
                                    disabled={noStoreAvailable}
                                    aria-required="true"
                                    aria-invalid={errors.storeId ? 'true' : undefined}
                                    aria-describedby={noStoreAvailable ? fieldId('store-hint') : undefined}
                                >
                                    <option value="">{noStoreAvailable ? 'Seçilebilir mağaza yok' : 'Mağaza seçiniz…'}</option>
                                    {selectableStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                {noStoreAvailable && (
                                    <p id={fieldId('store-hint')} className="text-[11px] font-medium text-[#c30000] mt-1.5 ml-1 leading-snug">
                                        Hesabınıza tanımlı mağaza ambarı bulunmuyor. Ayarlar › Mağazalar bölümünden mağaza ekleyin
                                        ya da yöneticinizden hesabınıza mağaza tanımlamasını isteyin.
                                    </p>
                                )}
                            </div>

                            {mode !== 'loaner' && (
                                <div>
                                    <label htmlFor={fieldId('minLevel')} className={labelCls}>Kritik Stok Seviyesi</label>
                                    <input
                                        id={fieldId('minLevel')}
                                        type="number"
                                        min="0"
                                        className={inputCls}
                                        value={form.minLevel}
                                        onChange={(e) => setField('minLevel', e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {mode === 'loaner' ? (
                            <div className="mt-4">
                                <label htmlFor={fieldId('loanNote')} className={labelCls}>Not (opsiyonel)</label>
                                <textarea
                                    id={fieldId('loanNote')}
                                    rows="2"
                                    className={`${inputCls} resize-none`}
                                    placeholder="Cihazın durumu, aksesuarları…"
                                    value={form.loanNote}
                                    onChange={(e) => setField('loanNote', e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label htmlFor={fieldId('serials')} className={`${labelCls} mb-0`}>{config.serialLabel}</label>
                                    <span className="text-[10px] font-bold text-[#0071e3] bg-blue-50 px-2 py-0.5 rounded-full" aria-live="polite">
                                        {serials.length} adet
                                    </span>
                                </div>
                                <textarea
                                    id={fieldId('serials')}
                                    rows="3"
                                    className={`${inputCls} font-mono resize-none uppercase`}
                                    placeholder={config.serialPlaceholder}
                                    value={form.serials}
                                    onChange={(e) => setField('serials', e.target.value)}
                                    aria-describedby={fieldId('serials-hint')}
                                    aria-invalid={errors.serials ? 'true' : undefined}
                                />
                                <p id={fieldId('serials-hint')} className="text-[11px] text-gray-500 mt-1.5 ml-1 leading-snug">
                                    {config.serialHint} Seri no girilirse stok adedi otomatik hesaplanır; boş bırakılırsa 1 adet eklenir.
                                </p>
                            </div>
                        )}
                    </div>
                    )}
                </div>

                {/* Alt bar */}
                <div className="px-8 py-5 bg-[#f5f5f7] border-t border-gray-100 flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Eklenecek</span>
                        <span className="text-lg font-bold text-[#1d1d1f]">
                            {isWholeUnit ? '1 kod' : `${effectiveQty} adet`}
                        </span>
                        {!isWholeUnit && storeName && (
                            <span className="text-[11px] font-bold text-[#0071e3] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg flex items-center gap-1 truncate">
                                <Store size={11} aria-hidden="true" /> {storeName}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-white text-gray-600 font-bold text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            Vazgeç
                        </button>
                        <button
                            type="submit"
                            disabled={saving || (!isWholeUnit && noStoreAvailable)}
                            className="px-8 py-3 bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all active:scale-95 flex items-center gap-2 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            {saving ? <Plus size={18} className="animate-spin" aria-hidden="true" /> : <CheckCircle size={18} aria-hidden="true" />}
                            {saving ? 'Kaydediliyor…' : 'Kaydı Tamamla'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default InventoryEntryModal;
