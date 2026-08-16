import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

/* ------------------------------------------------------------------
   Satır İçi Aranabilir Seçim
   Alanın kendisi arama kutusudur; tıklanınca hemen altında küçük bir
   liste açılır. Ekranın ortasında pencere açmaz, form akışını bozmaz.

   Klavye: ↓/↑ gezinme, Enter seçim, Esc kapatma, Tab ile çıkış.
   ARIA: combobox + listbox deseni, aktif seçenek aria-activedescendant
   ile duyurulur, sonuç sayısı canlı bölgede bildirilir.
------------------------------------------------------------------ */

/**
 * Arama için sadeleştirme: Türkçe karakterler ASCII karşılığına iner,
 * böylece "mugla" yazan "Muğla"yı, "sanli" yazan "Şanlıurfa"yı bulur.
 */
const TR_FOLD = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };

const normalize = (value) => String(value ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (ch) => TR_FOLD[ch] || ch);

/**
 * @param {Array<string|{value:string,label:string,hint?:string}>} options
 */
const InlineSelect = ({
    id,
    label,
    value,
    options = [],
    onSelect,
    placeholder = 'Seçiniz',
    searchPlaceholder = 'Yazarak arayın…',
    emptyText = 'Eşleşen kayıt bulunamadı.',
    disabled = false,
    disabledText,
    icon: Icon,
}) => {
    const reactId = useId();
    const baseId = id || reactId;
    const listboxId = `${baseId}-listbox`;
    const statusId = `${baseId}-status`;

    const wrapRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);

    const items = useMemo(
        () => options.map(opt => (typeof opt === 'string' ? { value: opt, label: opt } : opt)),
        [options]
    );

    const filtered = useMemo(() => {
        const q = normalize(term.trim());
        if (!q) return items;
        return items.filter(item =>
            normalize(item.label).includes(q) || normalize(item.value).includes(q)
        );
    }, [items, term]);

    // Arama değişince ilk sonuca dön
    useEffect(() => { setActiveIndex(0); }, [term]);

    // Seçili kayıt varsa liste açılırken onun üzerine konumlan
    useEffect(() => {
        if (!open) return;
        const index = filtered.findIndex(item => String(item.value) === String(value));
        setActiveIndex(index > -1 ? index : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Aktif seçenek her zaman görünür kalsın
    useEffect(() => {
        if (!open) return;
        listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, open]);

    // Dışarı tıklanınca kapat
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
                setTerm('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const close = ({ focusInput = false } = {}) => {
        setOpen(false);
        setTerm('');
        if (focusInput) inputRef.current?.focus();
    };

    const choose = (item) => {
        if (!item) return;
        onSelect(item.value, item);
        close({ focusInput: true });
    };

    const handleKeyDown = (e) => {
        if (disabled) return;

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) { setOpen(true); return; }
            if (filtered.length === 0) return;
            setActiveIndex(prev => (e.key === 'ArrowDown'
                ? (prev + 1) % filtered.length
                : (prev - 1 + filtered.length) % filtered.length));
            return;
        }
        if (e.key === 'Enter') {
            if (!open) return;
            e.preventDefault();
            choose(filtered[activeIndex]);
            return;
        }
        if (e.key === 'Escape') {
            if (!open) return;
            e.preventDefault();
            close({ focusInput: true });
            return;
        }
        if (e.key === 'Tab' && open) {
            close();
        }
    };

    // Kapalıyken seçili değer, açıkken arama metni görünür
    const inputValue = open ? term : (value || '');
    const inputPlaceholder = open ? (value || searchPlaceholder) : placeholder;
    const TrailingIcon = Icon || ChevronDown;

    return (
        <div className="space-y-2">
            <label htmlFor={baseId} className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                {label}
            </label>

            <div ref={wrapRef} className="relative">
                <div className="relative">
                    {open && (
                        <Search size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    )}
                    <input
                        ref={inputRef}
                        id={baseId}
                        type="text"
                        role="combobox"
                        autoComplete="off"
                        disabled={disabled}
                        aria-expanded={open}
                        aria-controls={open ? listboxId : undefined}
                        aria-autocomplete="list"
                        aria-activedescendant={open && filtered[activeIndex] ? `${baseId}-opt-${activeIndex}` : undefined}
                        aria-describedby={open ? statusId : undefined}
                        value={inputValue}
                        placeholder={disabled ? (disabledText || placeholder) : inputPlaceholder}
                        onChange={(e) => { setTerm(e.target.value); if (!open) setOpen(true); }}
                        onFocus={() => { if (!disabled) setOpen(true); }}
                        onClick={() => { if (!disabled) setOpen(true); }}
                        onKeyDown={handleKeyDown}
                        className={`w-full py-4 rounded-md bg-gray-50 border border-gray-200 outline-none text-sm font-bold text-gray-900 placeholder:font-bold placeholder:text-gray-400 focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${open ? 'pl-11 pr-10' : 'pl-5 pr-10'}`}
                    />
                    <TrailingIcon
                        size={18}
                        aria-hidden="true"
                        className={`absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                </div>

                {open && !disabled && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white border border-gray-200 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden">
                        <p id={statusId} aria-live="polite" className="sr-only">
                            {filtered.length} sonuç listeleniyor
                        </p>

                        {filtered.length === 0 ? (
                            <p className="px-4 py-5 text-center text-[12px] font-medium text-gray-500">{emptyText}</p>
                        ) : (
                            <ul
                                ref={listRef}
                                id={listboxId}
                                role="listbox"
                                aria-label={label}
                                className="list-none p-1 m-0 max-h-56 overflow-y-auto custom-scrollbar"
                            >
                                {filtered.map((item, index) => {
                                    const selected = String(item.value) === String(value);
                                    const active = index === activeIndex;
                                    return (
                                        <li
                                            key={item.value}
                                            id={`${baseId}-opt-${index}`}
                                            role="option"
                                            aria-selected={selected}
                                            data-index={index}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            onMouseDown={(e) => e.preventDefault()} // input odağı kaybolmasın
                                            onClick={() => choose(item)}
                                            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors ${selected
                                                ? 'bg-[#0071e3] text-white'
                                                : active
                                                    ? 'bg-[#f5f5f7] text-[#1d1d1f]'
                                                    : 'text-[#1d1d1f]'}`}
                                        >
                                            <span className="min-w-0">
                                                <span className="block text-[13px] font-semibold truncate">{item.label}</span>
                                                {item.hint && (
                                                    <span className={`block text-[11px] font-medium truncate ${selected ? 'text-white/70' : 'text-gray-500'}`}>
                                                        {item.hint}
                                                    </span>
                                                )}
                                            </span>
                                            {selected && <Check size={15} aria-hidden="true" className="shrink-0" />}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InlineSelect;
