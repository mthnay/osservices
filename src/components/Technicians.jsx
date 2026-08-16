import React, { useState, useMemo } from 'react';
import { Users, Wrench, Clock, CheckCircle, Play, Search, Filter, Eye, Plus, X, UserPlus, Trash2, ShieldCheck, Mail, Award, Edit3, Activity, RotateCcw, Save, Pause, Box, FileText, ChevronRight, Zap, AlertCircle, Camera, ArrowRight, Phone } from 'lucide-react';
import TechnicianWorkspace from './TechnicianWorkspace';
import MyPhoneIcon from './LocalIcons';
import RepairHistoryModal from './RepairHistoryModal';
import TechnicianPerformance from './TechnicianPerformance';
import TechnicianMetricsPanel from './TechnicianMetricsPanel';
import Collapse from './ui/Collapse';
import { getTechnicianStats, formatDuration } from '../utils/technicianStats';
import { useAppContext } from '../context/AppContext';
import { hasPermission } from '../utils/permissions';
// eslint-disable-next-line no-unused-vars
import { appConfirm, appAlert } from '../utils/alert';

const Technicians = () => {
    // eslint-disable-next-line no-unused-vars
    const { repairs, technicians, assignTechnician, currentUser, addTechnician, removeTechnician, updateTechnician, showToast, servicePoints, updateRepair, completeJob, inventory, updateInventoryItem, usePart, sendWhatsApp, uploadMedia } = useAppContext();

    // İşlem yetkisi: teknisyen kadrosunu değiştirme (görüntüleme herkese açık)
    const canManageTech = hasPermission(currentUser, 'manage_technicians');
    const [activeRepairId, setActiveRepairId] = useState(null);
    const [selectedHistoryRepair, setSelectedHistoryRepair] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [filter, setFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('pool'); // 'pool' or 'stats'
    // Adına tıklanan teknisyenin metrikleri kendi kartının içinde açılır
    const [openMetricsFor, setOpenMetricsFor] = useState(null);

    // Her teknisyenin performans özeti (isim -> istatistik)
    const statsByTech = useMemo(() => {
        const map = new Map();
        (technicians || []).forEach(tech => map.set(tech.name, getTechnicianStats(repairs, tech.name)));
        return map;
    }, [technicians, repairs]);


    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTech, setEditingTech] = useState(null);
    
    // Form State
    const [newTech, setNewTech] = useState({
        name: '',
        specialty: 'iPhone',
        email: '',
        phone: '',
        avatar: '👨‍🔧',
        storeId: currentUser?.storeId || '1'
    });


    // Filter Logic
    const filteredRepairs = repairs.filter(r => {
        const s = r.status?.toLowerCase() || '';
        const matchesSearch = (r.device || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (r.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;
        
        if (filter === 'pending') return s.includes('bekliyor') || s === 'pending';
        if (filter === 'in-progress') return s.includes('işlem') || s.includes('görev');
        if (filter === 'completed') return s.includes('tamam') || s.includes('teslim');
        return true;
    });

    const handleAddOrUpdate = async () => {
        if (!newTech.name || !newTech.email) {
            showToast('Lütfen isim ve e-posta alanlarını doldurun.', 'warning');
            return;
        }

        if (editingTech) {
            await updateTechnician(editingTech.id, newTech);
            showToast('Teknisyen bilgileri güncellendi.', 'success');
        } else {
            const id = 'T' + Math.floor(Math.random() * 1000);
            await addTechnician({ ...newTech, id, status: 'available', currentJob: null });
            showToast('Yeni teknisyen başarıyla eklendi.', 'success');
        }

        setShowAddModal(false);
        setEditingTech(null);
        setNewTech({ name: '', specialty: 'iPhone', email: '', phone: '', avatar: '👨‍🔧', storeId: currentUser?.storeId || '1' });
    };

    const handleDelete = async (tech) => {
        const confirmed = await appConfirm(`<strong>${tech.name}</strong> adlı teknisyeni sistemden silmek istediğinize emin misiniz?`);
        if (confirmed) {
            await removeTechnician(tech._id || tech.id);
            showToast('Teknisyen silindi.', 'info');
        }
    };

    const handleStartJob = (repairId) => {
        // Artık atama yapmadan doğrudan workspace'e yolluyoruz, teknisyen içeriden kendini seçecek
        setActiveRepairId(repairId);
    };

    return (
        <div className="page-scroll space-y-6 animate-fade-in pr-1">
            {/* Contextual Modals */}
            {activeRepairId && <TechnicianWorkspace repairId={activeRepairId} onClose={() => setActiveRepairId(null)} />}
            {selectedHistoryRepair && <RepairHistoryModal repair={selectedHistoryRepair} onClose={() => setSelectedHistoryRepair(null)} />}

            {/* Header Area */}
            {/* Header - Ana Sayfa Stili */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-md text-indigo-600 border border-indigo-100 shadow-sm">
                        <Users size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Teknik Ekip</h2>
                        <p className="text-gray-500 mt-1 font-medium">Ekip performansını yönetin ve iş havuzunu izleyin.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100/50 p-1 rounded-md border border-gray-200 shadow-inner">
                        <button 
                            onClick={() => setViewMode('pool')}
                            className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'pool' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            HAVUZ
                        </button>
                        <button 
                            onClick={() => setViewMode('stats')}
                            className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'stats' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            PERFORMANS
                        </button>
                    </div>

                    {canManageTech && (
                        <button
                            onClick={() => {
                                setEditingTech(null);
                                setNewTech({ name: '', specialty: 'iPhone', email: '', phone: '', avatar: '👨‍🔧', storeId: currentUser?.storeId || '1' });
                                setShowAddModal(true);
                            }}
                            className="h-10 px-4 bg-gray-900 text-white rounded-md text-[11px] font-bold uppercase tracking-wider hover:bg-black transition-all flex items-center gap-2 shadow-md active:scale-95"
                        >
                            <Plus size={16} /> PERSONEL EKLE
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'pool' ? (
                <>
                    {/* Technicians Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {technicians.map(tech => {
                            const activeRepair = repairs.find(r => r.id === tech.currentJob);
                            const steps = activeRepair?.steps || [];
                            const completedSteps = steps.filter(s => s.checked).length;
                            const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;
                            const isBusy = tech.status === 'busy' || tech.currentJob;
                            const techKey = tech._id || tech.id;
                            const stats = statsByTech.get(tech.name);
                            const metricsOpen = openMetricsFor === techKey;

                            return (
                                <div key={techKey} className={`group relative bg-white rounded-lg p-6 border shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col ${metricsOpen ? 'border-[#0071e3]/40 md:col-span-2' : 'border-gray-100 hover:-translate-y-1'}`}>
                                    {/* Workload Badge */}
                                    <div className="absolute top-6 left-1/2 -translate-x-1/2 translate-y-[-50%] z-20 group-hover:translate-y-0 transition-transform">
                                        <div className="bg-indigo-600 text-white text-[10px] font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap">
                                            {/* Kartın alt kısmındaki "Açık İş" metriğiyle aynı hesap */}
                                            <Activity size={10} strokeWidth={3} /> {stats?.active ?? 0} AKTİF İŞ
                                        </div>
                                    </div>
                                    {/* Düzenleme/silme yalnızca yetkili kullanıcıya */}
                                    {canManageTech && (
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => {
                                                    setEditingTech(tech);
                                                    setNewTech({ ...tech });
                                                    setShowAddModal(true);
                                                }}
                                                className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(tech)}
                                                className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="relative">
                                            <div className="w-16 h-16 bg-gray-50 rounded-md flex items-center justify-center text-3xl shadow-sm border border-gray-100">
                                                {tech.avatar || '👨‍🔧'}
                                            </div>
                                            <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${isBusy ? 'bg-orange-500' : tech.status === 'available' ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                        </div>
                                        <div className="min-w-0">
                                            {/* İsme tıklanınca performans verileri bu kartın içinde açılır */}
                                            <button
                                                type="button"
                                                onClick={() => setOpenMetricsFor(metricsOpen ? null : techKey)}
                                                aria-expanded={metricsOpen}
                                                aria-controls={`tech-metrics-${techKey}`}
                                                className="group/name text-left outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 rounded-lg"
                                            >
                                                <h3 className="font-semibold text-gray-900 truncate leading-tight group-hover/name:text-[#0071e3] transition-colors flex items-center gap-1.5">
                                                    {tech.name}
                                                    <ChevronRight
                                                        size={14}
                                                        aria-hidden="true"
                                                        className={`text-gray-400 shrink-0 transition-transform ${metricsOpen ? 'rotate-90 text-[#0071e3]' : ''}`}
                                                    />
                                                </h3>
                                                <span className="text-[10px] font-semibold uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                                                    <Award size={10} /> {tech.specialty || 'Genel'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Teknisyenin kendi performans alanı */}
                                    {stats && (
                                        <Collapse open={metricsOpen}>
                                            <div id={`tech-metrics-${techKey}`} className="mb-6">
                                                <TechnicianMetricsPanel stats={stats} compact />
                                            </div>
                                        </Collapse>
                                    )}

                                    {/* Kapalıyken de iki temel metrik özet olarak görünür */}
                                    {stats && (
                                        <Collapse open={!metricsOpen}>
                                            <div className="grid grid-cols-2 gap-2 mb-6">
                                                <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Ort. Süre</p>
                                                    <p className="text-sm font-bold text-[#1d1d1f] mt-0.5">
                                                        {formatDuration(stats.avgDurationMinutes)}
                                                    </p>
                                                </div>
                                                <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Günlük Cihaz</p>
                                                    <p className="text-sm font-bold text-[#1d1d1f] mt-0.5">
                                                        {stats.perActiveDay != null ? stats.perActiveDay.toFixed(1) : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </Collapse>
                                    )}

                                    {tech.currentJob ? (
                                        <div className="mt-auto space-y-4">
                                            <div className="bg-orange-50/50 p-4 rounded-md border border-orange-100">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-semibold text-orange-600 text-xs uppercase tracking-wide flex items-center gap-1">
                                                        <RotateCcw size={10} className="animate-spin-slow" /> {tech.currentJob}
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-orange-700">%{progress}</span>
                                                </div>
                                                <div className="w-full bg-orange-200/30 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                                </div>
                                                <p className="text-[11px] font-bold text-gray-600 mt-2 truncate">{activeRepair?.device}</p>
                                            </div>
                                            <button 
                                                onClick={() => setActiveRepairId(tech.currentJob)}
                                                className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-md text-xs font-semibold tracking-widest uppercase transition-all flex items-center justify-center gap-2"
                                            >
                                                <Eye size={12} /> İzle
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mt-auto p-4 bg-emerald-50/50 rounded-md border border-emerald-100 border-dashed text-center">
                                            <span className="text-[10px] font-semibold text-emerald-600 text-xs uppercase tracking-wide">GÖREV BEKLİYOR</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Tasks Pool */}
                    <div className="bg-white rounded-lg shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
                        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-900 text-white rounded-md flex items-center justify-center">
                                    <Wrench size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-xl">İş Emirleri Havuzu</h3>
                                    <p className="text-xs text-gray-400 font-bold text-xs uppercase tracking-wide mt-0.5">{filteredRepairs.length} Aktif Kayıt</p>
                                </div>
                            </div>
                            <div className="relative w-full md:w-80 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-all" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="İş emri veya cihaz ara..." 
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-[20px] text-sm font-bold focus:bg-white focus:border-indigo-500 transition-all outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-[10px] font-semibold uppercase text-gray-400 tracking-[0.2em] border-b border-gray-100">
                                    <tr>
                                        <th className="px-10 py-5">Takip No</th>
                                        <th className="px-6 py-5">Cihaz / Sorun</th>
                                        <th className="px-6 py-5">Lokasyon</th>
                                        <th className="px-6 py-5">Durum</th>
                                        <th className="px-10 py-5 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredRepairs.map((repair) => (
                                        <tr key={repair._id || repair.id} onClick={() => setSelectedHistoryRepair(repair)} className="hover:bg-indigo-50/30 transition-all group cursor-pointer">
                                            <td className="px-10 py-6">
                                                <span className="font-mono text-xs font-semibold text-indigo-600 group-hover:scale-110 inline-block transition-transform">#{repair.id}</span>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-md bg-white border border-gray-100 flex items-center justify-center text-xl shadow-sm">
                                                        {repair.device?.toLowerCase().includes('iphone') ? '📱' : repair.device?.toLowerCase().includes('mac') ? '💻' : '👂'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-gray-900 text-sm truncate">{repair.device}</h4>
                                                        <p className="text-[10px] text-gray-500 font-medium truncate max-w-[200px]">{repair.issue}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                                                    {servicePoints.find(s => String(s.id) === String(repair.storeId))?.name || 'Mobil'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className={`px-3 py-1.5 rounded-md text-[10px] font-semibold tracking-widest uppercase border ${
                                                    repair.status?.includes('Tamam') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    repair.status?.includes('İşlem') ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                    'bg-orange-50 text-orange-700 border-orange-100'
                                                }`}>
                                                    {repair.status || 'Beklemede'}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => setSelectedHistoryRepair(repair)}
                                                        className="w-10 h-10 rounded-md border border-gray-200 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {!repair.status?.includes('Tamam') && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleStartJob(repair.id); }}
                                                            className="bg-gray-900 text-white px-5 py-2.5 rounded-md text-[10px] font-semibold tracking-widest uppercase hover:bg-black transition-all shadow-lg shadow-gray-200 flex items-center gap-2"
                                                        >
                                                            <Play size={10} fill="currentColor" /> Başlat
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <TechnicianPerformance />
            )}

            {/* Add/Edit Technician Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg w-full max-w-lg p-10 shadow-3xl border border-white/20 animate-scale-up">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-600 text-white rounded-md flex items-center justify-center shadow-xl shadow-indigo-200">
                                    <ShieldCheck size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-semibold text-gray-900">{editingTech ? 'Bilgileri Güncelle' : 'Personel Tanımla'}</h3>
                                    <p className="text-xs text-gray-400 font-bold text-xs uppercase tracking-wide">Sistem Güvenli Erişim Tanımı</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-md transition-all">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1">Tam İsim</label>
                                    <div className="relative">
                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input 
                                            type="text" 
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-md font-bold focus:bg-white focus:border-indigo-500 transition-all outline-none"
                                            placeholder="Ahmet Yılmaz"
                                            value={newTech.name}
                                            onChange={(e) => setNewTech({...newTech, name: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1">Uzmanlık</label>
                                    <select 
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-md font-bold focus:bg-white focus:border-indigo-500 transition-all outline-none appearance-none"
                                        value={newTech.specialty}
                                        onChange={(e) => setNewTech({...newTech, specialty: e.target.value})}
                                    >
                                        <option value="iPhone">iPhone Uzmanı</option>
                                        <option value="Mac">Mac Uzmanı</option>
                                        <option value="iPad">iPad Uzmanı</option>
                                        <option value="Anakart">Anakart Uzmanı</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1">Kurumsal E-Posta</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="email" 
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-md font-bold focus:bg-white focus:border-indigo-500 transition-all outline-none"
                                        placeholder="ahmet@apple-servis.com"
                                        value={newTech.email}
                                        onChange={(e) => setNewTech({...newTech, email: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1">Telefon</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input 
                                            type="text" 
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-md font-bold focus:bg-white focus:border-indigo-500 transition-all outline-none"
                                            placeholder="05..."
                                            value={newTech.phone}
                                            onChange={(e) => setNewTech({...newTech, phone: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1">Şube Atama</label>
                                    <select 
                                        className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-md font-bold focus:bg-white focus:border-indigo-500 transition-all outline-none"
                                        value={newTech.storeId}
                                        onChange={(e) => setNewTech({...newTech, storeId: e.target.value})}
                                    >
                                        {servicePoints.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 font-semibold text-xs uppercase tracking-wide text-[11px] text-gray-400 hover:text-gray-600 transition-all">Vazgeç</button>
                            <button 
                                onClick={handleAddOrUpdate}
                                className="flex-[2] py-4 bg-indigo-600 text-white rounded-[20px] font-semibold text-xs uppercase tracking-wide text-[11px] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 transition-all"
                            >
                                {editingTech ? 'Güncellemeleri Kaydet' : 'Sisteme Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Technicians;

