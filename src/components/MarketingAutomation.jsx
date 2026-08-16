import React, { useMemo, useState, useId } from 'react';
import {
    Megaphone, Users, MessageCircle, Mail, Search, ChevronRight, Zap, Bell,
    ShieldCheck, Settings, Clock, Send, UserCheck, AtSign, Phone, RotateCcw
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { appAlert } from '../utils/alert';
import { parseRepairDate } from '../utils/archiveFilters';

const AUDIENCE_FILTERS = [
    { id: 'all', label: 'Tüm Müşteriler' },
    { id: 'lapsed', label: 'Son 6 Aydır Gelmeyenler' },
    { id: 'reachable', label: 'İletişim Bilgisi Olanlar' }
];

const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000;

const MARKETING_MESSAGE =
    'Merhaba, Troy Apple Yetkili Servisi olarak size özel kampanya ve fırsatlarımız var! '
    + 'Cihazınızın ücretsiz genel bakımı için sizi mağazalarımıza bekliyoruz.';

const fmtDate = (value) => {
    const date = parseRepairDate(value);
    return date
        ? date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Belirtilmemiş';
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
                <p className="text-xl font-bold text-[#1d1d1f] leading-tight tabular-nums">{value}</p>
                {hint && <p className="text-[11px] font-medium text-gray-500 truncate">{hint}</p>}
            </div>
        </div>
    );
};

/** Kural anahtarı: gerçek switch semantiği (klavye ve ekran okuyucu desteğiyle) */
const RuleSwitch = ({ checked, onChange, labelId }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={onChange}
        className={`w-11 h-6 rounded-full p-0.5 shrink-0 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${checked ? 'bg-[#0071e3]' : 'bg-gray-300'}`}
    >
        <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const MarketingAutomation = () => {
    const { allRepairs } = useAppContext();
    const uid = useId();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [isSending, setIsSending] = useState(false);

    // Otomasyon kuralları (şimdilik yerel simülasyon)
    const [rules, setRules] = useState([
        { id: 1, title: 'Otomatik SLA Takibi', desc: '48 saati geçen işlemlerde yöneticilere bildirim gönder.', active: true, icon: Bell, tone: 'text-[#e30000] bg-[#e30000]/8' },
        { id: 2, title: 'Hazır Bildirim Otomasyonu', desc: 'Cihaz "Hazır" olduğunda müşteriye WhatsApp ve e-posta gönder.', active: true, icon: Zap, tone: 'text-[#0071e3] bg-[#e8f2ff]' },
        { id: 3, title: 'Memnuniyet Anketi', desc: 'Teslimattan 24 saat sonra müşteri portalına NPS anketi ekle.', active: false, icon: ShieldCheck, tone: 'text-[#1e7e34] bg-[#e6f4ea]' },
        { id: 4, title: 'Teklif Hatırlatıcı', desc: 'Onay bekleyen teklifleri 2 gün sonra müşteriye tekrar hatırlat.', active: true, icon: Clock, tone: 'text-[#b25e00] bg-[#fff4e5]' }
    ]);

    const toggleRule = (id) => {
        setRules(prev => prev.map(r => (r.id === id ? { ...r, active: !r.active } : r)));
    };

    // Kayıtlardan kişi listesi: aynı kişi birden fazla kayıtta olabilir, en yenisi alınır
    const audience = useMemo(() => {
        const byKey = new Map();

        (allRepairs || []).forEach(repair => {
            const phone = (repair.customerPhone || '').trim();
            const email = (repair.customerEmail || '').trim();
            const key = phone || email || `kayit-${repair.id}`;
            const date = parseRepairDate(repair.createdAt || repair.date);

            const existing = byKey.get(key);
            if (existing && existing.date && date && existing.date >= date) return;

            byKey.set(key, {
                key,
                name: repair.customer || 'İsimsiz müşteri',
                phone,
                email,
                device: repair.device || '',
                lastVisit: repair.createdAt || repair.date,
                date
            });
        });

        return [...byKey.values()].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    }, [allRepairs]);

    const query = searchTerm.trim().toLowerCase();

    const filteredList = useMemo(() => {
        const threshold = Date.now() - SIX_MONTHS_MS;

        return audience.filter(person => {
            if (filterType === 'lapsed' && !(person.date && person.date.getTime() < threshold)) return false;
            if (filterType === 'reachable' && !person.phone && !person.email) return false;

            if (!query) return true;
            return person.name.toLowerCase().includes(query)
                || person.phone.toLowerCase().includes(query)
                || person.email.toLowerCase().includes(query);
        });
    }, [audience, filterType, query]);

    const selectableKeys = useMemo(
        () => filteredList.filter(p => p.phone || p.email).map(p => p.key),
        [filteredList]
    );

    const selectedInView = selectableKeys.filter(key => selectedKeys.includes(key));
    const allSelected = selectableKeys.length > 0 && selectedInView.length === selectableKeys.length;

    const selectedPeople = useMemo(
        () => audience.filter(p => selectedKeys.includes(p.key)),
        [audience, selectedKeys]
    );

    const stats = useMemo(() => ({
        total: audience.length,
        withPhone: audience.filter(p => p.phone).length,
        withEmail: audience.filter(p => p.email).length
    }), [audience]);

    const toggleSelect = (key) => {
        setSelectedKeys(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
    };

    const toggleSelectAll = () => {
        setSelectedKeys(prev => (allSelected
            ? prev.filter(key => !selectableKeys.includes(key))
            : [...new Set([...prev, ...selectableKeys])]));
    };

    const handleSendMarketing = async (type) => {
        if (selectedPeople.length === 0) {
            appAlert('Lütfen en az bir müşteri seçin.', 'warning');
            return;
        }

        if (type === 'whatsapp') {
            const first = selectedPeople.find(p => p.phone);
            if (!first) {
                appAlert('Seçili kişilerin telefon numarası yok.', 'warning');
                return;
            }
            appAlert(
                `${selectedPeople.length} kişiye WhatsApp üzerinden mesaj gönderme kuyruğuna eklendi.\n`
                + '(Not: Gerçek çoklu gönderim için WhatsApp Business API gerekir)',
                'success'
            );
            window.open(
                `https://wa.me/90${first.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(MARKETING_MESSAGE)}`,
                '_blank'
            );
            return;
        }

        setIsSending(true);
        setTimeout(() => {
            appAlert(`${selectedPeople.length} adet e-posta başarıyla sıraya alındı ve gönderiliyor.`, 'success');
            setIsSending(false);
            setSelectedKeys([]);
        }, 1500);
    };

    const selectedWithPhone = selectedPeople.filter(p => p.phone).length;
    const selectedWithEmail = selectedPeople.filter(p => p.email).length;

    return (
        <div className="page-shell animate-fade-in">
            {/* Başlık */}
            <div className="shrink-0 flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="min-w-0">
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                        <span>Servis Yönetimi</span>
                        <ChevronRight size={10} aria-hidden="true" />
                        <span className="text-[#0071e3]">Pazarlama & Otomasyon</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Pazarlama & Otomasyon</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Müşteri kitlesini süzün, toplu WhatsApp ve e-posta kampanyaları gönderin, otomasyon kurallarını yönetin.
                    </p>
                </div>

                {selectedPeople.length > 0 && (
                    <div className="flex items-center gap-3">
                        <p aria-live="polite" className="text-[13px] font-semibold text-[#1d1d1f]">
                            {selectedPeople.length} kişi seçili
                            <span className="font-medium text-gray-500"> · {selectedWithPhone} telefon, {selectedWithEmail} e-posta</span>
                        </p>
                        <button
                            type="button"
                            onClick={() => setSelectedKeys([])}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-semibold text-gray-600 hover:bg-[#f5f5f7] transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            <RotateCcw size={13} aria-hidden="true" /> Seçimi temizle
                        </button>
                    </div>
                )}
            </div>

            <div className="page-scroll py-5 pr-1 space-y-6">
                {/* Özet */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard icon={Users} label="Kitle" value={stats.total} hint="Tekilleştirilmiş müşteri" />
                    <StatCard icon={Phone} label="Telefonu Olan" value={stats.withPhone} tone="text-[#1e7e34] bg-[#e6f4ea]" hint="WhatsApp ile ulaşılabilir" />
                    <StatCard icon={AtSign} label="E-Postası Olan" value={stats.withEmail} tone="text-[#0071e3] bg-[#e8f2ff]" hint="Bülten ile ulaşılabilir" />
                </div>

                {/* Kampanya kanalları + otomasyon kuralları */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
                    <section aria-labelledby={`${uid}-wa`} className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-5 flex flex-col">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#e6f4ea] text-[#1e7e34] flex items-center justify-center">
                                <MessageCircle size={20} />
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border bg-[#e6f4ea] text-[#1e7e34] border-[#1e7e34]/15">
                                Hazır
                            </span>
                        </div>
                        <h2 id={`${uid}-wa`} className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">WhatsApp Toplu Mesaj</h2>
                        <p className="text-[13px] text-gray-500 mt-1 mb-4">
                            Seçili müşterilere doğrudan WhatsApp üzerinden kampanya metni iletin.
                        </p>
                        <button
                            type="button"
                            onClick={() => handleSendMarketing('whatsapp')}
                            disabled={selectedWithPhone === 0}
                            className="mt-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#1e7e34] text-white text-[13px] font-semibold hover:bg-[#1a6e2d] disabled:opacity-40 disabled:hover:bg-[#1e7e34] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#1e7e34]/25"
                        >
                            <Send size={15} aria-hidden="true" />
                            Gönder ({selectedWithPhone} kişi)
                        </button>
                    </section>

                    <section aria-labelledby={`${uid}-mail`} className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-5 flex flex-col">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#e8f2ff] text-[#0071e3] flex items-center justify-center">
                                <Mail size={20} />
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border bg-[#e8f2ff] text-[#0071e3] border-[#0071e3]/15">
                                API Aktif
                            </span>
                        </div>
                        <h2 id={`${uid}-mail`} className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">E-Posta Bülteni</h2>
                        <p className="text-[13px] text-gray-500 mt-1 mb-4">
                            Müşterilere HTML formatında toplu e-posta kampanyaları gönderin.
                        </p>
                        <button
                            type="button"
                            onClick={() => handleSendMarketing('email')}
                            disabled={isSending || selectedWithEmail === 0}
                            className="mt-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#0071e3] text-white text-[13px] font-semibold hover:bg-[#0077ed] disabled:opacity-40 disabled:hover:bg-[#0071e3] transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            <Send size={15} aria-hidden="true" />
                            {isSending ? 'Gönderiliyor…' : `Küme Gönderimi (${selectedWithEmail} kişi)`}
                        </button>
                    </section>

                    <section aria-labelledby={`${uid}-rules`} className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#f5f5f7] border border-gray-200 text-[#1d1d1f] flex items-center justify-center">
                                <Settings size={19} />
                            </span>
                            <div className="min-w-0">
                                <h2 id={`${uid}-rules`} className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Akıllı Kurallar</h2>
                                <p className="text-[11px] font-medium text-gray-500">
                                    {rules.filter(r => r.active).length} / {rules.length} kural açık
                                </p>
                            </div>
                        </div>

                        <ul className="list-none p-0 m-0 space-y-2">
                            {rules.map(rule => (
                                <li key={rule.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#f5f5f7]/70 border border-gray-200">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span aria-hidden="true" className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${rule.tone}`}>
                                            <rule.icon size={16} />
                                        </span>
                                        <div className="min-w-0">
                                            <p id={`${uid}-rule-${rule.id}`} className="text-[12px] font-semibold text-[#1d1d1f] truncate">{rule.title}</p>
                                            <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{rule.desc}</p>
                                        </div>
                                    </div>
                                    <RuleSwitch
                                        checked={rule.active}
                                        onChange={() => toggleRule(rule.id)}
                                        labelId={`${uid}-rule-${rule.id}`}
                                    />
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>

                {/* Kitle listesi */}
                <section aria-labelledby={`${uid}-audience`} className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-end gap-4 border-b border-gray-100">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span aria-hidden="true" className="w-11 h-11 rounded-xl bg-[#1d1d1f] text-white flex items-center justify-center shrink-0">
                                <Megaphone size={20} />
                            </span>
                            <div className="min-w-0">
                                <h2 id={`${uid}-audience`} className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Kampanya Kitlesi</h2>
                                <p aria-live="polite" className="text-[11px] font-semibold text-gray-500">
                                    {filteredList.length} kişi listeleniyor · {selectedPeople.length} seçili
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div>
                                <label htmlFor={`${uid}-filter`} className="sr-only">Kitleyi süz</label>
                                <select
                                    id={`${uid}-filter`}
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="h-11 px-3 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-[#1d1d1f] outline-none focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15"
                                >
                                    {AUDIENCE_FILTERS.map(option => (
                                        <option key={option.id} value={option.id}>{option.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative w-full sm:w-72">
                                <label htmlFor={`${uid}-search`} className="sr-only">Müşteri, telefon veya e-posta ara</label>
                                <Search size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    id={`${uid}-search`}
                                    type="search"
                                    placeholder="Müşteri, telefon veya e-posta ara…"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-11 pl-11 pr-4 bg-white border border-gray-300 rounded-xl text-sm font-medium text-[#1d1d1f] placeholder:text-gray-400 outline-none transition-all focus-visible:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/15"
                                />
                            </div>
                        </div>
                    </div>

                    {filteredList.length === 0 ? (
                        <div className="py-14 text-center">
                            <UserCheck size={36} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
                            <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Kriterlere uyan müşteri yok</h3>
                            <p className="text-[13px] text-gray-500 mt-1">Süzgeci değiştirin ya da arama ifadesini sadeleştirin.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <caption className="sr-only">Kampanya gönderimi için müşteri listesi</caption>
                                <thead>
                                    <tr className="bg-[#f5f5f7]/70 border-b border-gray-100">
                                        <th scope="col" className="px-5 py-3 w-14">
                                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 accent-[#0071e3]"
                                                    checked={allSelected}
                                                    ref={el => { if (el) el.indeterminate = !allSelected && selectedInView.length > 0; }}
                                                    onChange={toggleSelectAll}
                                                    disabled={selectableKeys.length === 0}
                                                />
                                                <span className="sr-only">Listedeki tüm müşterileri seç</span>
                                            </label>
                                        </th>
                                        <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Müşteri</th>
                                        <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">İletişim</th>
                                        <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cihaz</th>
                                        <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Son İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredList.map(person => {
                                        const selected = selectedKeys.includes(person.key);
                                        const reachable = Boolean(person.phone || person.email);

                                        return (
                                            <tr key={person.key} className={`transition-colors ${selected ? 'bg-[#0071e3]/5' : 'hover:bg-[#f5f5f7]/60'}`}>
                                                <td className="px-5 py-3.5 align-middle">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-gray-300 accent-[#0071e3] disabled:opacity-40"
                                                        checked={selected}
                                                        disabled={!reachable}
                                                        onChange={() => toggleSelect(person.key)}
                                                        aria-label={`${person.name} kampanya listesine ekle`}
                                                    />
                                                </td>
                                                <td className="px-5 py-3.5 align-middle">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span aria-hidden="true" className="w-9 h-9 rounded-xl bg-[#f5f5f7] border border-gray-200 text-[#1d1d1f] flex items-center justify-center text-[12px] font-semibold shrink-0">
                                                            {(person.name || '?').charAt(0).toLocaleUpperCase('tr')}
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="block text-[13px] font-semibold text-[#1d1d1f] truncate">{person.name}</span>
                                                            {!reachable && (
                                                                <span className="block text-[11px] font-medium text-[#b25e00]">İletişim bilgisi yok</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 align-middle">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {person.phone && (
                                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-[#f5f5f7] border border-gray-200 px-2.5 py-1 rounded-full font-mono">
                                                                <Phone size={11} aria-hidden="true" /> {person.phone}
                                                            </span>
                                                        )}
                                                        {person.email && (
                                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-[#f5f5f7] border border-gray-200 px-2.5 py-1 rounded-full max-w-[220px] truncate">
                                                                <AtSign size={11} aria-hidden="true" /> {person.email}
                                                            </span>
                                                        )}
                                                        {!person.phone && !person.email && <span className="text-[13px] text-gray-300">—</span>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 align-middle text-[13px] font-medium text-gray-600 truncate max-w-[220px]">
                                                    {person.device || '—'}
                                                </td>
                                                <td className="px-5 py-3.5 align-middle text-[13px] font-medium text-gray-600 whitespace-nowrap">
                                                    {fmtDate(person.lastVisit)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default MarketingAutomation;
