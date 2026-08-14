/* eslint-disable no-case-declarations, no-undef */
import React, { useState } from 'react';
import { Save, Bell, Shield, Store, Globe, CreditCard, MapPin, Plus, Trash2, Building, Users, UserPlus, Mail, Lock, Paperclip, Check, Upload, X, ChevronRight, Package, AlertTriangle, Key, Clock, RefreshCw, MessageSquare, Smartphone, Edit, Settings2 } from 'lucide-react';
import { appConfirm } from '../utils/alert';
import { useAppContext } from '../context/AppContext';
import Swal from 'sweetalert2';
import ConfirmationModal from './ConfirmationModal';
import MyPhoneIcon from './LocalIcons';
import { hasPermission, isSuperAdmin, isYonetici, ROLE_DISPLAY_NAMES } from '../utils/permissions';
import WarehouseManagement from './WarehouseManagement';
import KbbArchive from './KbbArchive';
import DeviceModels from './DeviceModels';
import SecurityCenter from './SecurityCenter';
import RoleManagement from './RoleManagement';

const Settings = () => {
    const {
        servicePoints, allServicePoints, addServicePoint, removeServicePoint, updateServicePoint,
        users, addUser, updateUser, removeUser, currentUser, showToast,
        // eslint-disable-next-line no-unused-vars
        updateCustomer, removeCustomer,
        emailSettings, setEmailSettings,
        companyProfile, setCompanyProfile,
        notificationSettings, setNotificationSettings,
        notificationTemplates, setNotificationTemplates,
        earnings, addEarning,
        roles,
        serviceTerms, setServiceTerms
    } = useAppContext();

    // İşlem yetkisi: personel hesabı yönetimi
    const canManageUsers = hasPermission(currentUser, 'manage_users');

    const [activeTab, setActiveTab] = useState('general');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Earnings Form State
    const [showEarningsModal, setShowEarningsModal] = useState(false);
    const [newEarning, setNewEarning] = useState({ storeId: '', month: '', amount: '' });

    // --- Company Profile Form ---
    const [tempCompanyProfile, setTempCompanyProfile] = useState(companyProfile || {
        name: "TROY",
        title: "ARTIBİLGİ TEKNOLOJİ BİLİŞİM VE DIŞ TİC. A.Ş.",
        address: "Bağdat Caddesi No:123, 34728 Kadıköy / İstanbul",
        phone: "0216 123 45 67",
        mersis: "0085034123400018",
        dealerCode: "TR-APR-0042"
    });

    // Update temp state when context loads
    React.useEffect(() => {
        if (companyProfile) {
            setTempCompanyProfile(companyProfile);
        }
    }, [companyProfile]);

    const handleSaveCompanyProfile = () => {
        setCompanyProfile(tempCompanyProfile);
        alert('Şirket bilgileri başarıyla güncellendi.');
    };

    // --- Email Settings Form ---
    const [tempEmailSettings, setTempEmailSettings] = useState(emailSettings);
    const [tempNotifSettings, setTempNotifSettings] = useState(notificationSettings);

    React.useEffect(() => {
        if (notificationSettings) {
            setTempNotifSettings(notificationSettings);
        }
    }, [notificationSettings]);

    const handleSaveNotificationSettings = () => {
        setNotificationSettings(tempNotifSettings);
        alert('Bildirim ayarları başarıyla kaydedildi.');
    };

    // --- Notification Templates Form ---
    const [tempNotificationTemplates, setTempNotificationTemplates] = useState(notificationTemplates);
    const [activeTemplatePlatform, setActiveTemplatePlatform] = useState('whatsapp');
    const [activeTemplateType, setActiveTemplateType] = useState('status_update');

    React.useEffect(() => {
        if (notificationTemplates) {
            setTempNotificationTemplates(notificationTemplates);
        }
    }, [notificationTemplates]);

    const handleSaveNotificationTemplates = () => {
        setNotificationTemplates(tempNotificationTemplates);
        alert('Şablonlar başarıyla kaydedildi.');
    };

    // --- Attachment States ---
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [attachmentExists, setAttachmentExists] = useState(false);
    const [auditLogs, setAuditLogs] = useState([]);

    React.useEffect(() => {
        if (activeTab === 'notifications') {
            fetch('/api/check-attachment')
                .then(res => res.json())
                .then(data => setAttachmentExists(data.exists))
                .catch(err => console.error('Attachment check failed:', err));
        }

        if (activeTab === 'audit_logs') {
            fetch('/api/system/audit-logs', {
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
            })
            .then(res => res.json())
            .then(data => setAuditLogs(data))
            .catch(err => console.error('Audit logs fetch failed:', err));
        }
    }, [activeTab]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setUploadStatus('Yükleniyor...');

        try {
            const res = await fetch('/api/upload-attachment', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setUploadStatus('✅ Kaydedildi');
                setAttachmentExists(true);
                setFile(null);
                setTimeout(() => setUploadStatus(''), 2000);
            } else {
                setUploadStatus('❌ Hata: ' + data.message);
            }
        // eslint-disable-next-line no-unused-vars
        } catch (err) {
            setUploadStatus('❌ Bağlantı hatası.');
        }
    };

    const handleDeleteAttachment = async () => {
        if (!(await appConfirm('Bu dosyayı silmek istediğinize emin misiniz?'))) return;
        try {
            const res = await fetch('/api/delete-attachment', { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setAttachmentExists(false);
                setUploadStatus('🗑️ Kaldırıldı');
                setTimeout(() => setUploadStatus(''), 2000);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const [isChecking, setIsChecking] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateProgress, setUpdateProgress] = useState(0);
    const [lastCheck, setLastCheck] = useState(localStorage.getItem('lastUpdateCheck') || 'Hiç kontrol edilmedi');
    const [currentVersion] = useState('v1.4.1');
    // eslint-disable-next-line no-unused-vars
    const [serverVersion, setServerVersion] = useState(null);

    const handleReboot = async () => {
        if (!(await appConfirm('DİKKAT: Sunucu yeniden başlatılacaktır. Tüm aktif bağlantılar kesilecek ve sistem kendini tekrar yükleyecektir. Emin misiniz?'))) return;
        
        try {
            Swal.fire({
                title: 'Sistem Kapatılıyor',
                text: 'Sunucu yeniden başlatılıyor, lütfen bekleyin...',
                icon: 'warning',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            fetch('/api/system/reboot', { method: 'POST' }).catch(() => {});
            
            setTimeout(() => {
                window.location.reload();
            }, 6000);

        } catch (err) {
            console.error('Reboot request failed:', err);
        }
    };

    const handleSaveEmailSettings = () => {
        setEmailSettings(tempEmailSettings);
        alert('E-posta ayarları başarıyla kaydedildi.');
    };

    // --- Service Point Form ---
    const [newPoint, setNewPoint] = useState({ name: '', type: 'Şube', address: '', phone: '', shipTo: '' });
    // eslint-disable-next-line no-unused-vars
    const [isAddingPoint, setIsAddingPoint] = useState(false);
    const [editingPointId, setEditingPointId] = useState(null);
    const [editPointData, setEditPointData] = useState(null);

    // --- Service Terms Form ---
    const [tempServiceTerms, setTempServiceTerms] = useState(serviceTerms || {
        termsTitle: "Hüküm ve Koşullar",
        termsContent: "",
        approvalText: "",
        kvkkText: ""
    });

    React.useEffect(() => {
        if (serviceTerms) {
            setTempServiceTerms(serviceTerms);
        }
    }, [serviceTerms]);

    const handleSaveServiceTerms = () => {
        setServiceTerms(tempServiceTerms);
        Swal.fire({
            title: 'Başarılı!',
            text: 'Servis metinleri başarıyla güncellendi.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    };

    const handleAddPoint = async () => {
        if (!newPoint.name || !newPoint.address || !newPoint.shipTo) {
            alert('Lütfen Mağaza Adı, Ship-To No ve Adres alanlarını doldurunuz.');
            return;
        }

        setIsAddingPoint(true);
        try {
            const result = await addServicePoint(newPoint);
            
            if (result.success) {
                setNewPoint({ name: '', type: 'Şube', address: '', phone: '', shipTo: '' });
                Swal.fire({
                    title: 'Başarılı!',
                    text: 'Mağaza noktası başarıyla eklendi.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire({
                title: 'Hata!',
                text: 'Mağaza eklenemedi: ' + error.message,
                icon: 'error'
            });
        } finally {
            setIsAddingPoint(false);
        }
    };

    const handleUpdatePoint = async () => {
        if (!editPointData.name || !editPointData.shipTo) return;
        const success = await updateServicePoint(editingPointId, editPointData);
        if (success) {
            setEditingPointId(null);
            setEditPointData(null);
            Swal.fire({
                title: 'Güncellendi!',
                text: 'Mağaza bilgileri başarıyla güncellendi.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        }
    };

    // --- User Form ---
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'technician', storeId: 1, storeIds: [] });

    // Çoklu mağaza seçimi yardımcıları (add/edit ortak)
    const toggleStoreId = (list, sid) => {
        const s = Number(sid);
        const arr = (list || []).map(Number);
        return arr.includes(s) ? arr.filter(x => x !== s) : [...arr, s];
    };
    
    // Role change handler for new users
    const handleNewUserRoleChange = (e) => {
        const role = e.target.value;
        let storeId = newUser.storeId;
        if (role.toLowerCase() === 'superadmin' || role.toLowerCase() === 'admin' || role.toLowerCase() === 'yonetici') {
            const merkez = allServicePoints.find(sp => sp.type === 'Merkez' || sp.name.toLowerCase().includes('merkez'));
            if (merkez) storeId = merkez.id;
        }
        setNewUser({ ...newUser, role, storeId });
    };

    // Role change handler for edit user
    const handleEditRoleChange = (e) => {
        const role = e.target.value;
        let storeId = editUserData.storeId;
        if (role.toLowerCase() === 'superadmin' || role.toLowerCase() === 'admin' || role.toLowerCase() === 'yonetici') {
            const merkez = allServicePoints.find(sp => sp.type === 'Merkez' || sp.name.toLowerCase().includes('merkez'));
            if (merkez) storeId = merkez.id;
        }
        setEditUserData({ ...editUserData, role, storeId });
    };

    const [editingUserId, setEditingUserId] = useState(null);
    const [editUserData, setEditUserData] = useState(null);

    const handleAddUser = () => {
        if (!newUser.name || !newUser.email || !newUser.password) return;
        const isPrivileged = ['superadmin', 'admin', 'yonetici'].includes(newUser.role?.toLowerCase());
        if (!isPrivileged && (!newUser.storeIds || newUser.storeIds.length === 0)) {
            showToast('Lütfen kullanıcının erişebileceği en az bir mağaza seçin.', 'warning');
            return;
        }
        const stores = (newUser.storeIds && newUser.storeIds.length > 0)
            ? newUser.storeIds.map(Number)
            : [parseInt(newUser.storeId)];
        addUser({
            ...newUser,
            storeId: stores[0],          // Birincil mağaza
            storeIds: stores,            // Erişimli mağazalar
            avatar: newUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        });
        setNewUser({ name: '', email: '', password: '', role: 'technician', storeId: 1, storeIds: [] });
    };

    const handleUpdateUser = async () => {
        try {
            console.log("Güncellenecek Kullanıcı ID:", editingUserId);
            console.log("Gönderilecek Veri:", editUserData);

            // ID alanlarını ayır ve temizle.
            // Şifre ve sistem erişimi bu ekrandan yönetilmez; yalnızca
            // Ayarlar > Sistem Güvenliği ekranından değiştirilebilir.
            // eslint-disable-next-line no-unused-vars
            const { _id, id, password, isActive, disabledAt, disabledReason, disabledBy, ...cleanProfile } = editUserData;
            const targetId = _id || id;
            
            const stores = (editUserData.storeIds && editUserData.storeIds.length > 0)
                ? editUserData.storeIds.map(Number)
                : [Number(editUserData.storeId)];
            const finalData = {
                ...cleanProfile,
                storeId: stores[0],
                storeIds: stores
            };

            const success = await updateUser(targetId, finalData);
            
            if (success) {
                setEditingUserId(null);
                setEditUserData(null);
                Swal.fire({
                    title: 'Başarılı!',
                    text: 'Kullanıcı bilgileri güncellendi.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                throw new Error("Güncelleme başarısız oldu.");
            }
        } catch (error) {
            console.error("Kullanıcı güncelleme hatası:", error);
            Swal.fire({
                title: 'Hata!',
                text: 'Güncelleme yapılamadı: ' + error.message,
                icon: 'error'
            });
        }
    };

    const handleAddEarning = async () => {
        if (!newEarning.storeId || !newEarning.month || !newEarning.amount) {
            Swal.fire({
                title: 'Eksik Bilgi',
                text: 'Lütfen tüm alanları doldurunuz.',
                icon: 'warning',
                confirmButtonColor: '#007aff'
            });
            return;
        }

        const point = allServicePoints.find(p => String(p.id) === String(newEarning.storeId));

        const success = await addEarning({
            ...newEarning,
            storeId: parseInt(newEarning.storeId),
            amount: parseFloat(newEarning.amount),
            shipTo: point ? point.shipTo : '-'
        });

        if (success) {
            setShowEarningsModal(false);
            setNewEarning({ storeId: '', month: '', amount: '' });
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white rounded-lg p-8 border border-gray-100 shadow-sm">
                            <h4 className="text-xl font-semibold text-gray-900 mb-8 flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                                    <Building size={20} />
                                </div>
                                Kurumsal Kimlik Bilgileri
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Şirket Kısa Adı (Logo Yanı)</label>
                                    <input
                                        type="text"
                                        value={tempCompanyProfile.name}
                                        onChange={(e) => setTempCompanyProfile({ ...tempCompanyProfile, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Resmi Ünvan</label>
                                    <input
                                        type="text"
                                        value={tempCompanyProfile.title}
                                        onChange={(e) => setTempCompanyProfile({ ...tempCompanyProfile, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Adres</label>
                                    <input
                                        type="text"
                                        value={tempCompanyProfile.address}
                                        onChange={(e) => setTempCompanyProfile({ ...tempCompanyProfile, address: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefon</label>
                                    <input
                                        type="text"
                                        value={tempCompanyProfile.phone}
                                        onChange={(e) => setTempCompanyProfile({ ...tempCompanyProfile, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mersis No</label>
                                    <input
                                        type="text"
                                        value={tempCompanyProfile.mersis}
                                        onChange={(e) => setTempCompanyProfile({ ...tempCompanyProfile, mersis: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Yetkili Bayi Kodu</label>
                                    <input
                                        type="text"
                                        value={tempCompanyProfile.dealerCode}
                                        onChange={(e) => setTempCompanyProfile({ ...tempCompanyProfile, dealerCode: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveCompanyProfile}
                                    className="px-10 py-4 bg-gray-900 text-white font-semibold rounded-md hover:bg-black transition-all shadow-xl shadow-gray-200 hover:-translate-y-1 active:scale-95 flex items-center gap-3"
                                >
                                    <Save size={20} />
                                    DEĞİŞİKLİKLERİ KAYDET
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'kbb_history':
                return <KbbArchive />;
            case 'earnings':
                const groupedEarnings = (earnings || []).reduce((acc, earn) => {
                    const monthKey = earn.month; // YYYY-MM
                    if (!acc[monthKey]) acc[monthKey] = [];
                    acc[monthKey].push(earn);
                    return acc;
                }, {});

                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 leading-none">Hakediş Kayıtları</h4>
                                <p className="text-gray-500 text-xs mt-1 font-medium">Ship-To bazlı aylık hakediş verileri.</p>
                            </div>
                            <button
                                onClick={() => setShowEarningsModal(true)}
                                className="bg-gray-900 text-white px-6 py-2.5 rounded-md font-bold hover:bg-black transition-all shadow-lg flex items-center gap-2"
                            >
                                <Plus size={18} /> Yeni Hakediş Ekle
                            </button>
                        </div>

                        {Object.keys(groupedEarnings).length > 0 ? (
                            Object.entries(groupedEarnings).map(([month, items]) => {
                                // Format month name
                                const [year, m] = month.split('-');
                                const monthName = new Date(year, parseInt(m) - 1).toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

                                return (
                                    <div key={month} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-apple-blue"></div>
                                                <span className="font-semibold text-gray-900 text-sm uppercase tracking-wide">{monthName}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-400 text-xs uppercase tracking-wide">
                                                Toplam: {items.reduce((sum, i) => sum + i.amount, 0).toLocaleString('tr-TR')} ₺
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-white text-[10px] font-semibold text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                                                    <tr>
                                                        <th className="px-8 py-4">Ship-To</th>
                                                        <th className="px-8 py-4">Mağaza</th>
                                                        <th className="px-8 py-4 text-right">Hakediş Tutarı</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {items.map(item => {
                                                        const store = allServicePoints.find(sp => sp.id === item.storeId);
                                                        return (
                                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-8 py-4 font-mono font-bold text-blue-600">{item.shipTo || (store ? store.shipTo : '-')}</td>
                                                                <td className="px-8 py-4 font-bold text-gray-700">{store ? store.name : 'Silinmiş Mağaza'}</td>
                                                                <td className="px-8 py-4 text-right font-semibold text-gray-900">{item.amount.toLocaleString('tr-TR')} ₺</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="bg-white rounded-lg p-12 text-center text-gray-400">
                                <p>Henüz hakediş kaydı bulunmuyor.</p>
                            </div>
                        )}

                        {/* Earnings Modal */}
                        {showEarningsModal && (
                            <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                                <div className="bg-white rounded-lg w-full max-w-md p-8 shadow-2xl animate-scale-up border border-white/50">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Yeni Hakediş Kaydı</h3>

                                    <div className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase text-gray-400 tracking-widest pl-1">Mağaza / Ship-To</label>
                                            <select
                                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-md text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                                value={newEarning.storeId}
                                                onChange={e => setNewEarning({ ...newEarning, storeId: e.target.value })}
                                            >
                                                <option value="">Mağaza Seçiniz...</option>
                                                {allServicePoints.map(sp => (
                                                    <option key={sp.id} value={sp.id}>{sp.name} ({sp.shipTo})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase text-gray-400 tracking-widest pl-1">Dönem (Ay)</label>
                                            <input
                                                type="month"
                                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-md text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                                value={newEarning.month}
                                                onChange={e => setNewEarning({ ...newEarning, month: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase text-gray-400 tracking-widest pl-1">Hakediş Tutarı (₺)</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-md text-lg font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                                value={newEarning.amount}
                                                onChange={e => setNewEarning({ ...newEarning, amount: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-8">
                                        <button
                                            onClick={() => setShowEarningsModal(false)}
                                            className="flex-1 py-3.5 rounded-md font-bold text-gray-600 hover:bg-gray-100 transition-all font-bold"
                                        >
                                            Vazgeç
                                        </button>
                                        <button
                                            onClick={handleAddEarning}
                                            className="flex-1 py-3.5 rounded-md font-bold text-white bg-gray-900 hover:bg-black transition-all shadow-lg shadow-gray-200"
                                        >
                                            Kaydet
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'notifications':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100/50">
                            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-lg">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Mail size={20} />
                                </div>
                                Microsoft Exchange Entegrasyonu
                            </h4>
                            <p className="text-sm text-blue-700/80 leading-relaxed ml-11 max-w-2xl">
                                E-postalarınız Microsoft Exchange altyapısı üzerinden gönderilecektir. Sisteme sadece kurumsal mail adresinizi ve şifrenizi girmeniz yeterlidir, sunucu verileri otomatik olarak yapılandırılır.
                            </p>
                        </div>

                        {/* --- Notification Preferences Section --- */}
                        <div className="glass p-8 rounded-lg space-y-6">
                            <h5 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Bell size={20} className="text-gray-400" />
                                Bildirim Davranışları ve İçerik Şablonları
                            </h5>

                            <div className="space-y-4">
                                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-md border border-gray-100 cursor-pointer hover:bg-gray-100 transition-all">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={tempNotifSettings?.requireDamageDescription || false}
                                        onChange={e => setTempNotifSettings({...tempNotifSettings, requireDamageDescription: e.target.checked})}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-gray-900">Müşteri Bildirimlerinde Hasar Açıklaması (Tanı) Ekle</span>
                                        <span className="text-xs text-gray-500 font-medium">Bu seçenek aktif olduğunda, gönderilen bildirimlerde tespit edilen arıza/tanı açıklaması da müşteriye iletilir.</span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={handleSaveNotificationSettings}
                                    className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-md hover:bg-black transition-all shadow-lg shadow-gray-200"
                                >
                                    Tercihleri Kaydet
                                </button>
                            </div>
                        </div>

                        {/* --- Notification Templates Section --- */}
                        <div className="glass p-8 rounded-lg space-y-6">
                            <h5 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <MessageSquare size={20} className="text-gray-400" />
                                Bildirim Şablonlarını Düzenle
                            </h5>
                            <p className="text-sm text-gray-500 mb-4">
                                Kullanabileceğiniz değişkenler: <span className="font-mono text-xs bg-gray-100 px-1 rounded">{'{customerName}'}</span>, <span className="font-mono text-xs bg-gray-100 px-1 rounded">{'{device}'}</span>, <span className="font-mono text-xs bg-gray-100 px-1 rounded">{'{status}'}</span>, <span className="font-mono text-xs bg-gray-100 px-1 rounded">{'{serviceNo}'}</span>, <span className="font-mono text-xs bg-gray-100 px-1 rounded">{'{cost}'}</span>, <span className="font-mono text-xs bg-gray-100 px-1 rounded font-bold text-blue-600">{'{damageReason}'}</span>
                            </p>

                            <div className="flex gap-2">
                                {['whatsapp', 'sms', 'email'].map(platform => (
                                    <button 
                                        key={platform}
                                        onClick={() => setActiveTemplatePlatform(platform)}
                                        className={`px-4 py-2 rounded-md text-sm font-bold capitalize ${activeTemplatePlatform === platform ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {platform}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-4">
                                {[
                                    {id: 'status_update', label: 'Durum Güncellemesi'},
                                    {id: 'repair_requote', label: 'Fiyat / Onay Bekliyor'},
                                    {id: 'ready_pickup', label: 'Teslime Hazır'},
                                    {id: 'general_info', label: 'Genel Bilgilendirme'}
                                ].map(type => (
                                    <button 
                                        key={type.id}
                                        onClick={() => setActiveTemplateType(type.id)}
                                        className={`px-4 py-2 rounded-md text-sm font-bold ${activeTemplateType === type.id ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-6 space-y-4">
                                {activeTemplatePlatform === 'email' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">E-Posta Konusu</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 rounded-md border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-sm"
                                            value={tempNotificationTemplates?.email?.[activeTemplateType]?.subject || ''}
                                            onChange={e => setTempNotificationTemplates(prev => ({
                                                ...prev,
                                                email: {
                                                    ...prev.email,
                                                    [activeTemplateType]: {
                                                        ...prev.email?.[activeTemplateType],
                                                        subject: e.target.value
                                                    }
                                                }
                                            }))}
                                        />
                                    </div>
                                )}
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Mesaj İçeriği</label>
                                    <textarea
                                        rows={8}
                                        className="w-full px-4 py-3 rounded-md border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-sm custom-scrollbar"
                                        value={
                                            activeTemplatePlatform === 'email' 
                                                ? tempNotificationTemplates?.email?.[activeTemplateType]?.body || ''
                                                : tempNotificationTemplates?.[activeTemplatePlatform]?.[activeTemplateType] || ''
                                        }
                                        onChange={e => {
                                            const val = e.target.value;
                                            setTempNotificationTemplates(prev => {
                                                const next = { ...prev };
                                                if (activeTemplatePlatform === 'email') {
                                                    next.email = {
                                                        ...next.email,
                                                        [activeTemplateType]: {
                                                            ...next.email?.[activeTemplateType],
                                                            body: val
                                                        }
                                                    };
                                                } else {
                                                    next[activeTemplatePlatform] = {
                                                        ...next[activeTemplatePlatform],
                                                        [activeTemplateType]: val
                                                    };
                                                }
                                                return next;
                                            });
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={handleSaveNotificationTemplates}
                                    className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-md hover:bg-black transition-all shadow-lg shadow-gray-200"
                                >
                                    Şablonları Kaydet
                                </button>
                            </div>
                        </div>

                        {/* --- Attachment Section --- */}
                        <div className="glass p-8 rounded-lg space-y-6">
                            <div className="flex justify-between items-center">
                                <h5 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Paperclip size={20} className="text-gray-400" />
                                    Varsayılan Posta Eki (PDF)
                                </h5>
                                {attachmentExists && (
                                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full border border-green-200 flex items-center gap-1.5 shadow-sm">
                                        <Check size={12} strokeWidth={3} /> SİSTEMDE YÜKLÜ
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 max-w-2xl">
                                Buraya yüklediğiniz dosya (örn: Havale Bilgileri), sistemden gönderilen <strong className="text-gray-900">her e-postaya</strong> otomatik olarak eklenecektir.
                            </p>

                            <div className="flex items-center gap-4 p-6 bg-gray-50/50 rounded-md border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                                {!attachmentExists ? (
                                    <>
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                onChange={handleFileChange}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                                            />
                                        </div>
                                        <button
                                            onClick={handleUpload}
                                            disabled={!file}
                                            className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all shadow-lg ${file ? 'bg-apple-blue hover:bg-blue-600 text-white shadow-blue-200 hover:-translate-y-0.5' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                                }`}
                                        >
                                            <Upload size={16} /> Yükle
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center border border-gray-100 shadow-md">
                                                <Paperclip size={24} className="text-apple-blue" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">Bilgilendirme.pdf</p>
                                                <p className="text-xs text-gray-500 font-medium">Her maile eklenecek</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleDeleteAttachment}
                                            className="p-3 text-red-500 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"
                                            title="Dosyayı Kaldır"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            {uploadStatus && (
                                <p className="text-xs font-bold text-apple-blue pl-2 animate-pulse flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-apple-blue"></div> {uploadStatus}
                                </p>
                            )}
                        </div>

                        <div className="glass p-8 rounded-lg space-y-6">
                            <h5 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Globe size={20} className="text-gray-400" />
                                Microsoft Exchange Bağlantısı
                            </h5>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Kurumsal E-Posta Adresi</label>
                                    <input
                                        type="email"
                                        placeholder="ornek@kurum.com"
                                        className="w-full px-4 py-3 rounded-md border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm"
                                        value={tempEmailSettings.user}
                                        onChange={e => setTempEmailSettings({ ...tempEmailSettings, user: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Parola</label>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 rounded-md border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-sm"
                                        value={tempEmailSettings.pass}
                                        onChange={e => setTempEmailSettings({ ...tempEmailSettings, pass: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 rounded-lg flex items-center justify-between shadow-xl shadow-gray-200 mt-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${tempEmailSettings.pass ? 'bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'bg-gray-500'}`}></div>
                                    <span className="text-sm font-bold text-gray-200">
                                        {tempEmailSettings.pass ? 'Sunucu Bağlantısı Hazır' : 'Lütfen sunucu parolanızı girin.'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleSaveEmailSettings}
                                    className="px-8 py-3 bg-white text-gray-900 font-bold rounded-md hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                >
                                    Settingsı Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case 'locations':
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="glass p-8 rounded-lg border border-white/60">
                            <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-lg">
                                <div className="p-2 bg-gray-100 rounded-md">
                                    <Plus size={20} className="text-gray-900" />
                                </div>
                                Yeni Ship-To / Lokasyon Ekle
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <input
                                    type="text"
                                    placeholder="Nokta Adı"
                                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    value={newPoint.name}
                                    onChange={e => setNewPoint({ ...newPoint, name: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Ship-To No"
                                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    value={newPoint.shipTo}
                                    onChange={e => setNewPoint({ ...newPoint, shipTo: e.target.value })}
                                />
                                <div className="relative">
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none"
                                        value={newPoint.type}
                                        onChange={e => setNewPoint({ ...newPoint, type: e.target.value })}
                                    >
                                        <option value="Merkez">Merkez Servis</option>
                                        <option value="Şube">Şube</option>
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={16} />
                                </div>

                                <input
                                    type="text"
                                    placeholder="Adres"
                                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 outline-none transition-all"
                                    value={newPoint.address}
                                    onChange={e => setNewPoint({ ...newPoint, address: e.target.value })}
                                />
                                <button onClick={handleAddPoint} className="bg-gray-900 text-white px-6 py-3 rounded-md font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl lg:col-span-4">Ekle</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {allServicePoints.map(point => (
                                <div key={point.id} className="group bg-white rounded-lg border border-gray-100 p-6 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 transition-all duration-500 relative flex flex-col h-full overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-125"></div>
                                    
                                    {editingPointId === point.id ? (
                                        <div className="space-y-4 flex-1">
                                            <input
                                                className="w-full px-4 py-2 text-sm font-semibold bg-gray-50 rounded-md outline-none border focus:border-indigo-500 transition-all"
                                                value={editPointData.name}
                                                onChange={e => setEditPointData({ ...editPointData, name: e.target.value })}
                                            />
                                            <input
                                                className="w-full px-4 py-2 text-xs font-mono bg-gray-50 rounded-md outline-none border"
                                                value={editPointData.shipTo}
                                                onChange={e => setEditPointData({ ...editPointData, shipTo: e.target.value })}
                                                placeholder="Ship-To No"
                                            />
                                            <textarea
                                                className="w-full px-4 py-2 text-[11px] bg-gray-50 rounded-md outline-none border resize-none h-20"
                                                value={editPointData.address}
                                                onChange={e => setEditPointData({ ...editPointData, address: e.target.value })}
                                                placeholder="Adres"
                                            />
                                            <div className="flex gap-2 mt-auto">
                                                <button onClick={handleUpdatePoint} className="flex-1 py-2 bg-gray-900 text-white rounded-md text-[10px] font-semibold">KAYDET</button>
                                                <button onClick={() => setEditingPointId(null)} className="flex-1 py-2 bg-gray-100 text-gray-400 rounded-md text-[10px] font-semibold">İPTAL</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`w-12 h-12 rounded-md flex items-center justify-center shadow-lg ${point.type === 'Merkez' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white border border-gray-100 text-indigo-600'}`}>
                                                    {point.type === 'Merkez' ? <Building size={24} strokeWidth={2.5} /> : <MapPin size={24} strokeWidth={2.5} />}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => { setEditingPointId(point.id); setEditPointData(point); }} className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all">
                                                        <Save size={16} />
                                                    </button>
                                                    <button onClick={() => setConfirmModal({
                                                        isOpen: true,
                                                        title: 'Şube Silinecek',
                                                        message: 'Bu lokasyonu sistemden leftrmak istediğinize emin misiniz?',
                                                        onConfirm: () => removeServicePoint(point.id)
                                                    })} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="mb-4 flex-1">
                                                <h4 className="font-semibold text-gray-900 text-lg leading-tight mb-2">{point.name}</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 uppercase tracking-tight">SHIP-TO: {point.shipTo || '---'}</span>
                                                    <span className="text-[9px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 uppercase tracking-tight">{point.type}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-auto">
                                                <p className="text-[11px] text-gray-500 font-medium leading-relaxed italic line-clamp-2">
                                                    {point.address || 'Adres bilgisi girilmemiş.'}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'users':
                return (
                    <div className="space-y-8 animate-fade-in">
                        {/* Kullanıcı Ekleme Formu — yalnızca yetkili kullanıcıya */}
                        {canManageUsers && (
                        <div className="glass p-8 rounded-lg border border-white/60">
                            <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-lg">
                                <div className="p-2 bg-gray-100 rounded-md">
                                    <UserPlus size={20} className="text-gray-900" />
                                </div>
                                Yeni Personel Ekle
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
                                <input
                                    type="text" placeholder="Ad Soyad"
                                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 outline-none transition-all font-medium"
                                    value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                />
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email" placeholder="E-Posta Adresi"
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 outline-none transition-all font-medium"
                                        value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text" placeholder="Şifre"
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 outline-none transition-all font-medium"
                                        value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                                <div className="relative">
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none font-medium text-gray-700"
                                        value={newUser.role} onChange={handleNewUserRoleChange}
                                    >
                                        {roles
                                            .filter(role => {
                                                // Yönetici, SuperAdmin hesabı oluşturamaz
                                                if (isYonetici(currentUser)) {
                                                    return role.name.toLowerCase() !== 'superadmin' && role.name.toLowerCase() !== 'admin';
                                                }
                                                return true;
                                            })
                                            .map(role => (
                                                <option key={role.name} value={role.name}>{role.displayName}</option>
                                            ))
                                        }
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={16} />
                                </div>

                                <div className="border border-gray-200 rounded-md bg-gray-50 p-3 max-h-[132px] overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Erişilebilir Mağazalar</p>
                                        <span className="text-[9px] font-bold text-blue-600">{(newUser.storeIds || []).length} seçili</span>
                                    </div>
                                    {['superadmin', 'admin', 'yonetici'].includes(newUser.role?.toLowerCase()) ? (
                                        <p className="text-[11px] text-gray-500 font-medium py-1">Bu rol tüm mağazalara erişir (yetkili hesap).</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {allServicePoints.map(sp => {
                                                const checked = (newUser.storeIds || []).map(String).includes(String(sp.id));
                                                return (
                                                    <label key={sp.id} className="flex items-center gap-2 cursor-pointer text-[12px] font-medium text-gray-700 hover:text-gray-900">
                                                        <input type="checkbox" checked={checked} onChange={() => setNewUser({ ...newUser, storeIds: toggleStoreId(newUser.storeIds, sp.id) })} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                                                        {sp.name}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <button onClick={handleAddUser} className="bg-gray-900 text-white px-6 py-3 rounded-md font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl h-12">Hesap Oluştur</button>
                            </div>
                        </div>
                        )}

                        {/* Yatay Personel Listesi */}
                        <div className="grid grid-cols-1 gap-4">
                            {users.map(u => {
                                const store = allServicePoints.find(sp => Number(sp.id) === Number(u.storeId));
                                const userId = u._id || u.id;
                                const isEditing = editingUserId === userId;
                                
                                return (
                                    <div key={u.id} className={`group bg-white rounded-lg border border-gray-100 p-5 transition-all duration-300 relative flex flex-col md:flex-row items-center gap-6 ${isEditing ? 'ring-2 ring-indigo-500 bg-indigo-50/10 shadow-xl' : 'hover:shadow-lg hover:border-gray-200 shadow-sm'}`}>
                                        
                                        {/* Sol: Avatar */}
                                        <div className="relative shrink-0">
                                            <div className="w-16 h-16 rounded-md bg-gradient-to-br from-gray-900 to-gray-700 text-white flex items-center justify-center text-xl font-semibold shadow-lg">
                                                {u.avatar || u.name.substring(0, 1)}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white shadow-md flex items-center justify-center text-indigo-600 border border-indigo-50">
                                                <Shield size={12} strokeWidth={3} />
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            /* Düzenleme Modu (Yatay) */
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide pl-1">Ad Soyad</label>
                                                    <input className="w-full px-4 py-2 bg-white rounded-md border border-gray-200 focus:border-indigo-500 outline-none transition-all font-bold text-sm" value={editUserData.name} onChange={e => setEditUserData({ ...editUserData, name: e.target.value })} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide pl-1">E-Posta</label>
                                                    <div className="flex flex-col gap-1">
                                                        <input className="w-full px-4 py-2 bg-white rounded-md border border-gray-200 focus:border-indigo-500 outline-none transition-all font-bold text-xs" value={editUserData.email} onChange={e => setEditUserData({ ...editUserData, email: e.target.value })} />
                                                        {/* Şifre değiştirme yalnızca Ayarlar > Sistem Güvenliği ekranından yapılır */}
                                                        <p className="text-[9px] font-semibold text-gray-400 leading-tight px-1 pt-1">
                                                            Şifre işlemleri Sistem Güvenliği ekranından yapılır.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide pl-1">Yetki & Mağaza</label>
                                                    <div className="flex flex-col gap-1">
                                                        <select 
                                                            className="w-full px-4 py-2 bg-white rounded-md border border-gray-200 outline-none font-semibold text-[10px] uppercase" 
                                                            value={roles.find(r => r.name.toLowerCase() === editUserData.role?.toLowerCase())?.name || editUserData.role} 
                                                            onChange={handleEditRoleChange}
                                                        >
                                                            {roles
                                                                .filter(role => {
                                                                    // Yönetici, SuperAdmin veya Admin rolünü atayamaz
                                                                    if (isYonetici(currentUser)) {
                                                                        const isTargetSuper = editUserData.role?.toLowerCase() === 'superadmin' || editUserData.role?.toLowerCase() === 'admin';
                                                                        const isRoleSuper = role.name.toLowerCase() === 'superadmin' || role.name.toLowerCase() === 'admin';
                                                                        if (isRoleSuper) {
                                                                            return isTargetSuper;
                                                                        }
                                                                    }
                                                                    return true;
                                                                })
                                                                .map(role => (
                                                                    <option key={role.name} value={role.name}>{role.displayName.toUpperCase()}</option>
                                                                ))
                                                            }
                                                        </select>
                                                        <div className="border border-gray-200 rounded-md bg-white p-2 max-h-[110px] overflow-y-auto custom-scrollbar">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Erişilebilir Mağazalar</p>
                                                                <span className="text-[8px] font-bold text-indigo-600">{((editUserData.storeIds && editUserData.storeIds.length) ? editUserData.storeIds : [editUserData.storeId]).length} seçili</span>
                                                            </div>
                                                            {['superadmin', 'admin', 'yonetici'].includes(editUserData.role?.toLowerCase()) ? (
                                                                <p className="text-[10px] text-gray-500 font-medium py-0.5">Tüm mağazalar (yetkili hesap)</p>
                                                            ) : (
                                                                <div className="space-y-1">
                                                                    {allServicePoints.map(sp => {
                                                                        const list = (editUserData.storeIds && editUserData.storeIds.length) ? editUserData.storeIds : [editUserData.storeId];
                                                                        const checked = list.map(String).includes(String(sp.id));
                                                                        return (
                                                                            <label key={sp.id} className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-gray-700 uppercase">
                                                                                <input type="checkbox" checked={checked} onChange={() => setEditUserData({ ...editUserData, storeIds: toggleStoreId(list, sp.id) })} className="w-3 h-3 rounded border-gray-300 text-indigo-600" />
                                                                                {sp.name}
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 pt-4 md:pt-0">
                                                    <button onClick={handleUpdateUser} className="flex-1 py-3 bg-gray-900 text-white rounded-md text-[10px] font-semibold hover:bg-black transition-all shadow-lg">KAYDET</button>
                                                    <button onClick={() => setEditingUserId(null)} className="px-4 py-3 bg-gray-100 text-gray-400 rounded-md text-[10px] font-semibold hover:bg-gray-200 transition-all">İPTAL</button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Normal Mod (Yatay) */
                                            <>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                                        <h4 className="font-semibold text-gray-900 text-lg tracking-tight truncate">{u.name}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-semibold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${
                                                                (u.role?.toLowerCase() === 'superadmin' || u.role?.toLowerCase() === 'admin') ? 'bg-indigo-600 text-white border-indigo-600' : 
                                                                (u.role?.toLowerCase() === 'technician' || u.role?.toLowerCase() === 'teknisyen') ? 'bg-emerald-500 text-white border-emerald-500' :
                                                                'bg-amber-500 text-white border-amber-500'
                                                            }`}>
                                                                {ROLE_DISPLAY_NAMES[u.role?.toLowerCase()] || u.role}
                                                            </span>
                                                            {(u.role?.toLowerCase() === 'superadmin' || u.role?.toLowerCase() === 'admin' || u.role?.toLowerCase() === 'yonetici') ? (
                                                                <span className="text-[9px] font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg border border-blue-100 uppercase tracking-wider">
                                                                    Tüm Mağazalar
                                                                </span>
                                                            ) : (u.storeIds && u.storeIds.length > 1) ? (
                                                                <span className="text-[9px] font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg border border-indigo-100 uppercase tracking-wider" title={u.storeIds.map(sid => allServicePoints.find(sp => Number(sp.id) === Number(sid))?.name).filter(Boolean).join(', ')}>
                                                                    {u.storeIds.length} Mağaza
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-semibold bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg border border-gray-100 uppercase tracking-wider">
                                                                    {store ? store.name : 'Genel Merkez'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-400 font-bold mt-1 tracking-tight">{u.email}</p>
                                                </div>

                                                <div className="shrink-0 flex items-center gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-gray-50 w-full md:w-auto justify-end">
                                                    {/* Yönetici, SuperAdmin hesaplarını düzenleyemez */}
                                                    {canManageUsers && !(isYonetici(currentUser) && isSuperAdmin(u)) && (
                                                        <button 
                                                            onClick={() => { 
                                                                const userId = u._id || u.id;
                                                                setEditingUserId(userId); 
                                                                setEditUserData({ ...u }); 
                                                            }} 
                                                            className="flex items-center gap-2 px-4 py-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all text-[10px] font-semibold text-xs uppercase tracking-wide border border-transparent hover:border-indigo-100"
                                                        >
                                                            <Save size={14} /> DÜZENLE
                                                        </button>
                                                    )}
                                                    {isYonetici(currentUser) && isSuperAdmin(u) && (
                                                        <span className="text-[9px] text-orange-400 font-bold px-3 py-1.5 bg-orange-50 rounded-md border border-orange-100">
                                                            SÜPER ADMİN
                                                        </span>
                                                    )}
                                                    {/* Yönetici, SuperAdmin hesaplarını silemez */}
                                                    {canManageUsers && u.id !== currentUser?.id && u._id !== currentUser?._id && !(isYonetici(currentUser) && isSuperAdmin(u)) && (
                                                        <button 
                                                            onClick={async () => {
                                                                const userId = u._id || u.id;
                                                                if (await appConfirm(`${u.name} personeli sistemden kalıcı olarak silinecektir. Emin misiniz?`)) {
                                                                    const success = await removeUser(userId);
                                                                    if (success) {
                                                                        Swal.fire({
                                                                            title: 'Silindi!',
                                                                            text: 'Personel hesabı başarıyla leftrıldı.',
                                                                            icon: 'success',
                                                                            timer: 2000,
                                                                            showConfirmButton: false
                                                                        });
                                                                    }
                                                                }
                                                            }} 
                                                            className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all border border-transparent hover:border-red-100"
                                                            title="Bu Personeli Sil"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'security':
                return <SecurityCenter onReboot={handleReboot} />;
            case 'updates':
                const checkUpdate = async () => {
                    setIsChecking(true);
                    setLastCheck(new Date().toLocaleString('tr-TR'));
                    localStorage.setItem('lastUpdateCheck', new Date().toLocaleString('tr-TR'));

                    try {
                        const response = await fetch('/api/system/check-updates').catch(() => null);
                        let data = { available: true, version: 'v1.5.0' }; 

                        if (response && response.ok) {
                            data = await response.json();
                        }

                        setTimeout(() => {
                            setIsChecking(false);
                            if (data.available) {
                                setUpdateAvailable(true);
                                setServerVersion(data.version);
                                Swal.fire({
                                    title: 'Yeni Güncelleme Bulundu!',
                                    html: `Mevcut sürümünüz: <b>${currentVersion}</b><br/>Yeni sürüm: <b class="text-green-600">${data.version}</b><br/><br/>Bu güncelleme performans iyileştirmeleri içerir.`,
                                    icon: 'info',
                                    showCancelButton: true,
                                    confirmButtonText: 'Şimdi Güncelle',
                                    cancelButtonText: 'Daha Sonra',
                                    confirmButtonColor: '#4f46e5',
                                }).then((result) => {
                                    if (result.isConfirmed) startUpdate();
                                });
                            } else {
                                setUpdateAvailable(false);
                                Swal.fire({
                                    title: 'Sistem Güncel',
                                    text: 'Harika! En son sürümü kullanıyorsunuz.',
                                    icon: 'success',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            }
                        }, 1500);
                    } catch (err) {
                        setIsChecking(false);
                        console.error('Update check failed:', err);
                    }
                };

                const startUpdate = () => {
                    setUpdateProgress(1);
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += Math.random() * 8;
                        if (progress >= 100) {
                            progress = 100;
                            clearInterval(interval);
                            setTimeout(() => {
                                Swal.fire({
                                    title: 'Güncelleme Başarılı!',
                                    text: 'Sistem en son sürüme yükseltildi. Değişiklikler için uygulama yeniden başlatılıyor...',
                                    icon: 'success',
                                    timer: 3000,
                                    showConfirmButton: false
                                }).then(() => window.location.reload());
                            }, 800);
                        }
                        setUpdateProgress(progress);
                    }, 300);
                };

                return (
                    <div className="space-y-8 animate-fade-in max-w-4xl">
                        <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 p-10 rounded-lg text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h4 className="text-3xl font-semibold mb-2 flex items-center gap-4">
                                        <RefreshCw size={32} className={`text-indigo-300 ${isChecking ? 'animate-spin' : ''}`} />
                                        Bulut Güncelleme Merkezi
                                    </h4>
                                    <p className="text-indigo-100/70 font-medium">Sistem versiyonunuzu kontrol edin ve en son özellikleri anında yükleyin.</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-lg border border-white/20 text-center">
                                    <div className="text-[10px] font-semibold text-xs uppercase tracking-wide opacity-60 mb-1">Mevcut Sürüm</div>
                                    <div className="text-2xl font-semibold">{currentVersion}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 bg-white rounded-lg border border-gray-100 p-10 shadow-sm relative overflow-hidden">
                                <h5 className="font-semibold text-gray-900 mb-8 flex items-center gap-3 text-lg">
                                    <Globe size={24} className="text-indigo-600" /> Güncelleme Kontrolü
                                </h5>

                                <div className="space-y-8">
                                    {updateProgress > 0 ? (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end mb-2">
                                                <div className="text-[10px] font-semibold text-indigo-600 text-xs uppercase tracking-wide">GÜNCELLEME PAKETİ İNDİRİLİYOR</div>
                                                <div className="text-xl font-semibold text-gray-900">{Math.round(updateProgress)}%</div>
                                            </div>
                                            <div className="h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-50 p-1">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full transition-all duration-300"
                                                    style={{ width: `${updateProgress}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 font-medium">Lütfen yükleme bitene kadar uygulamayı kapatmayın...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-100 rounded-lg bg-gray-50/50">
                                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl mb-6 text-indigo-600 animate-pulse">
                                                <Shield size={32} />
                                            </div>
                                            <button 
                                                onClick={checkUpdate}
                                                disabled={isChecking}
                                                className={`px-10 py-4 rounded-lg font-semibold text-sm tracking-widest flex items-center gap-3 transition-all ${isChecking ? 'bg-gray-200 text-gray-400' : 'bg-gray-900 text-white hover:bg-black shadow-2xl hover:-translate-y-1 active:scale-95'}`}
                                            >
                                                {isChecking ? 'KONTROL EDİLİYOR...' : 'GÜNCELLEMELERİ DENETLE'}
                                                {!isChecking && <RefreshCw size={18} />}
                                            </button>
                                            <div className="mt-6 flex items-center gap-2 text-gray-400 text-[10px] font-semibold text-xs uppercase tracking-wide">
                                                <Clock size={12} />
                                                Son Kontrol: {lastCheck}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-lg border border-indigo-100 p-8">
                                <h5 className="font-semibold text-indigo-900 mb-6 flex items-center gap-2 text-sm text-xs uppercase tracking-wide">
                                    <Bell size={18} /> Versiyon Notları
                                </h5>
                                <div className="space-y-5">
                                    {[
                                        { v: 'v1.4.1', d: 'Lojistik modülü yeni kompakt tasarıma geçiş yapıldı.', t: 'Güncel' },
                                        { v: 'v1.4.0', d: 'Parça takip sistemi ve KBB yönetimi entegre edildi.', t: 'Old' },
                                        { v: 'v1.3.8', d: 'Performans iyileştirmeleri ve hata giderimleri.', t: 'Old' }
                                    ].map((v, i) => (
                                        <div key={i} className={`p-4 rounded-lg border ${i === 0 ? 'bg-white border-indigo-200 shadow-lg shadow-indigo-500/5' : 'bg-transparent border-gray-100 opacity-60'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-semibold text-indigo-600">{v.v}</span>
                                                <span className="text-[10px] font-bold text-gray-400 italic">{v.t === 'Güncel' ? 'Aktif' : ''}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-600 font-medium leading-relaxed">{v.d}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'roles':
                return <RoleManagement />;
            case 'service_terms':
                return (
                    <div className="space-y-8 animate-fade-in max-w-5xl">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-10 rounded-lg text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                            <div className="relative z-10">
                                <h4 className="text-2xl font-semibold mb-2 flex items-center gap-3">
                                    <MessageSquare size={28} className="text-blue-200" />
                                    Servis Onay ve Gizlilik Metinleri
                                </h4>
                                <p className="text-blue-100/70 font-medium">Kiosk modunda ve servis formlarında müşteriye gösterilecek yasal metinleri buradan düzenleyin.</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-100 p-8 shadow-sm space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-1">Sözleşme Başlığı</label>
                                <input 
                                    type="text" 
                                    value={tempServiceTerms.termsTitle}
                                    onChange={(e) => setTempServiceTerms({ ...tempServiceTerms, termsTitle: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 rounded-md border border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-900" 
                                    placeholder="Örn: Hüküm ve Koşullar"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-1">Sözleşme İçeriği (Madde Madde)</label>
                                <textarea 
                                    rows="10" 
                                    value={tempServiceTerms.termsContent}
                                    onChange={(e) => setTempServiceTerms({ ...tempServiceTerms, termsContent: e.target.value })}
                                    className="w-full px-5 py-4 bg-gray-50 rounded-md border border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-gray-700 leading-relaxed" 
                                    placeholder="Servis kabul şartlarını buraya yazınız..."
                                />
                                <p className="text-[10px] text-gray-400 italic">* Her bir maddeyi yeni satıra yazınız.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-1">Onay Cümlesi (İmza Öncesi)</label>
                                    <textarea 
                                        rows="4" 
                                        value={tempServiceTerms.approvalText}
                                        onChange={(e) => setTempServiceTerms({ ...tempServiceTerms, approvalText: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 rounded-md border border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-sm text-gray-800" 
                                        placeholder="Müşterinin kabul ettiğine dair beyan metni..."
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-1">KVKK / Aydınlatma Metni Kısa Notu</label>
                                    <textarea 
                                        rows="4" 
                                        value={tempServiceTerms.kvkkText}
                                        onChange={(e) => setTempServiceTerms({ ...tempServiceTerms, kvkkText: e.target.value })}
                                        className="w-full px-5 py-4 bg-gray-50 rounded-md border border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-sm text-gray-600" 
                                        placeholder="Kişisel verilerin işlenmesine dair kısa onay metni..."
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-end">
                                <button 
                                    onClick={handleSaveServiceTerms}
                                    className="bg-gray-900 hover:bg-black text-white px-10 py-5 rounded-md font-bold text-xs shadow-xl shadow-gray-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 uppercase tracking-widest"
                                >
                                    <Save size={20} /> Metinleri Sisteme Kaydet
                                </button>
                            </div>
                        </div>

                        {/* Önizleme Alanı */}
                        <div className="bg-gray-50 rounded-lg p-8 border border-dashed border-gray-200">
                            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Globe size={14} /> Kiosk Önizleme (Müşteri Ekranı)
                            </h5>
                            <div className="bg-white rounded-md shadow-sm p-6 border border-gray-100 max-w-2xl mx-auto">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">{tempServiceTerms.termsTitle}</h3>
                                <div className="text-[10px] text-gray-500 space-y-2 whitespace-pre-line leading-relaxed mb-6">
                                    {tempServiceTerms.termsContent}
                                </div>
                                <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-[10px] font-bold italic mb-4">
                                    * {tempServiceTerms.approvalText}
                                </div>
                                <div className="flex items-center gap-2 text-[9px] text-gray-400 font-medium">
                                    <Check size={12} className="text-green-500" /> {tempServiceTerms.kvkkText}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'warehouse_management':
                return <WarehouseManagement />;
            case 'audit_logs':
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Sistem Denetim Günlükleri</h3>
                                <p className="text-sm text-gray-400 font-medium">Sistem üzerinde gerçekleştirilen tüm kritik işlemlerin şeffaf kaydı.</p>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold">
                                <Clock size={16} /> Son 200 İşlem
                            </div>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zaman Damgası</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kullanıcı</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modül / İşlem</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Açıklama</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">IP Adresi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {auditLogs.length > 0 ? (
                                        auditLogs.map((log) => (
                                            <tr key={log._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-bold text-gray-900">{new Date(log.createdAt).toLocaleDateString('tr-TR')}</span>
                                                        <span className="text-[11px] text-gray-400 font-medium">{new Date(log.createdAt).toLocaleTimeString('tr-TR')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[13px] font-bold text-gray-900">{log.userName}</span>
                                                        <span className="text-[11px] text-gray-400 font-medium">{log.userEmail}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                            log.module === 'AUTH' ? 'bg-amber-50 text-amber-600' :
                                                            log.module === 'INVENTORY' ? 'bg-blue-50 text-blue-600' :
                                                            log.module === 'REPAIR' ? 'bg-emerald-50 text-emerald-600' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {log.module}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-gray-500">{log.action}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-[13px] text-gray-600 font-medium max-w-md truncate" title={log.details}>
                                                        {log.details}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-[11px] font-mono font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                                        {log.ipAddress}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                                        <Clock size={24} />
                                                    </div>
                                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Henüz günlük kaydı bulunmuyor</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'device_models':
                return <DeviceModels />;
        }
    };

    const settingsTabs = [
        { id: 'general', label: 'Kurumsal Kimlik', icon: Building },
        { id: 'locations', label: 'Mağaza Ağı', icon: MapPin },
        { id: 'users', label: 'Ekip & Erişim', icon: Users },
        { id: 'warehouse_management', label: 'Ambar Yönetimi', icon: Package },
        { id: 'kbb_history', label: 'KBB Arşivi', icon: Store },
        { id: 'device_models', label: 'Cihaz Modelleri', icon: Smartphone },
        { id: 'earnings', label: 'Hakediş Kayıtları', icon: CreditCard },
        { id: 'notifications', label: 'E-Posta & SMTP', icon: Mail },
        { id: 'service_terms', label: 'Servis Metinleri', icon: MessageSquare },
        { id: 'security', label: 'Sistem Güvenliği', icon: Shield },
        { id: 'audit_logs', label: 'Sistem Günlükleri', icon: Clock },
        { id: 'roles', label: 'Yetki ve İzinler', icon: Key },
        { id: 'updates', label: 'Yazılım Güncelleme', icon: RefreshCw },
    ];

    const activeTitle = (
        activeTab === 'users' ? 'Personel & Rol Yönetimi' :
        activeTab === 'locations' ? 'Mağaza & Lokasyon Ağı' :
        activeTab === 'notifications' ? 'E-Posta & SMTP Yapısı' :
        activeTab === 'warehouse_management' ? 'Ambar & Lojistik Yönetimi' :
        activeTab === 'stock' ? 'Envanter Veritabanı' :
        activeTab === 'device_models' ? 'Cihaz Modelleri Veritabanı' :
        activeTab === 'updates' ? 'Yazılım Güncelleme' :
        activeTab === 'roles' ? 'Yetki ve Rol Yönetimi' :
        activeTab === 'service_terms' ? 'Servis Onay & Gizlilik' :
        (settingsTabs.find(t => t.id === activeTab)?.label || 'Genel Sistem Ayarları')
    );

    return (
        <div className="animate-fade-in -mx-6 w-[calc(100%+3rem)] px-4">
            {/* Mobil sekme şeridi (yatay kaydırmalı) */}
            <div className="lg:hidden -mx-4 px-4 mb-4 overflow-x-auto custom-scrollbar">
                <div className="flex gap-2 w-max pb-1">
                    {settingsTabs.map((item) => {
                        const active = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all border ${
                                    active ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-sm' : 'bg-white text-gray-600 border-gray-200'
                                }`}
                            >
                                <item.icon size={15} /> {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* İki-pano: masaüstünde ekran yüksekliğine oranlı, her pano kendi içinde kayar */}
            <div className="flex gap-6 lg:h-[calc(100vh-9.5rem)]">
                {/* Sol Menü (masaüstü) */}
                <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5 shrink-0">
                        <div className="w-8 h-8 bg-[#1d1d1f] text-white rounded-lg flex items-center justify-center">
                            <Settings2 size={16} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-bold text-[#1d1d1f] leading-none">Sistem Ayarları</h3>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Yönetim Menüsü</span>
                        </div>
                    </div>
                    <nav className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
                        {settingsTabs.map((item) => {
                            const active = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all group ${
                                        active ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'text-gray-600 hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
                                    }`}
                                >
                                    <item.icon size={17} className={active ? 'text-[#0071e3]' : 'text-gray-400 group-hover:text-gray-600'} />
                                    <span className="flex-1 text-left truncate">{item.label}</span>
                                    {active && <div className="w-1.5 h-1.5 rounded-full bg-[#0071e3] shrink-0"></div>}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* İçerik: sabit başlık + kayan gövde */}
                <main className="flex-1 min-w-0 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[60vh]">
                    <div className="px-6 md:px-8 py-5 border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-[#0071e3] uppercase tracking-widest">GSX Portal</span>
                            <ChevronRight size={12} className="text-gray-300" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sistem Ayarları</span>
                        </div>
                        <h2 className="text-2xl font-bold text-[#1d1d1f] tracking-tight">{activeTitle}</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
                        {renderTabContent()}
                    </div>
                </main>
            </div>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </div>
    );
};

export default Settings;
