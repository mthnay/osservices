import React, { useEffect, useMemo, useState } from 'react';
import { Award, Clock, CheckCircle, Activity, CalendarRange, ChevronRight, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import TechnicianMetricsPanel from './TechnicianMetricsPanel';
import Collapse from './ui/Collapse';
import {
    getTechnicianStats, getTeamAverageDuration, formatDuration, isCompletedRepair
} from '../utils/technicianStats';

/**
 * Tablo satırı olduğu için <div> ile sarılamaz; kapanış animasyonu bitene
 * kadar satırı DOM'da tutup içeriği Collapse ile açıp kapatıyoruz.
 */
const TechnicianMetricsRow = ({ open, id, colSpan, stats }) => {
    const [mounted, setMounted] = useState(open);

    useEffect(() => {
        if (open) {
            setMounted(true);
            return undefined;
        }
        const timer = setTimeout(() => setMounted(false), 340);
        return () => clearTimeout(timer);
    }, [open]);

    if (!mounted) return null;

    return (
        <tr id={id} className="bg-[#f5f5f7]/60">
            <td colSpan={colSpan} className="p-0">
                <Collapse open={open}>
                    <div className="px-5 py-5">
                        <TechnicianMetricsPanel stats={stats} />
                    </div>
                </Collapse>
            </td>
        </tr>
    );
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

// Verimlilik skoru bandı: düşük / orta / yüksek
const efficiencyTone = (value) => {
    if (value >= 70) return { bar: 'bg-[#1e7e34]', text: 'text-[#1e7e34]' };
    if (value >= 40) return { bar: 'bg-[#0071e3]', text: 'text-[#0071e3]' };
    return { bar: 'bg-[#b25e00]', text: 'text-[#b25e00]' };
};

const TechnicianPerformance = () => {
    const { repairs, technicians } = useAppContext();
    // Adına tıklanan teknisyenin verileri kendi satırının altında açılır
    const [openTech, setOpenTech] = useState(null);

    const rows = useMemo(
        () => (technicians || []).map(tech => ({ tech, stats: getTechnicianStats(repairs, tech.name) })),
        [technicians, repairs]
    );

    const summary = useMemo(() => {
        const completed = (repairs || []).filter(isCompletedRepair).length;
        const active = (repairs || []).filter(r => r.status?.includes('İşlem') || r.status === 'Onarımda').length;

        // Günlük ortalama: teknisyenlerin kendi çalışma günleri üzerinden ortalama
        const dailyRates = rows.map(r => r.stats.perActiveDay).filter(value => value != null);
        const teamDaily = dailyRates.length
            ? dailyRates.reduce((total, value) => total + value, 0) / dailyRates.length
            : null;

        return {
            completed,
            active,
            avgDuration: getTeamAverageDuration(repairs),
            teamDaily
        };
    }, [repairs, rows]);

    const columnCount = 8;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Ekip özeti */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    icon={CheckCircle}
                    label="Biten Onarım"
                    value={summary.completed}
                    hint="Tüm zamanlar"
                    tone="text-[#1e7e34] bg-[#e6f4ea]"
                />
                <StatCard
                    icon={Activity}
                    label="Aktif Onarım"
                    value={summary.active}
                    hint="Atölyede devam eden"
                    tone="text-[#b25e00] bg-[#fff4e5]"
                />
                <StatCard
                    icon={Clock}
                    label="Ekip Ort. Tamamlama"
                    value={formatDuration(summary.avgDuration)}
                    hint="Ölçülebilen kayıtlar"
                    tone="text-[#0071e3] bg-[#e8f2ff]"
                />
                <StatCard
                    icon={CalendarRange}
                    label="Kişi Başı Günlük Cihaz"
                    value={summary.teamDaily != null ? summary.teamDaily.toFixed(1) : '—'}
                    hint="Çalışılan günlerin ortalaması"
                />
            </div>

            {/* Teknisyen tablosu */}
            <section aria-labelledby="tech-performance-title" className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100">
                    <h2 id="tech-performance-title" className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
                        Teknisyen Verimlilik Raporu
                    </h2>
                    <p className="text-[12px] font-medium text-gray-500 mt-0.5">
                        Teknisyen adına tıklayın; tüm veriler kendi satırının altında açılır.
                    </p>
                </div>

                {rows.length === 0 ? (
                    <div className="py-14 text-center">
                        <Users size={36} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
                        <h3 className="text-[15px] font-semibold text-[#1d1d1f]">Tanımlı teknisyen yok</h3>
                        <p className="text-[13px] text-gray-500 mt-1">Personel ekledikçe performans verileri burada birikir.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <caption className="sr-only">
                                Teknisyen bazında ortalama tamamlama süresi, günlük cihaz sayısı, iş yükü, müşteri puanı ve verimlilik skoru
                            </caption>
                            <thead>
                                <tr className="bg-[#f5f5f7]/70 border-b border-gray-100">
                                    <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Teknisyen</th>
                                    <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ort. Tamamlama</th>
                                    <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Günlük Ort. Cihaz</th>
                                    <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Biten İş</th>
                                    <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Aktif Yük</th>
                                    <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Müşteri Puanı</th>
                                    <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Verimlilik</th>
                                    <th scope="col" className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rows.map(({ tech, stats }) => {
                                    const techKey = tech._id || tech.id || tech.name;
                                    const isOpen = openTech === techKey;
                                    const isBusy = tech.status === 'busy' || !!tech.currentJob;
                                    const tone = stats.efficiency != null ? efficiencyTone(stats.efficiency) : null;

                                    return (
                                        <React.Fragment key={techKey}>
                                            <tr className={`transition-colors ${isOpen ? 'bg-[#0071e3]/5' : 'hover:bg-[#f5f5f7]/60'}`}>
                                                <td className="px-5 py-3.5 align-middle">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenTech(isOpen ? null : techKey)}
                                                        aria-expanded={isOpen}
                                                        aria-controls={`tech-row-metrics-${techKey}`}
                                                        className="group flex items-center gap-3 text-left rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                                    >
                                                        <span aria-hidden="true" className="w-10 h-10 bg-[#f5f5f7] border border-gray-200 text-[#1d1d1f] rounded-xl flex items-center justify-center text-lg shrink-0">
                                                            {tech.avatar || (tech.name || '?').substring(0, 1)}
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
                                                                {tech.name}
                                                                <ChevronRight
                                                                    size={14}
                                                                    aria-hidden="true"
                                                                    className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-90 text-[#0071e3]' : ''}`}
                                                                />
                                                            </span>
                                                            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                                {tech.specialty || 'Genel'}
                                                            </span>
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-5 py-3.5 align-middle">
                                                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1d1d1f] tabular-nums">
                                                        <Clock size={14} className="text-gray-400" aria-hidden="true" />
                                                        {formatDuration(stats.avgDurationMinutes)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 align-middle">
                                                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1d1d1f] tabular-nums">
                                                        <CalendarRange size={14} className="text-gray-400" aria-hidden="true" />
                                                        {stats.perActiveDay != null ? stats.perActiveDay.toFixed(1) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 align-middle text-[13px] font-semibold text-[#1d1d1f] tabular-nums">
                                                    {stats.completed}
                                                </td>
                                                <td className="px-5 py-3.5 align-middle">
                                                    <span className={`inline-block text-[11px] font-bold tabular-nums px-2.5 py-1 rounded-full border ${stats.active > 0
                                                        ? 'bg-[#fff4e5] text-[#b25e00] border-[#b25e00]/15'
                                                        : 'bg-[#f5f5f7] text-gray-500 border-gray-200'}`}>
                                                        {stats.active}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 align-middle">
                                                    {stats.avgScore != null ? (
                                                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1d1d1f] tabular-nums">
                                                            <Award size={14} className="text-[#ff9500] fill-[#ff9500]" aria-hidden="true" />
                                                            {stats.avgScore.toFixed(1)}
                                                            <span className="text-[11px] font-medium text-gray-400">/ 5</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-[13px] font-semibold text-gray-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 align-middle">
                                                    {stats.efficiency != null ? (
                                                        <div className="flex items-center gap-2.5">
                                                            <div
                                                                role="progressbar"
                                                                aria-valuenow={stats.efficiency}
                                                                aria-valuemin={0}
                                                                aria-valuemax={100}
                                                                aria-label={`${tech.name} verimlilik skoru`}
                                                                className="h-1.5 w-16 bg-[#f5f5f7] border border-gray-200 rounded-full overflow-hidden shrink-0"
                                                            >
                                                                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${stats.efficiency}%` }} />
                                                            </div>
                                                            <span className={`text-[12px] font-bold tabular-nums ${tone.text}`}>%{stats.efficiency}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[13px] font-semibold text-gray-300">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 align-middle text-right">
                                                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${isBusy
                                                        ? 'bg-[#fff4e5] text-[#b25e00] border-[#b25e00]/15'
                                                        : tech.status === 'offline'
                                                            ? 'bg-gray-50 text-gray-500 border-gray-200'
                                                            : 'bg-[#e6f4ea] text-[#1e7e34] border-[#1e7e34]/15'}`}>
                                                        {isBusy ? 'Meşgul' : tech.status === 'offline' ? 'Çevrimdışı' : 'Müsait'}
                                                    </span>
                                                </td>
                                            </tr>

                                            <TechnicianMetricsRow
                                                open={isOpen}
                                                id={`tech-row-metrics-${techKey}`}
                                                colSpan={columnCount}
                                                stats={stats}
                                            />
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default TechnicianPerformance;
