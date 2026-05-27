import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Plus, Trash2, ClipboardList, CheckSquare, Bell, User, 
    Calendar, Check, Clock, ChevronRight, AlertCircle, MapPin, 
    Briefcase, ShieldAlert, Award, ChevronDown, ChevronLeft
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Swal from 'sweetalert2';
import { useReactToPrint } from 'react-to-print';

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
    const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
    const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
    const storeDropdownRef = useRef(null);
    const assigneeDropdownRef = useRef(null);
    const printAreaRef = useRef(null);

    // Dışarı tıklanınca dropdownları kapat
    useEffect(() => {
        const handler = (e) => {
            if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target)) {
                setStoreDropdownOpen(false);
            }
            if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target)) {
                setAssigneeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const [announcements, setAnnouncements] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
    const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedTo: '', dueDate: '' });
    const [shiftForm, setShiftForm] = useState({
        userId: '',
        userName: '',
        date: '',
        startTime: '09:00',
        endTime: '18:00',
        shiftType: 'Tam Gün',
        notes: ''
    });

    const [weekOffset, setWeekOffset] = useState(0);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null); // { employee, date }

    const formatDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const weekDates = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday + (weekOffset * 7));
        
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    }, [weekOffset]);

    const role = currentUser?.role?.toLowerCase();
    const isManagerOrAdmin = ['superadmin', 'admin', 'yonetici', 'storemanager', 'servis_sorumlusu', 'servissorumlusu'].includes(role);
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

            // Fetch Shifts
            const shiftRes = await fetch(`${API_URL}/store-shifts${storeQuery}`, { headers });
            if (shiftRes.ok) {
                const shiftData = await shiftRes.json();
                setShifts(shiftData);
            }
        } catch (error) {
            console.error('Veri çekme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStore]);

    // Store Employees List
    const storeEmployees = useMemo(() => {
        if (selectedStore === 0) return users;
        return users.filter(u => Number(u.storeId) === Number(selectedStore));
    }, [users, selectedStore]);
    // Handle Announcement Create
    const handleAddAnnouncement = async (e) => {
        e.preventDefault();
        if (!isManagerOrAdmin) {
            Swal.fire({
                icon: 'error',
                title: 'Yetki Hatası',
                text: 'Bu işlemi gerçekleştirme yetkiniz bulunmamaktadır.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

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
        if (!isManagerOrAdmin) {
            Swal.fire({
                icon: 'error',
                title: 'Yetki Hatası',
                text: 'Bu işlemi gerçekleştirme yetkiniz bulunmamaktadır.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

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
        if (!isManagerOrAdmin) {
            Swal.fire({
                icon: 'error',
                title: 'Yetki Hatası',
                text: 'Bu işlemi gerçekleştirme yetkiniz bulunmamaktadır.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

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
        if (!isManagerOrAdmin) {
            Swal.fire({
                icon: 'error',
                title: 'Yetki Hatası',
                text: 'Bu işlemi gerçekleştirme yetkiniz bulunmamaktadır.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

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

    // Handle Shift Type change to set default hours
    const handleShiftTypeChange = (type) => {
        let startTime = '09:00';
        let endTime = '18:00';
        if (type === 'Sabah') {
            startTime = '09:00';
            endTime = '15:00';
        } else if (type === 'Akşam') {
            startTime = '15:00';
            endTime = '22:00';
        } else if (type === 'Tam Gün') {
            startTime = '09:00';
            endTime = '18:00';
        } else if (type === 'İzin') {
            startTime = '00:00';
            endTime = '00:00';
        }
        setShiftForm(prev => ({ ...prev, shiftType: type, startTime, endTime }));
    };

    // Handle Shift Create
    // eslint-disable-next-line no-unused-vars
    const handleAddShift = async (e) => {
        e.preventDefault();
        if (!isManagerOrAdmin) {
            Swal.fire({
                icon: 'error',
                title: 'Yetki Hatası',
                text: 'Bu işlemi gerçekleştirme yetkiniz bulunmamaktadır.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

        if (!shiftForm.userName || !shiftForm.date || !shiftForm.startTime || !shiftForm.endTime) {
            Swal.fire({
                icon: 'warning',
                title: 'Eksik Bilgi',
                text: 'Lütfen zorunlu alanları doldurun.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

        if (selectedStore === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Mağaza Seçin',
                text: 'Lütfen vardiya eklemek için önce belirli bir mağaza seçin.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

        const matchedUser = storeEmployees.find(emp => emp.name === shiftForm.userName);
        const userId = matchedUser ? (matchedUser.id || matchedUser._id) : '';

        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${API_URL}/store-shifts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    storeId: selectedStore,
                    userId,
                    userName: shiftForm.userName,
                    date: shiftForm.date,
                    startTime: shiftForm.startTime,
                    endTime: shiftForm.endTime,
                    shiftType: shiftForm.shiftType,
                    notes: shiftForm.notes
                })
            });

            if (res.ok) {
                const newShift = await res.json();
                setShifts(prev => [newShift, ...prev]);
                setShiftForm({
                    userId: '',
                    userName: '',
                    date: '',
                    startTime: '09:00',
                    endTime: '18:00',
                    shiftType: 'Tam Gün',
                    notes: ''
                });
                Swal.fire({
                    icon: 'success',
                    title: 'Vardiya Eklendi',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                throw new Error('Vardiya eklenemedi');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Hata',
                text: error.message
            });
        }
    };

    // Handle Shift Create via Modal
    const handleModalAddShift = async (e) => {
        e.preventDefault();
        if (!isManagerOrAdmin) {
            Swal.fire({
                icon: 'error',
                title: 'Yetki Hatası',
                text: 'Bu işlemi gerçekleştirme yetkiniz bulunmamaktadır.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

        if (!selectedCell || !shiftForm.startTime || !shiftForm.endTime) return;

        try {
            const token = sessionStorage.getItem('token');
            const res = await fetch(`${API_URL}/store-shifts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    storeId: selectedStore,
                    userId: selectedCell.employee.id || selectedCell.employee._id,
                    userName: selectedCell.employee.name,
                    date: selectedCell.date,
                    startTime: shiftForm.startTime,
                    endTime: shiftForm.endTime,
                    shiftType: shiftForm.shiftType,
                    notes: shiftForm.notes
                })
            });

            if (res.ok) {
                const newShift = await res.json();
                setShifts(prev => [newShift, ...prev]);
                setIsShiftModalOpen(false);
                setSelectedCell(null);
                setShiftForm({
                    userId: '',
                    userName: '',
                    date: '',
                    startTime: '09:00',
                    endTime: '18:00',
                    shiftType: 'Tam Gün',
                    notes: ''
                });
                Swal.fire({
                    icon: 'success',
                    title: 'Vardiya Eklendi',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                throw new Error('Vardiya eklenemedi');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Hata',
                text: error.message
            });
        }
    };

    // Handle Shift Delete
    const handleDeleteShift = async (id) => {
        if (!isManagerOrAdmin) {
            Swal.fire({
                icon: 'error',
                title: 'Yetki Hatası',
                text: 'Bu işlemi gerçekleştirme yetkiniz bulunmamaktadır.',
                confirmButtonColor: '#0071e3'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Emin misiniz?',
            text: "Bu vardiya kaydı kalıcı olarak silinecektir!",
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
            const res = await fetch(`${API_URL}/store-shifts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setShifts(prev => prev.filter(s => s._id !== id));
                Swal.fire({
                    icon: 'success',
                    title: 'Silindi',
                    text: 'Vardiya başarıyla silindi.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                throw new Error('Vardiya silinemedi');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Hata',
                text: error.message
            });
        }
    };

    // Handle PDF / Print
    const storeNameForPrint = selectedStore === 0 
        ? 'Tum_Magazalar' 
        : allServicePoints.find(sp => Number(sp.id) === Number(selectedStore))?.name?.replace(/\s+/g, '_') || 'Magaza';

    const documentTitleForPrint = `Vardiya_Programi_${storeNameForPrint}_${new Date().toLocaleDateString('tr-TR')}`;

    const handleDownloadPDF = useReactToPrint({
        contentRef: printAreaRef,
        documentTitle: documentTitleForPrint,
    });

    // Stats calculations
    const stats = useMemo(() => {
        const totalAnn = announcements.length;
        const pendingT = tasks.filter(t => t.status === 'pending').length;
        const completedT = tasks.filter(t => t.status === 'completed').length;
        const totalShifts = shifts.length;
        return { totalAnn, pendingT, completedT, totalShifts };
    }, [announcements, tasks, shifts]);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 10mm;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    #shift-schedule-print-area {
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                    }
                    .pdf-action-btn {
                        display: none !important;
                    }
                    .pdf-only-header {
                        display: block !important;
                    }
                    /* Ensure colors and background-colors print correctly */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
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
                        <div className="relative" ref={storeDropdownRef}>
                            <button
                                onClick={() => setStoreDropdownOpen(prev => !prev)}
                                className="flex items-center gap-2 bg-white px-4 py-2.5 border border-gray-200 rounded-2xl shadow-sm hover:border-[#0071e3] transition-all min-w-[180px] justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-[#0071e3] flex-shrink-0" />
                                    <span className="text-sm font-semibold text-[#1d1d1f]">
                                        {selectedStore === 0
                                            ? 'Tüm Mağazalar'
                                            : allServicePoints.find(sp => Number(sp.id) === Number(selectedStore))?.name || 'Mağaza'}
                                    </span>
                                </div>
                                <ChevronDown
                                    size={14}
                                    className={`text-gray-400 transition-transform duration-200 ml-2 ${storeDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {storeDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden min-w-[200px] py-1">
                                    <button
                                        onClick={() => { setSelectedStore(0); setStoreDropdownOpen(false); }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-all text-left hover:bg-[#f5f5f7] ${
                                            selectedStore === 0 ? 'text-[#0071e3] bg-blue-50/60' : 'text-[#1d1d1f]'
                                        }`}
                                    >
                                        {selectedStore === 0 && <Check size={14} className="text-[#0071e3] flex-shrink-0" />}
                                        {selectedStore !== 0 && <span className="w-[14px] flex-shrink-0" />}
                                        Tüm Mağazalar
                                    </button>
                                    {allServicePoints.map(sp => (
                                        <button
                                            key={sp.id}
                                            onClick={() => { setSelectedStore(Number(sp.id)); setStoreDropdownOpen(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-all text-left hover:bg-[#f5f5f7] ${
                                                Number(selectedStore) === Number(sp.id) ? 'text-[#0071e3] bg-blue-50/60' : 'text-[#1d1d1f]'
                                            }`}
                                        >
                                            {Number(selectedStore) === Number(sp.id) && <Check size={14} className="text-[#0071e3] flex-shrink-0" />}
                                            {Number(selectedStore) !== Number(sp.id) && <span className="w-[14px] flex-shrink-0" />}
                                            {sp.name}
                                        </button>
                                    ))}
                                </div>
                            )}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

                <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm flex items-center justify-between relative overflow-hidden group">
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Planlı Vardiyalar</p>
                        <p className="text-3xl font-black text-indigo-600">{stats.totalShifts}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                        <Calendar size={24} />
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
                        <button
                            onClick={() => setActiveTab('shifts')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                                activeTab === 'shifts' 
                                    ? 'bg-[#0071e3] text-white' 
                                    : 'text-gray-600 hover:bg-[#f5f5f7]'
                            }`}
                        >
                            <Calendar size={18} />
                            Vardiya Programı
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
                                    {emp.role?.toLowerCase()?.includes('müdür') || emp.role?.toLowerCase() === 'storemanager' || emp.role?.toLowerCase() === 'servis_sorumlusu' || emp.role?.toLowerCase()?.includes('sorumlu') ? (
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
                                                <div className="relative" ref={assigneeDropdownRef}>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Görevli Kişi (Opsiyonel)</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAssigneeDropdownOpen(prev => !prev)}
                                                        className="w-full flex items-center justify-between px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm outline-none hover:border-[#0071e3] hover:bg-white transition-all text-[#1d1d1f]"
                                                    >
                                                        <span className={taskForm.assignedTo ? 'text-[#1d1d1f] font-semibold' : 'text-gray-400'}>
                                                            {taskForm.assignedTo
                                                                ? `${storeEmployees.find(e => e.name === taskForm.assignedTo)?.name || taskForm.assignedTo} (${storeEmployees.find(e => e.name === taskForm.assignedTo)?.role || ''})`
                                                                : 'Herkes / Atanmadı'}
                                                        </span>
                                                        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${assigneeDropdownOpen ? 'rotate-180' : ''}`} />
                                                    </button>

                                                    {assigneeDropdownOpen && (
                                                        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden w-full py-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => { setTaskForm(prev => ({ ...prev, assignedTo: '' })); setAssigneeDropdownOpen(false); }}
                                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-all text-left hover:bg-[#f5f5f7] ${
                                                                    taskForm.assignedTo === '' ? 'text-[#0071e3] bg-blue-50/60' : 'text-gray-500'
                                                                }`}
                                                            >
                                                                {taskForm.assignedTo === '' && <Check size={14} className="text-[#0071e3] flex-shrink-0" />}
                                                                {taskForm.assignedTo !== '' && <span className="w-[14px] flex-shrink-0" />}
                                                                Herkes / Atanmadı
                                                            </button>
                                                            {storeEmployees.map(emp => (
                                                                <button
                                                                    type="button"
                                                                    key={emp.id || emp._id}
                                                                    onClick={() => { setTaskForm(prev => ({ ...prev, assignedTo: emp.name })); setAssigneeDropdownOpen(false); }}
                                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-all text-left hover:bg-[#f5f5f7] ${
                                                                        taskForm.assignedTo === emp.name ? 'text-[#0071e3] bg-blue-50/60' : 'text-[#1d1d1f]'
                                                                    }`}
                                                                >
                                                                    {taskForm.assignedTo === emp.name && <Check size={14} className="text-[#0071e3] flex-shrink-0" />}
                                                                    {taskForm.assignedTo !== emp.name && <span className="w-[14px] flex-shrink-0" />}
                                                                    <div className="flex flex-col">
                                                                        <span>{emp.name}</span>
                                                                        <span className="text-[10px] text-gray-400 font-normal">{emp.role}</span>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
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

                            {/* SHIFTS TAB */}
                            {activeTab === 'shifts' && (
                                <div className="space-y-6">
                                    {selectedStore === 0 ? (
                                        <div className="bg-white border border-gray-200 rounded-[32px] p-12 text-center text-gray-400">
                                            <MapPin size={48} className="mx-auto mb-4 opacity-30 text-[#0071e3]" />
                                            <p className="font-bold text-sm">Lütfen Bir Mağaza Seçin</p>
                                            <p className="text-xs mt-1 text-gray-400">Vardiya planlaması ve çizelgesi hazırlamak için lütfen üst menüden belirli bir mağaza seçin.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Week Selection & Actions */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setWeekOffset(prev => prev - 1)}
                                                        className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-all border border-gray-100 cursor-pointer"
                                                        title="Önceki Hafta"
                                                    >
                                                        <ChevronLeft size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setWeekOffset(0)}
                                                        className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-all border border-gray-100 cursor-pointer"
                                                    >
                                                        Bu Hafta
                                                    </button>
                                                    <span className="text-sm font-bold text-gray-700 min-w-[200px] text-center">
                                                        {weekDates[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - {weekDates[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <button
                                                        onClick={() => setWeekOffset(prev => prev + 1)}
                                                        className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-all border border-gray-100 cursor-pointer"
                                                        title="Sonraki Hafta"
                                                    >
                                                        <ChevronRight size={16} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={handleDownloadPDF}
                                                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                                                    >
                                                        <Calendar size={14} />
                                                        Haftalık PDF / Yazdır
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Weekly Shifts Grid / Schedule Table */}
                                            <div className="bg-white rounded-[32px] border border-gray-200 p-8 shadow-sm">
                                                <div className="mb-6">
                                                    <h3 className="font-bold text-lg text-[#1d1d1f]">Vardiya Planlama Çizelgesi</h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">Personellerin günlere göre çalışma planı. Boş hücrelerdeki "+" butonuna basarak hızlıca vardiya atayabilirsiniz.</p>
                                                </div>

                                                <div ref={printAreaRef} id="shift-schedule-print-area" className="p-4 bg-white rounded-2xl">
                                                    {/* PDF Header - visible only during PDF printing */}
                                                    <div className="pdf-only-header mb-6 border-b border-gray-200 pb-4 hidden print:block">
                                                        <h2 className="text-2xl font-bold text-gray-900">TROY YETKİLİ SERVİS</h2>
                                                        <p className="text-sm font-semibold text-gray-500">
                                                            Haftalık Vardiya Programı ({weekDates[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - {weekDates[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })})
                                                        </p>
                                                        <p className="text-sm font-medium text-gray-500">
                                                            Mağaza: {allServicePoints.find(sp => Number(sp.id) === Number(selectedStore))?.name || 'Mağaza'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-1">Oluşturulma Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
                                                    </div>

                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                                            <thead>
                                                                <tr className="border-b border-gray-200">
                                                                    <th className="py-4 px-3 text-xs font-bold text-gray-400 uppercase tracking-widest min-w-[150px]">Personel</th>
                                                                    {weekDates.map((date, idx) => (
                                                                        <th key={idx} className="py-4 px-3 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
                                                                            <div>{date.toLocaleDateString('tr-TR', { weekday: 'short' })}</div>
                                                                            <div className="text-[10px] opacity-60 font-medium">{date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</div>
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {storeEmployees.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan={8} className="py-8 text-center text-gray-400 text-sm">
                                                                            Bu mağazada tanımlı aktif personel bulunmuyor.
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    storeEmployees.map(emp => (
                                                                        <tr key={emp.id || emp._id} className="border-b border-gray-100 hover:bg-[#f5f5f7]/20 transition-colors">
                                                                            <td className="py-4 px-3">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                                                                                        {emp.name.substring(0, 2).toUpperCase()}
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs font-bold text-[#1d1d1f]">{emp.name}</p>
                                                                                        <p className="text-[10px] text-gray-400 font-medium">{emp.role}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                            {weekDates.map((date, dateIdx) => {
                                                                                const dateStr = formatDateString(date);
                                                                                const shift = shifts.find(s => {
                                                                                    const sDate = formatDateString(new Date(s.date));
                                                                                    return s.userName === emp.name && sDate === dateStr;
                                                                                });

                                                                                return (
                                                                                    <td key={dateIdx} className="py-4 px-2 text-center align-middle">
                                                                                        {shift ? (
                                                                                            <div className="group relative mx-auto max-w-[120px] bg-white border border-gray-100 rounded-xl p-2.5 shadow-sm hover:shadow transition-all text-left">
                                                                                                <div className="flex justify-between items-start gap-1">
                                                                                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                                                                                        shift.shiftType === 'Sabah' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                                                                        shift.shiftType === 'Akşam' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                                                                        shift.shiftType === 'İzin' ? 'bg-red-50 text-red-700 border border-red-100' :
                                                                                                        'bg-green-50 text-green-700 border border-green-100'
                                                                                                    }`}>
                                                                                                        {shift.shiftType}
                                                                                                    </span>
                                                                                                    {isManagerOrAdmin && (
                                                                                                        <button
                                                                                                            onClick={() => handleDeleteShift(shift._id)}
                                                                                                            className="pdf-action-btn w-4 h-4 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                                                                            title="Sil"
                                                                                                        >
                                                                                                            <Trash2 size={10} />
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                                {shift.shiftType !== 'İzin' && (
                                                                                                    <div className="text-[10px] font-mono font-bold text-gray-700 mt-1.5">
                                                                                                        {shift.startTime} - {shift.endTime}
                                                                                                    </div>
                                                                                                )}
                                                                                                {shift.notes && (
                                                                                                    <div className="text-[9px] text-gray-400 mt-1 truncate" title={shift.notes}>
                                                                                                        {shift.notes}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : (
                                                                                            isManagerOrAdmin ? (
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setSelectedCell({ employee: emp, date: dateStr });
                                                                                                        setIsShiftModalOpen(true);
                                                                                                    }}
                                                                                                    className="pdf-action-btn mx-auto w-8 h-8 rounded-xl border border-dashed border-gray-200 text-gray-400 hover:text-[#0071e3] hover:border-[#0071e3] hover:bg-blue-50/30 flex items-center justify-center transition-all cursor-pointer"
                                                                                                    title="Vardiya Ekle"
                                                                                                >
                                                                                                    <Plus size={14} />
                                                                                                </button>
                                                                                            ) : (
                                                                                                <span className="text-gray-300 text-xs font-medium">-</span>
                                                                                            )
                                                                                        )}
                                                                                    </td>
                                                                                );
                                                                            })}
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* SHIFT PLANNING MODAL */}
                            {isShiftModalOpen && selectedCell && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] animate-in fade-in">
                                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 mx-4">
                                        <h3 className="font-bold text-lg text-[#1d1d1f] mb-2 flex items-center gap-2">
                                            <Calendar size={20} className="text-[#0071e3]" />
                                            Vardiya Planla
                                        </h3>
                                        <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                                            <strong>Personel:</strong> {selectedCell.employee.name} <br/>
                                            <strong>Tarih:</strong> {new Date(selectedCell.date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                        <form onSubmit={handleModalAddShift} className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Vardiya Türü</label>
                                                <select
                                                    value={shiftForm.shiftType}
                                                    onChange={(e) => handleShiftTypeChange(e.target.value)}
                                                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm outline-none focus:border-[#0071e3] focus:bg-white transition-all text-[#1d1d1f]"
                                                    required
                                                >
                                                    <option value="Tam Gün">Tam Gün (09:00 - 18:00)</option>
                                                    <option value="Sabah">Sabah (09:00 - 15:00)</option>
                                                    <option value="Akşam">Akşam (15:00 - 22:00)</option>
                                                    <option value="İzin">İzinli (Tüm Gün)</option>
                                                    <option value="Diğer">Diğer (Manuel Saat)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Başlangıç Saati</label>
                                                <input 
                                                    type="time" 
                                                    value={shiftForm.startTime}
                                                    onChange={(e) => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                                                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm outline-none focus:border-[#0071e3] focus:bg-white transition-all text-[#1d1d1f]"
                                                    disabled={shiftForm.shiftType === 'İzin'}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Bitiş Saati</label>
                                                <input 
                                                    type="time" 
                                                    value={shiftForm.endTime}
                                                    onChange={(e) => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                                                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm outline-none focus:border-[#0071e3] focus:bg-white transition-all text-[#1d1d1f]"
                                                    disabled={shiftForm.shiftType === 'İzin'}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Not / Açıklama</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Özel not veya açıklama..."
                                                    value={shiftForm.notes}
                                                    onChange={(e) => setShiftForm(prev => ({ ...prev, notes: e.target.value }))}
                                                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-sm outline-none focus:border-[#0071e3] focus:bg-white transition-all text-[#1d1d1f]"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4">
                                                <button 
                                                    type="button" 
                                                    onClick={() => { setIsShiftModalOpen(false); setSelectedCell(null); }}
                                                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                                >
                                                    İptal
                                                </button>
                                                <button 
                                                    type="submit" 
                                                    className="px-6 py-2.5 bg-[#0071e3] text-white rounded-xl text-xs font-semibold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                                                >
                                                    <Plus size={16} />
                                                    Kaydet
                                                </button>
                                            </div>
                                        </form>
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
