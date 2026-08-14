import React from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------
   Ortak Form Bileşenleri
   GSX / Apple Business arayüz dilinin form ve özet parçaları.
   Ambar, mağaza ve personel ekranları aynı ölçüleri buradan alır.
------------------------------------------------------------------ */

const LABEL = 'block text-[10px] font-bold uppercase tracking-widest text-gray-500';
const CONTROL = 'w-full bg-[#f5f5f7] border rounded-xl text-[13px] font-semibold text-[#1d1d1f] outline-none focus:bg-white transition-all focus-visible:ring-4';
const OK_BORDER = 'border-gray-200 focus:border-[#0071e3] focus-visible:ring-[#0071e3]/25';
const ERR_BORDER = 'border-[#e30000] focus:border-[#e30000] focus-visible:ring-[#e30000]/25';

/** Ekran başlıklarındaki sayısal özet kutusu */
export const StatTile = ({ icon: Icon, label, value, unit, tone = 'bg-white border-gray-200' }) => (
    <div className={`rounded-[18px] border p-4 ${tone}`}>
        <div className="flex items-center gap-2 mb-2">
            {Icon && <Icon size={13} aria-hidden="true" className="text-gray-500 shrink-0" />}
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 truncate">{label}</p>
        </div>
        <p className="text-[22px] font-semibold text-[#1d1d1f] leading-none">
            {value}
            {unit && <span className="text-[11px] font-semibold text-gray-400 ml-1.5">{unit}</span>}
        </p>
    </div>
);

const FieldShell = ({ id, label, required, error, hint, children }) => (
    <div className="space-y-2">
        {label && (
            <label htmlFor={id} className={LABEL}>
                {label} {required && <span className="text-[#e30000]" aria-hidden="true">*</span>}
            </label>
        )}
        {children}
        {error ? (
            <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-[11px] font-semibold text-[#e30000]">
                <AlertTriangle size={12} aria-hidden="true" /> {error}
            </p>
        ) : hint ? (
            <p id={`${id}-hint`} className="text-[11px] font-medium text-gray-500 leading-snug">{hint}</p>
        ) : null}
    </div>
);

/** Tek satırlık metin alanı */
export const Field = ({
    id, label, value, onChange, placeholder, required, error, hint,
    mono, type = 'text', disabled, autoComplete, inputMode,
}) => (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
        <input
            id={id}
            type={type}
            value={value ?? ''}
            disabled={disabled}
            autoComplete={autoComplete}
            inputMode={inputMode}
            aria-required={required ? 'true' : undefined}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${CONTROL} h-12 px-4 disabled:opacity-50 disabled:cursor-not-allowed ${mono ? 'font-mono' : ''} ${error ? ERR_BORDER : OK_BORDER}`}
        />
    </FieldShell>
);

/** Çok satırlı metin alanı */
export const TextAreaField = ({ id, label, value, onChange, placeholder, required, error, hint, rows = 3 }) => (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
        <textarea
            id={id}
            rows={rows}
            value={value ?? ''}
            aria-required={required ? 'true' : undefined}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`${CONTROL} px-4 py-3 resize-none leading-relaxed ${error ? ERR_BORDER : OK_BORDER}`}
        />
    </FieldShell>
);

/** Açılır liste; options [{value,label}] ya da düz string dizisi olabilir */
export const SelectField = ({ id, label, value, onChange, options = [], required, error, hint, disabled }) => (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
        <div className="relative">
            <select
                id={id}
                value={value ?? ''}
                disabled={disabled}
                aria-required={required ? 'true' : undefined}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
                onChange={(e) => onChange(e.target.value)}
                className={`${CONTROL} h-12 pl-4 pr-10 appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${error ? ERR_BORDER : OK_BORDER}`}
            >
                {options.map(opt => {
                    const item = typeof opt === 'string' ? { value: opt, label: opt } : opt;
                    return <option key={item.value} value={item.value}>{item.label}</option>;
                })}
            </select>
            <ChevronDown size={15} aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
    </FieldShell>
);

/**
 * PickerModal ile eşleşen alan: değeri gösteren, tıklanınca arama penceresini
 * açan düğme. Uzun listelerde (il, ilçe) select yerine kullanılır.
 */
export const PickerField = ({ id, label, value, placeholder, onOpen, required, error, hint, disabled }) => (
    <FieldShell id={id} label={label} required={required} error={error} hint={hint}>
        <button
            id={id}
            type="button"
            onClick={onOpen}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={`${CONTROL} h-12 pl-4 pr-10 text-left relative disabled:opacity-50 disabled:cursor-not-allowed ${error ? ERR_BORDER : OK_BORDER} ${value ? '' : 'text-gray-400 font-medium'}`}
        >
            {value || placeholder}
            <ChevronRight size={15} aria-hidden="true" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </button>
    </FieldShell>
);

/** Filtre çubuklarındaki segment düğmesi */
export const SegmentButton = ({ active, onClick, children, count }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`h-9 px-4 rounded-lg text-[12px] font-semibold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active
            ? 'bg-white text-[#0071e3] shadow-sm ring-1 ring-black/5'
            : 'text-gray-500 hover:text-[#1d1d1f]'}`}
    >
        {children}
        {count !== undefined && (
            <span className={`ml-1.5 text-[10px] font-bold ${active ? 'text-[#0071e3]/70' : 'text-gray-400'}`}>{count}</span>
        )}
    </button>
);

/** Liste boşken gösterilen kutu */
export const EmptyState = ({ icon: Icon, title, description, action }) => (
    <div className="rounded-[24px] border border-dashed border-gray-300 bg-white/60 py-16 px-6 text-center">
        {Icon && <Icon size={34} aria-hidden="true" className="mx-auto text-gray-300 mb-3" />}
        <p className="text-[14px] font-semibold text-[#1d1d1f]">{title}</p>
        {description && <p className="text-[12px] font-medium text-gray-500 mt-1 max-w-md mx-auto">{description}</p>}
        {action && <div className="mt-5">{action}</div>}
    </div>
);
