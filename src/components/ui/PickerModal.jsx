import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import useAnimatedClose from './useAnimatedClose';

/* ------------------------------------------------------------------
   Aranabilir Seçim Penceresi
   İl, ilçe, ürün grubu gibi uzun listelerden seçim için ortak popup.
   Klavye: ok tuşlarıyla gezinme, Enter ile seçim, Esc ile kapatma.
------------------------------------------------------------------ */

/**
 * Arama için sadeleştirme.
 * Türkçe karakterler ASCII karşılığına indirgenir; böylece "mugla" yazan da
 * "Muğla"yı, "sanli" yazan da "Şanlıurfa"yı bulur. Büyük I/İ farkı da giderilir.
 */
const TR_FOLD = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };

const normalize = (value) => String(value ?? '')
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşüâîû]/g, (ch) => TR_FOLD[ch] || ch);

/**
 * @param {Array<string|{value:string,label:string,hint?:string}>} options
 */
const PickerModal = ({
    title,
    description,
    options = [],
    value,
    onSelect,
    onClose,
    placeholder = 'Ara…',
    emptyText = 'Eşleşen kayıt bulunamadı.',
}) => {
    const { closing, requestClose } = useAnimatedClose(onClose, 200);
    const dialogRef = useRef(null);
    const searchRef = useRef(null);
    const listRef = useRef(null);

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

    useEffect(() => { searchRef.current?.focus(); }, []);
    useEffect(() => { setActiveIndex(0); }, [term]);

    const closeRef = useRef(requestClose);
    closeRef.current = requestClose;

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeRef.current();
            return;
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => {
                if (filtered.length === 0) return 0;
                const next = e.key === 'ArrowDown'
                    ? (prev + 1) % filtered.length
                    : (prev - 1 + filtered.length) % filtered.length;
                listRef.current?.querySelector(`[data-index="${next}"]`)
                    ?.scrollIntoView({ block: 'nearest' });
                return next;
            });
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const item = filtered[activeIndex];
            if (item) {
                onSelect(item.value, item);
                requestClose();
            }
        }
    };

    return (
        <div
            className={`fixed inset-0 z-[130] bg-[#1d1d1f]/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 ${closing ? 'animate-out fade-out duration-200 pointer-events-none' : 'animate-in fade-in'}`}
            onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="picker-title"
                onKeyDown={handleKeyDown}
                className={`bg-white w-full max-w-lg rounded-[24px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[80vh] outline-none ${closing ? 'animate-out fade-out zoom-out-95 duration-200' : 'animate-scale-up'}`}
            >
                <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100 shrink-0">
                    <div className="min-w-0">
                        <h3 id="picker-title" className="text-[17px] font-semibold text-[#1d1d1f] truncate">{title}</h3>
                        {description && (
                            <p className="text-[12px] font-medium text-gray-500 mt-0.5">{description}</p>
                        )}
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

                <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                    <label htmlFor="picker-search" className="sr-only">{title} içinde ara</label>
                    <div className="relative">
                        <Search size={15} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            ref={searchRef}
                            id="picker-search"
                            type="search"
                            value={term}
                            onChange={(e) => setTerm(e.target.value)}
                            placeholder={placeholder}
                            autoComplete="off"
                            aria-describedby="picker-count"
                            className="w-full h-11 pl-11 pr-4 bg-[#f5f5f7] border border-gray-200 rounded-xl text-[13px] font-medium outline-none focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                        />
                    </div>
                    <p id="picker-count" aria-live="polite" className="text-[11px] font-semibold text-gray-500 mt-2">
                        {filtered.length} kayıt listeleniyor
                    </p>
                </div>

                <div ref={listRef} className="overflow-y-auto custom-scrollbar p-2">
                    {filtered.length === 0 ? (
                        <p className="py-10 text-center text-[13px] font-medium text-gray-400">{emptyText}</p>
                    ) : (
                        <ul role="listbox" aria-label={title} className="list-none p-0 m-0 space-y-1">
                            {filtered.map((item, index) => {
                                const selected = String(item.value) === String(value);
                                const active = index === activeIndex;
                                return (
                                    <li key={item.value}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={selected}
                                            data-index={index}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            onClick={() => { onSelect(item.value, item); requestClose(); }}
                                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition-colors outline-none ${selected
                                                ? 'bg-[#0071e3] text-white'
                                                : active
                                                    ? 'bg-[#f5f5f7] text-[#1d1d1f]'
                                                    : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'}`}
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
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PickerModal;
