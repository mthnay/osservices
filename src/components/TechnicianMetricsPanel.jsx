import React from 'react';
import { Clock, CalendarRange, Gauge, CheckCircle, Activity, Award, Info } from 'lucide-react';
import { formatDuration } from '../utils/technicianStats';

const Metric = ({ icon, label, value, hint, tone = 'text-[#0071e3] bg-[#e8f2ff]' }) => {
    const Icon = icon;
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                    <Icon size={15} aria-hidden="true" />
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-2xl font-bold text-[#1d1d1f] leading-none">{value}</p>
            {hint && <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">{hint}</p>}
        </div>
    );
};

const formatDayLabel = (isoDay) => {
    if (!isoDay) return '—';
    const date = new Date(isoDay);
    return isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Bir teknisyenin ortalama onarım tamamlama süresi ve günlük ortalama cihaz sayısı.
 * Teknisyenin kendi kartının/satırının içinde açılır.
 */
const TechnicianMetricsPanel = ({ stats, compact = false }) => {
    const hasDuration = stats.avgDurationMinutes != null;
    const hasDaily = stats.perActiveDay != null;

    return (
        <div className="space-y-3">
            <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'}`}>
                <Metric
                    icon={Clock}
                    label="Ort. Tamamlama Süresi"
                    value={hasDuration ? formatDuration(stats.avgDurationMinutes) : '—'}
                    hint={hasDuration
                        ? `${stats.measuredCount} onarımdan hesaplandı · ortanca ${formatDuration(stats.medianDurationMinutes)}`
                        : 'Başlangıç/bitiş zamanı olan tamamlanmış onarım yok'}
                />
                <Metric
                    icon={CalendarRange}
                    label="Günlük Ort. Cihaz"
                    value={hasDaily ? stats.perActiveDay.toFixed(1) : '—'}
                    tone="text-[#1e7e34] bg-[#e6f4ea]"
                    hint={hasDaily
                        ? `${stats.activeDays} çalışma gününde ${stats.datedCompletions} cihaz`
                        : 'Tarihi belirlenebilen tamamlanmış onarım yok'}
                />
                <Metric
                    icon={CheckCircle}
                    label="Tamamlanan"
                    value={stats.completed}
                    tone="text-gray-600 bg-gray-100"
                    hint={`Toplam ${stats.total} kayıt atanmış`}
                />
                <Metric
                    icon={Activity}
                    label="Açık İş"
                    value={stats.active}
                    tone="text-[#b25e00] bg-[#fff4e5]"
                    hint={stats.active > 0 ? 'Halen üzerinde çalışılıyor' : 'Devam eden iş yok'}
                />
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-[#f5f5f7] border border-gray-200 px-4 py-3">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-gray-600">
                    <Gauge size={13} className="text-gray-500" aria-hidden="true" />
                    En hızlı: <span className="text-[#1d1d1f]">{formatDuration(stats.fastestMinutes)}</span>
                    <span className="text-gray-400">·</span>
                    En yavaş: <span className="text-[#1d1d1f]">{formatDuration(stats.slowestMinutes)}</span>
                </span>

                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-gray-600">
                    <CalendarRange size={13} className="text-gray-500" aria-hidden="true" />
                    En yoğun gün:{' '}
                    <span className="text-[#1d1d1f]">
                        {stats.busiestDay ? `${formatDayLabel(stats.busiestDay.date)} (${stats.busiestDay.count} cihaz)` : '—'}
                    </span>
                </span>

                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-gray-600">
                    <Activity size={13} className="text-gray-500" aria-hidden="true" />
                    Son 30 gün:{' '}
                    <span className="text-[#1d1d1f]">
                        {stats.recentCompleted} cihaz
                        {stats.recentPerActiveDay != null && ` · günlük ${stats.recentPerActiveDay.toFixed(1)}`}
                    </span>
                </span>

                {stats.avgScore != null && (
                    <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-gray-600">
                        <Award size={13} className="text-[#b25e00]" aria-hidden="true" />
                        Müşteri puanı: <span className="text-[#1d1d1f]">{stats.avgScore.toFixed(1)} / 5</span>
                    </span>
                )}
            </div>

            {stats.completed > 0 && stats.measuredCount < stats.completed && (
                <p className="flex items-start gap-2 text-[11px] text-gray-500 leading-snug">
                    <Info size={13} className="shrink-0 mt-px text-gray-400" aria-hidden="true" />
                    {stats.completed - stats.measuredCount} tamamlanmış onarımda başlangıç veya bitiş zamanı bulunmadığı için
                    süre ortalamasına dahil edilmedi.
                </p>
            )}
        </div>
    );
};

export default TechnicianMetricsPanel;
