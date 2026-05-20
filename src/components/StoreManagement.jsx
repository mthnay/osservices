import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Trash2, ClipboardList, CheckSquare, Bell, User, 
    Calendar, Check, Clock, ChevronRight, AlertCircle, MapPin, 
    Briefcase, ShieldAlert, Award
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Swal from 'sweetalert2';

const StoreManagement = () => {
    const { 
        currentUser, 
        allServicePoints, 
        users, 
        API_URL 
    } = useAppContext();

    const [activeTab, setActiveTab] = useState('announcements'); // 'announcements' or 'tasks'
    const [selectedStore, setSelectedStore] = useState(() => {
        // Global admins can see all, but let's default to their own store or first store
        const role = currentUser?.role?.toLowerCase();
        const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(role);
        return isGlobalAdmin ? 0 : (currentUser?.storeId || 1);
    });

    const [announcements, setAnnouncements] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
    const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', dueDate: '' });

    const role = currentUser?.role?.toLowerCase();
    const isManagerOrAdmin = ['superadmin', 'admin', 'yonetici', 'storemanager'].includes(role);
    const isGlobalAdmin = ['superadmin', 'admin', 'yonetici'].includes(role);

    // Fetch data
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // Determine store query parameter (0 means all stores)
            const storeQuery = selectedStore !== 0 ? `?storeId=${selectedStore}` : '';

            // Fetch Announcements
            const annRes = await fetch(`${API_URL}/store-announcements${storeQuery}`, { headers });
            if (annRes.ok) {
                const annData = await annRes.json();
                setAnnouncements(annData);
            }

            // Fetch Tasks
            const taskRes = await fetch(`${API_URL}/store-tasks${storeQuery}`, { headers });
            if (taskRes.ok) {
                const taskData = await taskRes.json();
                setTasks(taskData);
            }
        } catch (error) {
            console.error('Veri çekme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedStore]);

    // Store Employees List
    const storeEmployees = useMemo(() => {
        if (selectedStore === 0) return users;
        return users.filter(u => Number(u.storeId) === Number(selectedStore));
    }, [users, selectedStore]);

    // Handle Announcement Create
    const handleAddAnnouncement = async (e) => {
        e.preventDefault();
        if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;

        if (selectedStore === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Mağaza Seçin',
                text: 'Lütfen duyuru eklemek için önce belirli bir mağaza seçin.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${API_URL}/store-announcements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    storeId: selectedStore,
                    title: announcementForm.title,
                    content: announcementForm.content,
                    author: currentUser.name
                })
            });

            if (res.ok) {
                const newAnn = await res.json();
                setAnnouncements(prev => [newAnn, ...prev]);
                setAnnouncementForm({ title: '', content: '' });
                Swal.fire({
                    icon: 'success',
                    title: 'Duyuru Yayınlandı',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                throw new Error('Duyuru eklenemedi');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Hata',
                text: error.message
            });
        }
    };

    // Handle Announcement Delete
    const handleDeleteAnnouncement = async (id) => {
        const result = await Swal.fire({
            title: 'Emin misiniz?',
            text: "Bu duyuru kalıcı olarak silinecektir!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Evet, Sil',
            cancelButtonText: 'İptal'
        });

        if (!result.isConfirmed) return;

        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${API_URL}/store-announcements/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setAnnouncements(prev => prev.filter(a => a._id !== id));
                Swal.fire({
                    icon: 'success',
                    title: 'Silindi',
                    text: 'Duyuru başarıyla silindi.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                throw new Error('Silme işlemi başarısız');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Hata',
                text: error.message
            });
        }
    };

    // Handle Task Create
    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!taskForm.title.trim()) return;

        if (selectedStore === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Mağaza Seçin',
                text: 'Lütfen görev eklemek için önce belirli bir mağaza seçin.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${API_URL}/store-tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    storeId: selectedStore,
                    title: taskForm.title,
                    description: taskForm.description,
                    assignedTo: taskForm.assignedTo,
                    dueDate: taskForm.dueDate || undefined
                })
            });

            if (res.ok) {
                const newTask = await res.json();
                setTasks(prev => [newTask, ...prev]);
                setTaskForm({ title: '', description: '', assignedTo: '', dueDate: '' });
                Swal.fire({
                    icon: 'success',
                    title: 'Görev Atandı',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                throw new Error('Görev eklenemedi');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Hata',
                text: error.message
            });
        }
    };

    // Handle Task Toggle Status (Complete / Uncomplete)
    const handleToggleTaskStatus = async (task) => {
        if (!isManagerOrAdmin) {
            Swal.fire({
                icon: 'error',
                title: 'Yetki Hatası',
                text: 'Görev durumunu değiştirme yetkiniz bulunmamaktadır.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        const completedBy = newStatus === 'completed' ? currentUser.name : '';

        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${API_URL}/store-tasks/${task._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: newStatus,
                    completedBy
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setTasks(prev => prev.map(t => t._id === task._id ? updated : t));
            } else {
                throw new Error('Görev güncellenemedi');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Hata',
                text: error.message
            });
        }
    };

    // Handle Task Delete
    const handleDeleteTask = async (id) => {
        const result = await Swal.fire({
            title: 'Emin misiniz?',
            text: "Bu görev kalıcı olarak silinecektir!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Evet, Sil',
            cancelButtonText: 'İptal'
        });

        if (!result.isConfirmed) return;

        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${API_URL}/store-tasks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setTasks(prev => prev.filter(t => t._id !== id));
                Swal.fire({
                    icon: 'success',
                    title: 'Silindi',
                    text: 'Görev başarıyla silindi.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                throw new Error('Görev silinemedi');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Hata',
                text: error.message
            });
        }
    };

    // Stats calculations
    const stats = useMemo(() => {
        const totalAnn = announcements.length;
        const pendingT = tasks.filter(t => t.status === 'pending').length;
        const completedT = tasks.filter(t => t.status === 'completed').length;
        return { totalAnn, pendingT, completedT };
    }, [announcements, tasks]);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        <span>Yönetim</span>
                        <ChevronRight size={10} />
                        <span className="text-[#0071e3]">Mağaza İçi Yönetim</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Mağaza İçi Yönetim</h1>
                    <p className="text-sm text-gray-500 mt-1">Mağaza operasyonları, duyurular ve günlük kontrol listeleri.</p>
                </div>

                {/* Store Selection Dropdown for Global Admins */}
                <div className="flex items-center gap-3">
                    {isGlobalAdmin ? (
                        <div className="flex items-center gap-2 bg-white px-4 py-2 border border-gray-200 rounded-2xl shadow-sm">
                            <MapPin size={16} className="text-[#0071e3]" />
                            <select 
                                value={selectedStore} 
                                onChange={(e) => setSelectedStore(Number(e.target.value))}
                                className="text-sm font-semibold text-[#1d1d1f] bg-transparent border-none outline-none cursor-pointer"
                            >
                                <option value={0}>Tüm Mağazalar</option>
                                {allServicePoints.map(sp => (
                                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 bg-[#f5f5f7] px-4 py-2 rounded-2xl">
                            <MapPin size={16} className="text-gray-500" />
                            <span className="text-sm font-semibold text-gray-600">
                                {allServicePoints.find(sp => Number(sp.id) === Number(currentUser?.storeId))?.name || 'Mağazam'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Aktif Duyurular</p>
                        <p className="text-3xl font-black text-[#1d1d1f]">{stats.totalAnn}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                        <Bell size={24} />
                    </div>
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bekleyen Görevler</p>
                        <p className="text-3xl font-black text-[#1d1d1f]">{stats.pendingT}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                </div>

                <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tamamlanan Görevler</p>
                        <p className="text-3xl font-black text-green-600">{stats.completedT}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-500 flex items-center justify-center">
                        <CheckSquare size={24} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Column: Side Navigation & Staff Panel */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Tab Navigation */}
                    <div className="bg-white rounded-[28px] border border-gray-200 p-3 space-y-1 shadow-sm">
                        <button
                            onClick={() => setActiveTab('announcements')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                                activeTab === 'announcements' 
                                    ? 'bg-[#0071e3] text-white' 
                                    : 'text-gray-600 hover:bg-[#f5f5f7]'
                            }`}
                        >
                            <Bell size={18} />
                            Duyurular & Kılavuzlar
                        </button>
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                                activeTab === 'tasks' 
                                    ? 'bg-[#0071e3] text-white' 
                                    : 'text-gray-600 hover:bg-[#f5f5f7]'
                            }`}
                        >
                            <ClipboardList size={18} />
                            Günlük Görevler
                        </button>
                    </div>

                    {/* Staff List Panel */}
                    <div className="bg-white rounded-[28px] border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-[#1d1d1f] text-sm">Mağaza Personeli</h4>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold">
                                {storeEmployees.length} Aktif
                            </span>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {storeEmployees.map(emp => (
                                <div key={emp.id || emp._id} className="flex items-center gap-3 p-2 hover:bg-[#f5f5f7] rounded-xl transition-all">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                                        {emp.avatar || (emp.name ? emp.name.substring(0, 2).toUpperCase() : 'PE')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-[#1d1d1f] truncate">{emp.name}</p>
                                        <p className="text-[10px] text-gray-400 font-medium truncate">{emp.role}</p>
                                    </div>
                                    {emp.role?.toLowerCase()?.includes('müdür') || emp.role?.toLowerCase() === 'storemanager' ? (
                                        <Award size={14} className="text-amber-500 flex-shrink-0" />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Tab Content */}
                <div className="lg:col-span-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-[32px]">
                            <div className="w-10 h-10 border-4 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">Veriler Yükleniyor...</span>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* ANNOUNCEMENTS TAB */}
                            {activeTab === 'announcements' && (
                                <div className="space-y-6">
                                    {/* Create Announcement Form */}
                                    {isManagerOrAdmin && selectedStore !== 0 && (
                                        <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm">
                                            <h3 className="font-bold text-lg text-[#1d1d1f] mb-4 flex items-center gap-2">
                                                <Bell size={20} className="text-[#0071e3]" />
                                                Yeni Duyuru Yayınla
                                            </h3>
                                            <form onSubmit={handleAddAnnouncement} className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Başlık</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Duyuru başlığını girin..." 
                                                        value={announcementForm.title}
                                                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm outline-none focus:border-[#0071e3] focus:bg-white transition-all text-[#1d1d1f]"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">İçerik</label>
                                                    <textarea 
                                                        placeholder="Personel için önemli duyuru içeriğini buraya yazın..." 
                                                        rows={4}
                                                        value={announcementForm.content}
                                                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm outline-none focus:border-[#0071e3] focus:bg-white transition-all text-[#1d1d1f]"
                                                        required
                                                    ></textarea>
                                                </div>
                                                <div className="flex justify-end">
                                                    <button type="submit" className="px-6 py-2.5 bg-[#0071e3] text-white rounded-xl text-xs font-semibold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm">
                                                        <Plus size={16} />
                                                        Yayınla
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Announcements List */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-lg text-[#1d1d1f] flex items-center justify-between">
                                            <span>Duyurular</span>
                                            <span className="text-xs font-normal text-gray-400">En son yayınlanana göre sıralı</span>
                                        </h3>

                                        {announcements.length === 0 ? (
                                            <div className="bg-white border border-gray-200 rounded-[32px] p-12 text-center text-gray-400">
                                                <Bell size={48} className="mx-auto mb-4 opacity-30 text-[#0071e3]" />
                                                <p className="font-bold text-sm">Kayıtlı Duyuru Bulunmuyor</p>
                                                <p className="text-xs mt-1 text-gray-400">Bu mağaza için henüz yayınlanmış bir duyuru bulunmuyor.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4">
                                                {announcements.map(ann => (
                                                    <div 
                                                        key={ann._id} 
                                                        className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                                                    >
                                                        <div className="flex items-start justify-between gap-4 mb-3">
                                                            <div>
                                                                <h4 className="font-bold text-base text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">{ann.title}</h4>
                                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                                                                    <span className="flex items-center gap-1">
                                                                        <User size={12} />
                                                                        {ann.author}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar size={12} />
                                                                        {new Date(ann.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    {selectedStore === 0 && (
                                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold">
                                                                            Mağaza: {allServicePoints.find(sp => Number(sp.id) === Number(ann.storeId))?.name || `Mağaza ${ann.storeId}`}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {isManagerOrAdmin && (
                                                                <button 
                                                                    onClick={() => handleDeleteAnnouncement(ann._id)}
                                                                    className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Sil"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{ann.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TASKS TAB */}
                            {activeTab === 'tasks' && (
                                <div className="space-y-6">
                                    {/* Create Task Form */}
                                    {isManagerOrAdmin && selectedStore !== 0 && (
                                        <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm">
                                            <h3 className="font-bold text-lg text-[#1d1d1f] mb-4 flex items-center gap-2">
                                                <ClipboardList size={20} className="text-[#0071e3]" />
                                                Yeni Görev Ata
                                            </h3>
                                            <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="md:col-span-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Görev Tanımı</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Görev başlığını girin..." 
                                                        value={taskForm.title}
                                                        onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm outline-none focus:border-[#0071e3] focus:bg-white transition-all text-[#1d1d1f]"
                                                        required
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Detaylar / Açıklama</label>
                                                    <textarea 
                                                        placeholder="Görev ile ilgili detaylı notları buraya yazın..." 
                                                        rows={2}
                                                        value={taskForm.description}
                                                        onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm outline-none focus:border-[#0071e3] focus:bg-white transition-all text-[#1d1d1f]"
                                                    ></textarea>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Görevli Kişi (Opsiyonel)</label>
                                                    <select 
                                                        value={taskForm.assignedTo}
                                                        onChange={(e) => setTaskForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm outline-none focus:border-[#0071e3] focus:bg-white transition-all text-[#1d1d1f]"
                                                    >
                                                        <option value="">Herkes / Atanmadı</option>
                                                        {storeEmployees.map(emp => (
                                                            <option key={emp.id || emp._id} value={emp.name}>{emp.name} ({emp.role})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Termin Tarihi (DueDate)</label>
                                                    <input 
                                                        type="date" 
                                                        value={taskForm.dueDate}
                                                        onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                                        className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm outline-none focus:border-[#0071e3] focus:bg-white transition-all text-[#1d1d1f]"
                                                    />
                                                </div>
                                                <div className="md:col-span-2 flex justify-end">
                                                    <button type="submit" className="px-6 py-2.5 bg-[#0071e3] text-white rounded-xl text-xs font-semibold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm">
                                                        <Plus size={16} />
                                                        Görev Ekle
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}

                                    {/* Tasks Checklist */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-lg text-[#1d1d1f] flex items-center justify-between">
                                            <span>Operasyonel Kontrol Listesi</span>
                                            <span className="text-xs font-normal text-gray-400">Günlük kontrol ve atanan iş takibi</span>
                                        </h3>

                                        {tasks.length === 0 ? (
                                            <div className="bg-white border border-gray-200 rounded-[32px] p-12 text-center text-gray-400">
                                                <ClipboardList size={48} className="mx-auto mb-4 opacity-30 text-[#0071e3]" />
                                                <p className="font-bold text-sm">Aktif Görev Bulunmuyor</p>
                                                <p className="text-xs mt-1 text-gray-400">Bu mağaza için atanmış veya tamamlanmayı bekleyen bir görev yok.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {tasks.map(task => {
                                                    const isCompleted = task.status === 'completed';
                                                    return (
                                                        <div 
                                                            key={task._id} 
                                                            className={`bg-white rounded-2xl border transition-all p-5 flex items-start gap-4 group ${
                                                                isCompleted 
                                                                    ? 'border-gray-100 bg-[#f5f5f7]/40 opacity-75' 
                                                                    : 'border-gray-200 hover:border-gray-300 shadow-sm'
                                                            }`}
                                                        >
                                                            {/* Check Circle Button */}
                                                            <button
                                                                onClick={() => handleToggleTaskStatus(task)}
                                                                className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                                                                    isCompleted 
                                                                        ? 'bg-green-500 border-green-500 text-white' 
                                                                        : 'border-gray-300 hover:border-[#0071e3] text-transparent hover:text-gray-400'
                                                                }`}
                                                                title={isCompleted ? "Tamamlanmadı Olarak İşaretle" : "Tamamlandı Olarak İşaretle"}
                                                                disabled={!isManagerOrAdmin}
                                                            >
                                                                <Check size={14} className={isCompleted ? 'stroke-[3]' : ''} />
                                                            </button>

                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                                    <span className={`font-bold text-sm text-[#1d1d1f] ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                                                                        {task.title}
                                                                    </span>
                                                                    
                                                                    {/* Badges */}
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        {task.assignedTo && (
                                                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-bold flex items-center gap-1">
                                                                                <User size={10} />
                                                                                {task.assignedTo}
                                                                            </span>
                                                                        )}

                                                                        {task.dueDate && (
                                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold flex items-center gap-1">
                                                                                <Calendar size={10} />
                                                                                Son: {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                                                                            </span>
                                                                        )}

                                                                        {isCompleted && task.completedBy && (
                                                                            <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-md text-[10px] font-bold">
                                                                                Tamamlayan: {task.completedBy}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {task.description && (
                                                                    <p className={`text-xs text-gray-500 mt-1 ${isCompleted ? 'line-through opacity-75' : ''}`}>
                                                                        {task.description}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Delete Button */}
                                                            {isManagerOrAdmin && (
                                                                <button 
                                                                    onClick={() => handleDeleteTask(task._id)}
                                                                    className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                                                                    title="Sil"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoreManagement;
