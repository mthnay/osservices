import React, { useEffect, useMemo, useState } from 'react';
import { Award, Clock, CheckCircle, TrendingUp, Activity, CalendarRange, ChevronRight, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import TechnicianMetricsPanel from './TechnicianMetricsPanel';
import Collapse from './ui/Collapse';

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
                    <div className="px-8 py-5">
                        <TechnicianMetricsPanel stats={stats} />
                    </div>
                </Collapse>
            </td>
        </tr>
    );
};
import {
    getTechnicianStats, getTeamAverageDuration, formatDuration, isCompletedRepair
} from '../utils/technicianStats';

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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-lg text-white shadow-xl shadow-indigo-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/20 rounded-md">
                            <CheckCircle size={24} aria-hidden="true" />
                        </div>
                        <TrendingUp size={20} className="text-indigo-200" aria-hidden="true" />
                    </div>
                    <div className="text-3xl font-semibold mb-1">{summary.completed}</div>
                    <div className="text-xs font-bold uppercase tracking-wide opacity-80">Toplam Biten Onarım</div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-md w-fit mb-4">
                        <Activity size={24} aria-hidden="true" />
                    </div>
                    <div className="text-3xl font-semibold text-gray-900 mb-1">{summary.active}</div>
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Aktif Onarımlar</div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-md w-fit mb-4">
                        <Clock size={24} aria-hidden="true" />
                    </div>
                    <div className="text-3xl font-semibold text-gray-900 mb-1">{formatDuration(summary.avgDuration)}</div>
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Ekip Ort. Tamamlama</div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-md w-fit mb-4">
                        <CalendarRange size={24} aria-hidden="true" />
                    </div>
                    <div className="text-3xl font-semibold text-gray-900 mb-1">
                        {summary.teamDaily != null ? summary.teamDaily.toFixed(1) : '—'}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Kişi Başı Günlük Cihaz</div>
                </div>
            </div>

            {/* Teknisyen tablosu */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-100">
                    <h3 className="text-xl font-semibold text-gray-900">Teknisyen Verimlilik Raporu</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mt-1">
                        Teknisyen adına tıklayın: tüm veriler kendi satırında açılır
                    </p>
                </div>

                {rows.length === 0 ? (
                    <div className="py-16 text-center">
                        <Users size={36} className="mx-auto text-gray-300 mb-3" aria-hidden="true" />
                        <p className="text-sm font-semibold text-gray-900">Tanımlı teknisyen yok</p>
                        <p className="text-xs text-gray-500 mt-1">Personel ekledikçe performans verileri burada birikir.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-[10px] font-semibold uppercase text-gray-500 tracking-widest border-b border-gray-100">
                                <tr>
                                    <th scope="col" className="px-8 py-5">Teknisyen</th>
                                    <th scope="col" className="px-6 py-5">Ort. Tamamlama</th>
                                    <th scope="col" className="px-6 py-5">Günlük Ort. Cihaz</th>
                                    <th scope="col" className="px-6 py-5">Biten İş</th>
                                    <th scope="col" className="px-6 py-5">Aktif Yük</th>
                                    <th scope="col" className="px-6 py-5">Müşteri Puanı</th>
                                    <th scope="col" className="px-6 py-5">Verimlilik</th>
                                    <th scope="col" className="px-8 py-5 text-right">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {rows.map(({ tech, stats }) => {
                                    const techKey = tech._id || tech.id || tech.name;
                                    const isOpen = openTech === techKey;

                                    return (
                                        <React.Fragment key={techKey}>
                                            <tr className={`transition-all ${isOpen ? 'bg-[#0071e3]/5' : 'hover:bg-gray-50/50'}`}>
                                                <td className="px-8 py-5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenTech(isOpen ? null : techKey)}
                                                        aria-expanded={isOpen}
                                                        aria-controls={`tech-row-metrics-${techKey}`}
                                                        className="group flex items-center gap-3 text-left outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 rounded-xl"
                                                    >
                                                        <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-md flex items-center justify-center font-semibold shrink-0">
                                                            {tech.avatar || (tech.name || '?').substring(0, 1)}
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="flex items-center gap-1.5 font-bold text-gray-900 group-hover:text-[#0071e3] transition-colors">
                                                                {tech.name}
                                                                <ChevronRight
                                                                    size={14}
                                                                    aria-hidden="true"
                                                                    className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90 text-[#0071e3]' : ''}`}
                                                                />
                                                            </span>
                                                            <span className="block text-[10px] text-gray-500 font-bold uppercase">{tech.specialty || 'Genel'}</span>
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                                                        <Clock size={14} className="text-gray-400" aria-hidden="true" />
                                                        {formatDuration(stats.avgDurationMinutes)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-700">
                                                        <CalendarRange size={14} className="text-gray-400" aria-hidden="true" />
                                                        {stats.perActiveDay != null ? stats.perActiveDay.toFixed(1) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 font-semibold text-gray-700">{stats.completed}</td>
                                                <td className="px-6 py-5 font-semibold text-orange-500">{stats.active}</td>
                                                <td className="px-6 py-5">
                                                    <span className="inline-flex items-center gap-1 font-bold text-yellow-500">
                                                        <Award size={14} className="fill-current" aria-hidden="true" />
                                                        {stats.avgScore != null ? stats.avgScore.toFixed(1) : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    {stats.efficiency != null ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[60px] overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${stats.efficiency > 70 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                                    style={{ width: `${stats.efficiency}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-semibold text-gray-900">%{stats.efficiency}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-wide ${tech.status === 'busy' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {tech.status === 'busy' ? 'İŞTE' : 'MÜSAİT'}
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
            </div>
        </div>
    );
};

export default TechnicianPerformance;
