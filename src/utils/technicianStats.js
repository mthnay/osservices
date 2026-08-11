import { parseRepairDate } from './archiveFilters';

// Onarımın fiilen başladığını gösteren durumlar
const WORK_START_STATUSES = ['İşlemde', 'Onarımda'];

// Onarımın kapandığını gösteren durumlar
const WORK_DONE_STATUSES = ['Tamamlandı', 'Cihaz Hazır', 'Teslim Edildi', 'İade Hazır', 'İade Edildi'];

export const isCompletedRepair = (repair) => WORK_DONE_STATUSES.includes(repair.status);

const historyDate = (repair, statuses) => {
    const entry = (repair.history || []).find(h => statuses.includes(h.status));
    return entry ? parseRepairDate(entry.date) : null;
};

// Onarımın başlangıç anı: önce damga, yoksa geçmişteki ilk "işe başlandı" kaydı
export const getRepairStart = (repair) =>
    parseRepairDate(repair.startedAt) || historyDate(repair, WORK_START_STATUSES);

// Onarımın bitiş anı: önce damga, yoksa geçmişteki ilk kapanış kaydı
export const getRepairEnd = (repair) =>
    parseRepairDate(repair.completedAt) || historyDate(repair, WORK_DONE_STATUSES);

/**
 * Tek bir onarımın çalışma süresi (dakika).
 * Başlangıç anı bilinmiyorsa null döner; toplam servis süresiyle karıştırmamak için
 * kabul tarihine geri düşmüyoruz.
 */
export const getRepairDurationMinutes = (repair) => {
    const start = getRepairStart(repair);
    const end = getRepairEnd(repair);
    if (!start || !end) return null;

    const minutes = (end.getTime() - start.getTime()) / 60000;
    return minutes > 0 ? minutes : null;
};

export const formatDuration = (minutes) => {
    if (minutes == null) return '—';
    if (minutes < 60) return `${Math.round(minutes)} dk`;

    const hours = minutes / 60;
    if (hours < 24) {
        const wholeHours = Math.floor(hours);
        const restMinutes = Math.round(minutes - wholeHours * 60);
        return restMinutes ? `${wholeHours} sa ${restMinutes} dk` : `${wholeHours} sa`;
    }

    const days = Math.floor(hours / 24);
    const restHours = Math.round(hours - days * 24);
    return restHours ? `${days} gün ${restHours} sa` : `${days} gün`;
};

const dayKey = (date) => date.toISOString().slice(0, 10);

/**
 * Bir teknisyenin performans özeti.
 * - avgDurationMinutes: tamamlanan onarımların ortalama süresi (ölçülebilenler üzerinden)
 * - perActiveDay: çalıştığı günlerde günde ortalama kaç cihaz kapattığı
 */
export const getTechnicianStats = (repairs, techName) => {
    const own = (repairs || []).filter(r => r.technician && r.technician === techName);
    const completed = own.filter(isCompletedRepair);
    const active = own.filter(r => !isCompletedRepair(r));

    // Süre
    const durations = completed
        .map(getRepairDurationMinutes)
        .filter(minutes => minutes != null)
        .sort((a, b) => a - b);

    const avgDurationMinutes = durations.length
        ? durations.reduce((total, minutes) => total + minutes, 0) / durations.length
        : null;

    const medianDurationMinutes = durations.length
        ? durations[Math.floor(durations.length / 2)]
        : null;

    // Günlük dağılım
    const perDayCounts = new Map();
    completed.forEach(repair => {
        const end = getRepairEnd(repair);
        if (!end) return;
        const key = dayKey(end);
        perDayCounts.set(key, (perDayCounts.get(key) || 0) + 1);
    });

    const activeDays = perDayCounts.size;
    const datedCompletions = [...perDayCounts.values()].reduce((total, count) => total + count, 0);
    const perActiveDay = activeDays ? datedCompletions / activeDays : null;

    const busiestDay = [...perDayCounts.entries()]
        .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0] || null;

    // Son 30 gün
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentDays = [...perDayCounts.entries()].filter(([key]) => new Date(key).getTime() >= since);
    const recentCompleted = recentDays.reduce((total, [, count]) => total + count, 0);
    const recentPerActiveDay = recentDays.length ? recentCompleted / recentDays.length : null;

    // Müşteri puanı
    const scored = completed.filter(r => r.feedback?.score);
    const avgScore = scored.length
        ? scored.reduce((total, r) => total + r.feedback.score, 0) / scored.length
        : null;

    // Verimlilik: hız + müşteri puanı + tamamlama oranı.
    // Veri olmayan bileşen puana hiç katılmaz; hepsi eksikse skor üretilmez
    // (eskiden eksik veriler varsayılan puanla doldurulup yanıltıcı bir skor çıkıyordu).
    const parts = [];
    if (avgDurationMinutes != null) {
        const speed = Math.max(0, Math.min(1, (240 - avgDurationMinutes) / (240 - 30)));
        parts.push({ weight: 40, earned: speed * 40 });
    }
    if (avgScore != null) {
        parts.push({ weight: 30, earned: (avgScore / 5) * 30 });
    }
    if (own.length) {
        parts.push({ weight: 30, earned: (completed.length / own.length) * 30 });
    }

    const totalWeight = parts.reduce((total, part) => total + part.weight, 0);
    const efficiency = totalWeight
        ? Math.round((parts.reduce((total, part) => total + part.earned, 0) / totalWeight) * 100)
        : null;

    return {
        total: own.length,
        completed: completed.length,
        active: active.length,
        avgDurationMinutes,
        medianDurationMinutes,
        measuredCount: durations.length,
        fastestMinutes: durations[0] ?? null,
        slowestMinutes: durations[durations.length - 1] ?? null,
        perActiveDay,
        activeDays,
        datedCompletions,
        busiestDay: busiestDay ? { date: busiestDay[0], count: busiestDay[1] } : null,
        recentCompleted,
        recentPerActiveDay,
        avgScore,
        efficiency
    };
};

// Ekip geneli ortalama onarım süresi (teknisyen atanmış olsun olmasın)
export const getTeamAverageDuration = (repairs) => {
    const durations = (repairs || [])
        .filter(isCompletedRepair)
        .map(getRepairDurationMinutes)
        .filter(minutes => minutes != null);

    if (!durations.length) return null;
    return durations.reduce((total, minutes) => total + minutes, 0) / durations.length;
};
