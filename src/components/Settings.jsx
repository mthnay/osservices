/* eslint-disable no-case-declarations, react-hooks/rules-of-hooks, no-undef */
import React, { useState } from 'react';
import { Save, Bell, Shield, Store, Globe, CreditCard, MapPin, Plus, Trash2, Building, Users, UserPlus, Mail, Lock, Paperclip, Check, Upload, X, ChevronRight, Package, AlertTriangle, Key, Clock, RefreshCw, MessageSquare, Smartphone, Edit } from 'lucide-react';
import { appConfirm } from '../utils/alert';
import { useAppContext } from '../context/AppContext';
import Swal from 'sweetalert2';
import ConfirmationModal from './ConfirmationModal';
import MyPhoneIcon from './LocalIcons';
import { isSuperAdmin, isYonetici, ROLE_DISPLAY_NAMES } from '../utils/permissions';

const Settings = () => {
    const {
        servicePoints, allServicePoints, addServicePoint, removeServicePoint, updateServicePoint,
        users, addUser, updateUser, removeUser, currentUser,
        // eslint-disable-next-line no-unused-vars
        updateCustomer, removeCustomer,
        emailSettings, setEmailSettings,
        companyProfile, setCompanyProfile,
        notificationSettings, setNotificationSettings,
        notificationTemplates, setNotificationTemplates,
        earnings, addEarning,
        roles, addRole, updateRole, deleteRole,
        serviceTerms, setServiceTerms,
        // eslint-disable-next-line no-unused-vars
        inventory, updateInventoryItem,
        deviceModels, addDeviceModel, updateDeviceModel, removeDeviceModel
    } = useAppContext();

    const [activeTab, setActiveTab] = useState('general');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // --- Device Model Management States ---
    const [showDeviceModelModal, setShowDeviceModelModal] = useState(false);
    const [editingDeviceModel, setEditingDeviceModel] = useState(null);
    const [deviceModelForm, setDeviceModelForm] = useState({
        name: '',
        type: 'iPhone',
        configurations: '',
        colors: ''
    });

    // Earnings Form State
    const [showEarningsModal, setShowEarningsModal] = useState(false);
    const [newEarning, setNewEarning] = useState({ storeId: '', month: '', amount: '' });

    // --- Stock Transfer States ---
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferForm, setTransferForm] = useState({
        sourceStoreId: '',
        targetStoreId: '',
        itemId: '',
        serialNumbers: [],
        serialType: 'kgb'
    });

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

    const handleExecuteTransfer = async () => {
        const { sourceStoreId, targetStoreId, itemId, serialNumbers, serialType } = transferForm;
        
        if (!sourceStoreId || !targetStoreId || !itemId || serialNumbers.length === 0) {
            Swal.fire('Hata', 'Lütfen tüm alanları doldurun ve en az bir seri numarası seçin.', 'error');
            return;
        }

        if (sourceStoreId === targetStoreId) {
            Swal.fire('Hata', 'Kaynak ve hedef mağaza aynı olamaz.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/inventory/transfer-serial', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sourceItemId: itemId,
                    targetStoreId: parseInt(targetStoreId),
                    serialNumbers,
                    serialType
                })
            });

            const data = await response.json();
            if (data.success) {
                Swal.fire({
                    title: 'Başarılı!',
                    text: 'Stok transferi başarıyla tamamlandı.',
                    icon: 'success',
                    timer: 2000
                }).then(() => {
                    setShowTransferModal(false);
                    // Refresh data
                    window.location.reload();
                });
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Swal.fire('Hata', 'Transfer işlemi başarısız: ' + error.message, 'error');
        }
    };

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

    const handleSaveDeviceModel = async () => {
        if (!deviceModelForm.name.trim()) {
            Swal.fire('Hata', 'Lütfen cihaz model adını giriniz.', 'error');
            return;
        }

        const payload = {
            name: deviceModelForm.name.trim(),
            type: deviceModelForm.type,
            configurations: deviceModelForm.configurations
                .split(',')
                .map(c => c.trim())
                .filter(c => c.length > 0),
            colors: deviceModelForm.colors
                .split(',')
                .map(c => c.trim())
                .filter(c => c.length > 0)
        };

        let success;
        if (editingDeviceModel) {
            success = await updateDeviceModel(editingDeviceModel._id || editingDeviceModel.id, payload);
        } else {
            success = await addDeviceModel(payload);
        }

        if (success) {
            setShowDeviceModelModal(false);
            setDeviceModelForm({ name: '', type: 'iPhone', configurations: '', colors: '' });
            setEditingDeviceModel(null);
        }
    };

    const handleDeleteDeviceModel = async (model) => {
        const confirmed = await Swal.fire({
            title: 'Emin misiniz?',
            text: `${model.name} modeli silinecektir. Bu işlem geri alınamaz!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil!',
            cancelButtonText: 'İptal',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        });

        if (confirmed.isConfirmed) {
            const success = await removeDeviceModel(model._id || model.id);
            if (success) {
                Swal.fire('Silindi!', 'Cihaz modeli başarıyla silindi.', 'success');
            }
        }
    };


    // --- Role Management ---
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [roleForm, setRoleForm] = useState({ name: '', displayName: '', permissions: [] });

    const availablePermissions = [
        { id: 'view_all_stores', label: 'Tüm Mağazaları Gör' },
        { id: 'manage_settings', label: 'Sistem Settingsı Yönetimi (Admin)' },
        { id: 'manage_users', label: 'Kullanıcı Yönetimi' },
        { id: 'manage_stock', label: 'Stok Yönetimi' },
        { id: 'view_dashboard', label: 'Dashboard Görüntüleme' },
        { id: 'edit_repairs', label: 'Servis Kayıtlarını Düzenle' },
        { id: 'delete_repairs', label: 'Servis Kayıtlarını Sil' },
        { id: 'view_earnings', label: 'Ciro / Gelir Gör' },
        { id: 'create_repair', label: 'Yeni Servis Kaydı Aç' },
        { id: 'view_own_repairs', label: 'Sadece Kendi Kayıtlarını Gör' }
    ];

    const handleSaveRole = async () => {
        if (!roleForm.name || !roleForm.displayName) {
            Swal.fire('Hata', 'Lütfen rol adı ve görünen adı doldurun.', 'error');
            return;
        }
        let success;
        if (editingRole) {
            success = await updateRole(editingRole._id, roleForm);
        } else {
            success = await addRole(roleForm);
        }
        if (success) {
            Swal.fire('Başarılı', `Rol başarıyla ${editingRole ? 'güncellendi' : 'eklendi'}.`, 'success');
            setShowRoleModal(false);
            setRoleForm({ name: '', displayName: '', permissions: [] });
            setEditingRole(null);
        }
    };

    const handleDeleteRole = async (role) => {
        if (role.isSystem) return;
        const confirmed = await Swal.fire({
            title: 'Emin misiniz?',
            text: `${role.displayName} rolü silinecek.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil!',
            cancelButtonText: 'İptal'
        });
        if (confirmed.isConfirmed) {
            const success = await deleteRole(role._id);
            if (success) {
                Swal.fire('Silindi', 'Rol başarıyla silindi.', 'success');
            }
        }
    };

    // --- User Form ---
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'technician', storeId: 1 });
    
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
        addUser({
            ...newUser,
            storeId: parseInt(newUser.storeId),
            avatar: newUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        });
        setNewUser({ name: '', email: '', password: '', role: 'technician', storeId: 1 });
    };

    const handleUpdateUser = async () => {
        try {
            console.log("Güncellenecek Kullanıcı ID:", editingUserId);
            console.log("Gönderilecek Veri:", editUserData);

            // ID alanlarını ayır ve temizle
            const { _id, id, ...cleanProfile } = editUserData;
            const targetId = _id || id;
            
            const finalData = {
                ...cleanProfile,
                storeId: Number(editUserData.storeId)
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
                // Helper for Ship-To
                const getShipTo = (storeId) => {
                    const point = allServicePoints.find(p => String(p.id) === String(storeId));
                    return point ? point.shipTo : 'Servis Merkezi';
                };

                // Helper for Month Format
                const getMonthYear = (dateStr) => {
                    if (!dateStr || dateStr === '-') return 'Tarihsiz';
                    const parts = dateStr.slice(0, 10).split('.');
                    if (parts.length === 3) {
                        const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                        return date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
                    }
                    return 'Bilinmeyen Tarih';
                };

                const { repairs } = useAppContext();
                const kbbHistory = repairs.flatMap(repair =>
                    (repair.parts || []).map((part, index) => ({
                        ...part,
                        uniqueId: `${repair.id}-${index}`,
                        repairId: repair.id,
                        storeId: repair.storeId,
                        customer: repair.customer,
                        returnTarih: part.returnDate || '-',
                        returnCode: part.returnCode || '-',
                        status: part.kbbStatus
                    }))
                ).filter(item => item.status === 'Returned');

                // Grouping Logic
                const groupedHistory = kbbHistory.reduce((acc, item) => {
                    const shipTo = getShipTo(item.storeId);
                    const monthYear = getMonthYear(item.returnDate);

                    if (!acc[shipTo]) acc[shipTo] = {};
                    if (!acc[shipTo][monthYear]) acc[shipTo][monthYear] = [];

                    acc[shipTo][monthYear].push(item);
                    return acc;
                }, {});

                return (
                    <div className="space-y-8 animate-fade-in">
                        {Object.keys(groupedHistory).length > 0 ? (
                            Object.entries(groupedHistory).map(([shipTo, months]) => (
                                <div key={shipTo} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="bg-gray-900 px-8 py-5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/10 rounded-md flex items-center justify-center text-white">
                                                <Store size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">{shipTo}</h3>
                                                <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Lokasyon Bazlı İadeler</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        {Object.entries(months).map(([month, items]) => (
                                            <div key={month} className="border border-gray-100 rounded-md overflow-hidden bg-gray-50/30">
                                                <div className="px-6 py-3 bg-gray-100/80 border-b border-gray-100 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                    <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{month}</span>
                                                    <span className="ml-auto bg-white px-2 py-0.5 rounded-lg text-[10px] font-bold text-gray-400 border border-gray-200">{items.length} Parça</span>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-white text-[10px] font-semibold text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                                                            <tr>
                                                                <th className="px-6 py-3">Onarım No</th>
                                                                <th className="px-6 py-3">Parça Adı</th>
                                                                <th className="px-6 py-3">KBB Seri No</th>
                                                                <th className="px-6 py-3">İade Kodu</th>
                                                                <th className="px-6 py-3">İade Tarihi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 bg-white">
                                                            {items.map(item => (
                                                                <tr key={item.uniqueId} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="px-6 py-3 font-mono text-xs font-bold text-blue-600">{item.repairId}</td>
                                                                    <td className="px-6 py-3">
                                                                        <div className="font-bold text-gray-900 text-xs">{item.description || item.name}</div>
                                                                        <div className="text-[10px] text-gray-400 font-mono">{item.partNumber}</div>
                                                                    </td>
                                                                    <td className="px-6 py-3 font-mono text-[10px] text-gray-500">{item.kbbSerial || '-'}</td>
                                                                    <td className="px-6 py-3"><span className="font-mono text-[10px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{item.returnCode}</span></td>
                                                                    <td className="px-6 py-3 text-gray-500 text-[10px] font-medium">{item.returnDate}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-lg p-12 text-center text-gray-400">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Package size={32} className="opacity-50" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Kayıt Bulunamadı</h3>
                                <p className="text-sm">Henüz iade edilmiş bir KBB parçası bulunmuyor.</p>
                            </div>
                        )}
                    </div>
                );
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
                        {/* Kullanıcı Ekleme Formu */}
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

                                <div className="relative">
                                    <select
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none font-medium text-gray-700"
                                        value={newUser.storeId} onChange={e => setNewUser({ ...newUser, storeId: e.target.value })}
                                    >
                                        {allServicePoints.map(sp => (
                                            <option key={sp.id} value={sp.id}>{sp.name}</option>
                                        ))}
                                    </select>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={16} />
                                </div>

                                <button onClick={handleAddUser} className="bg-gray-900 text-white px-6 py-3 rounded-md font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl">Hesap Oluştur</button>
                            </div>
                        </div>

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
                                                    <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide pl-1">E-Posta & Şifre</label>
                                                    <div className="flex flex-col gap-1">
                                                        <input className="w-full px-4 py-2 bg-white rounded-md border border-gray-200 focus:border-indigo-500 outline-none transition-all font-bold text-xs" value={editUserData.email} onChange={e => setEditUserData({ ...editUserData, email: e.target.value })} />
                                                        <input className="w-full px-4 py-2 bg-white rounded-md border border-gray-200 focus:border-indigo-500 outline-none transition-all font-bold text-xs" value={editUserData.password} onChange={e => setEditUserData({ ...editUserData, password: e.target.value })} placeholder="Yeni şifre..." />
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
                                                        <select className="w-full px-4 py-2 bg-white rounded-md border border-gray-200 outline-none font-semibold text-[10px] uppercase" value={editUserData.storeId} onChange={e => setEditUserData({ ...editUserData, storeId: Number(e.target.value) })}>
                                                            <option value="0">GENEL MERKEZ</option>
                                                            {allServicePoints.map(sp => (
                                                                <option key={sp.id} value={sp.id}>{sp.name.toUpperCase()}</option>
                                                            ))}
                                                        </select>
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
                                                            <span className="text-[9px] font-semibold bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg border border-gray-100 uppercase tracking-wider">
                                                                {store ? store.name : 'Genel Merkez'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-400 font-bold mt-1 tracking-tight">{u.email}</p>
                                                </div>

                                                <div className="shrink-0 flex items-center gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-gray-50 w-full md:w-auto justify-end">
                                                    {/* Yönetici, SuperAdmin hesaplarını düzenleyemez */}
                                                    {!(isYonetici(currentUser) && isSuperAdmin(u)) && (
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
                                                    {u.id !== currentUser?.id && u._id !== currentUser?._id && !(isYonetici(currentUser) && isSuperAdmin(u)) && (
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
                return (
                    <div className="space-y-8 animate-fade-in max-w-4xl">
                        <div className="bg-gradient-to-br from-indigo-900 to-gray-900 p-10 rounded-lg text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl text-white"></div>
                            <div className="relative z-10">
                                <h4 className="text-2xl font-semibold mb-2 flex items-center gap-3">
                                    <Lock size={28} className="text-indigo-400" />
                                    Güvenlik ve Erişim Kontrolü
                                </h4>
                                <p className="text-indigo-200/70 font-medium">Hesap güvenliğinizi ve sistem yetki seviyelerini buradan yönetin.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white rounded-lg border border-gray-100 p-8 shadow-sm">
                                <h5 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                    <Key size={20} className="text-orange-500" /> Şifre Değiştir
                                </h5>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide pl-1">Mevcut Şifre</label>
                                        <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-gray-50 rounded-md border border-transparent focus:bg-white focus:border-orange-500 outline-none transition-all font-mono" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide pl-1">Yeni Şifre</label>
                                        <input type="password" placeholder="••••••••" className="w-full px-4 py-3 bg-gray-50 rounded-md border border-transparent focus:bg-white focus:border-orange-500 outline-none transition-all font-mono" />
                                    </div>
                                    <button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-md font-semibold text-xs shadow-lg shadow-orange-100 transition-all active:scale-95 mt-2">
                                        ŞİFREYİ GÜNCELLE
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50/50 rounded-lg border border-gray-100 p-8">
                                <h5 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                    <Bell size={20} className="text-indigo-500" /> Oturum Bilgileri
                                </h5>
                                <div className="space-y-5">
                                    {[
                                        { label: 'Son Giriş', value: 'Bugün, 14:23', icon: Clock },
                                        { label: 'IP Adresi', value: '176.234.XX.XX', icon: Globe },
                                        { label: 'Cihaz', value: 'macOS - Chrome', icon: Phone }
                                    ].map((stat, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-200/50 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-md shadow-sm">
                                                    <stat.icon size={16} className="text-gray-400" />
                                                </div>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</span>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-700">{stat.value}</span>
                                        </div>
                                    ))}
                                    <button className="w-full bg-white hover:bg-red-50 text-red-500 py-3 rounded-md font-semibold text-xs border border-red-100 transition-all active:scale-95 mt-4">
                                        TÜM OTURUMLARI KAPAT
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-red-50/30 rounded-lg border border-red-100 p-8 flex flex-col justify-between">
                                <div>
                                    <h5 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                                        <RefreshCw size={20} className="text-red-600" /> Sunucu Yönetimi
                                    </h5>
                                    <p className="text-xs text-red-700/60 font-medium leading-relaxed mb-6">
                                        Sistem hatası veya performans düşüklüğü durumunda ana sunucu işlemini buradan yeniden başlatabilirsiniz.
                                    </p>
                                </div>
                                <button 
                                    onClick={handleReboot}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-md font-semibold text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <RefreshCw size={16} /> SUNUCUYU YENİDEN BAŞLAT
                                </button>
                            </div>
                        </div>
                    </div>
                );
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
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center bg-white p-8 rounded-lg border border-gray-100 shadow-sm">
                            <div>
                                <h4 className="text-xl font-semibold text-gray-900 leading-none">Yetki Grupları (Roller)</h4>
                                <p className="text-gray-500 text-sm mt-2 font-medium">Sistemdeki kullanıcıların yetki düzeylerini buradan yönetin.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingRole(null);
                                    setRoleForm({ name: '', displayName: '', permissions: [] });
                                    setShowRoleModal(true);
                                }}
                                className="bg-gray-900 text-white px-8 py-3.5 rounded-md font-semibold text-xs hover:bg-black transition-all shadow-xl shadow-gray-200 hover:-translate-y-1 active:scale-95 flex items-center gap-2 text-xs uppercase tracking-wide"
                            >
                                <Plus size={18} /> Yeni Rol Oluştur
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {(roles || []).map((role) => (
                                <div key={role._id} className="bg-white rounded-lg border border-gray-100 p-8 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                    {role.isSystem && (
                                        <div className="absolute top-0 right-0 px-4 py-1.5 bg-gray-100 text-gray-400 text-[9px] font-semibold text-xs uppercase tracking-wide rounded-bl-2xl">
                                            SİSTEM
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-md flex items-center justify-center">
                                            <Shield size={28} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold text-gray-900">{role.displayName}</h4>
                                            <p className="text-xs font-mono text-gray-400 font-bold">{role.name}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-8">
                                        <p className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide mb-3">Aktif Yetkiler ({role.permissions?.length || 0})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {role.permissions?.slice(0, 4).map(p => (
                                                <span key={p} className="bg-gray-50 text-gray-500 text-[9px] font-bold px-2 py-1 rounded-lg border border-gray-100 uppercase">
                                                    {availablePermissions.find(ap => ap.id === p)?.label || p}
                                                </span>
                                            ))}
                                            {role.permissions?.length > 4 && (
                                                <span className="text-[9px] font-bold text-gray-400 ml-1">+{role.permissions.length - 4} Daha</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-gray-50">
                                        {!(isYonetici(currentUser) && (role.name?.toLowerCase() === 'superadmin' || role.name?.toLowerCase() === 'admin')) ? (
                                            <button
                                                onClick={() => {
                                                    setEditingRole(role);
                                                    setRoleForm({ ...role });
                                                    setShowRoleModal(true);
                                                }}
                                                className="flex-1 bg-gray-50 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 py-3 rounded-md font-semibold text-[10px] text-xs uppercase tracking-wide transition-all"
                                            >
                                                DÜZENLE
                                            </button>
                                        ) : (
                                            <span className="flex-1 text-center py-3 bg-gray-50 text-orange-400 font-bold text-[10px] text-xs uppercase rounded-md border border-orange-100/50">
                                                KİLİTLİ
                                            </span>
                                        )}
                                        {!role.isSystem && !(isYonetici(currentUser) && (role.name?.toLowerCase() === 'superadmin' || role.name?.toLowerCase() === 'admin')) && (
                                            <button
                                                onClick={() => handleDeleteRole(role)}
                                                className="w-12 h-12 flex items-center justify-center bg-gray-50 hover:bg-red-50 text-gray-300 hover:text-red-600 rounded-md transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Role Modal */}
                        {showRoleModal && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                                <div className="bg-white rounded-lg w-full max-w-2xl p-10 shadow-2xl animate-scale-up border border-white/20">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-2xl font-semibold text-gray-900">{editingRole ? 'Rolü Düzenle' : 'Yeni Rol Oluştur'}</h3>
                                        <button onClick={() => setShowRoleModal(false)} className="w-12 h-12 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-md flex items-center justify-center transition-all">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mb-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-1">Sistem Adı (ID)</label>
                                            <input
                                                type="text"
                                                disabled={!!editingRole}
                                                value={roleForm.name}
                                                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                                                placeholder="Orn: ServiceManager"
                                                className="w-full px-5 py-4 bg-gray-50 rounded-[20px] border border-transparent focus:bg-white focus:border-rose-500 outline-none transition-all font-mono font-bold text-sm disabled:opacity-50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-1">Görünen Ad</label>
                                            <input
                                                type="text"
                                                value={roleForm.displayName}
                                                onChange={(e) => setRoleForm({ ...roleForm, displayName: e.target.value })}
                                                placeholder="Orn: Servis Müdürü"
                                                className="w-full px-5 py-4 bg-gray-50 rounded-[20px] border border-transparent focus:bg-white focus:border-rose-500 outline-none transition-all font-bold text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-10">
                                        <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-1">İzinleri Seçin</label>
                                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {availablePermissions.map(p => (
                                                <label key={p.id} className={`flex items-center gap-3 p-4 rounded-md border transition-all cursor-pointer ${roleForm.permissions.includes(p.id) ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-white hover:border-gray-200'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={roleForm.permissions.includes(p.id)}
                                                        onChange={(e) => {
                                                            const newPerms = e.target.checked
                                                                ? [...roleForm.permissions, p.id]
                                                                : roleForm.permissions.filter(id => id !== p.id);
                                                            setRoleForm({ ...roleForm, permissions: newPerms });
                                                        }}
                                                        className="w-5 h-5 rounded-lg text-rose-600 focus:ring-rose-500 border-gray-300"
                                                    />
                                                    <span className="text-xs font-semibold uppercase tracking-tight">{p.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setShowRoleModal(false)}
                                            className="flex-1 py-5 rounded-lg font-semibold text-[11px] uppercase tracking-[0.2em] text-gray-400 hover:text-gray-900 transition-all"
                                        >
                                            VAZGEÇ
                                        </button>
                                        <button
                                            onClick={handleSaveRole}
                                            className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white py-5 rounded-lg font-semibold text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-rose-200 transition-all active:scale-95"
                                        >
                                            {editingRole ? 'GÜNCELLEMELERİ KAYDET' : 'ROLÜ OLUŞTUR'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
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
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {servicePoints.map(point => {
                                const storeStock = inventory.filter(i => String(i.storeId) === String(point.id));
                                const kgbCount = storeStock.filter(i => i.category !== 'loaner').reduce((sum, i) => sum + (i.quantity || 0), 0);
                                const loanerCount = storeStock.filter(i => i.category === 'loaner').length;
                                
                                return (
                                    <div key={point.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Package size={80} />
                                        </div>
                                        
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-lg">
                                                {point.name[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">{point.name}</h4>
                                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Ambar Kodu: {point.shipTo}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">STOK (KGB)</p>
                                                <p className="text-xl font-bold text-gray-900">{kgbCount} Adet</p>
                                            </div>
                                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">EMANET</p>
                                                <p className="text-xl font-bold text-blue-600">{loanerCount} Cihaz</p>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                                            <div className="flex -space-x-2">
                                                {[1,2,3].map(i => (
                                                    <div key={i} className={`w-6 h-6 rounded-full border-2 border-white bg-gray-${100 * i}`}></div>
                                                ))}
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    Swal.fire({
                                                        title: `${point.name} Ambar Detayı`,
                                                        html: `<div class="text-left text-sm">Bu ambar şu an aktif ve ${kgbCount} parça barındırıyor. Stok transfer modülü yakında eklenecektir.</div>`,
                                                        icon: 'info',
                                                        confirmButtonColor: '#111827'
                                                    });
                                                }}
                                                className="text-xs font-bold text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors"
                                            >
                                                Ambarı Yönet <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-gray-900 rounded-[32px] p-10 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                <div>
                                    <h4 className="text-2xl font-bold mb-2">Ambarlar Arası Stok Transferi</h4>
                                    <p className="text-gray-400 max-w-md text-sm leading-relaxed">Şubeler arası parça transferlerini buradan yönetebilir, ambarlar arası dengelemeyi sağlayabilirsiniz. (Sadece Admin yetkisi ile)</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setTransferForm({
                                            sourceStoreId: '',
                                            targetStoreId: '',
                                            itemId: '',
                                            serialNumbers: [],
                                            serialType: 'kgb'
                                        });
                                        setShowTransferModal(true);
                                    }}
                                    className="px-8 py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all flex items-center gap-2 shadow-xl"
                                >
                                    <RefreshCw size={20} /> Transfer Başlat
                                </button>
                            </div>
                        </div>
                    </div>
                );
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
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center bg-white p-8 rounded-lg border border-gray-100 shadow-sm">
                            <div>
                                <h4 className="text-xl font-semibold text-gray-900 leading-none">Cihaz Model Tanımları</h4>
                                <p className="text-gray-500 text-sm mt-2 font-medium">Servis kabul ekranındaki cihaz model tahmini ve konfigürasyon seçeneklerini yönetin.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingDeviceModel(null);
                                    setDeviceModelForm({ name: '', type: 'iPhone', configurations: '', colors: '' });
                                    setShowDeviceModelModal(true);
                                }}
                                className="bg-gray-900 text-white px-8 py-3.5 rounded-md font-semibold text-xs hover:bg-black transition-all shadow-xl shadow-gray-200 hover:-translate-y-1 active:scale-95 flex items-center gap-2 text-xs uppercase tracking-wide"
                            >
                                <Plus size={18} /> Yeni Model Ekle
                            </button>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cihaz Modeli</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tür</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Seçenekler / Kapasite</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Renkler</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {deviceModels && deviceModels.length > 0 ? (
                                            deviceModels.map((model) => (
                                                <tr key={model._id || model.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                                                        {model.name}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                            model.type === 'iPhone' ? 'bg-blue-50 text-blue-600' :
                                                            model.type === 'iPad' ? 'bg-purple-50 text-purple-600' :
                                                            model.type === 'Mac' ? 'bg-orange-50 text-orange-600' :
                                                            model.type === 'Watch' ? 'bg-emerald-50 text-emerald-600' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {model.type || 'Diğer'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {model.configurations && model.configurations.map((config, idx) => (
                                                                <span key={idx} className="bg-gray-100 text-gray-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                                                    {config}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {model.colors && model.colors.map((color, idx) => (
                                                                <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-100/50 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                                                    {color}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingDeviceModel(model);
                                                                    setDeviceModelForm({
                                                                        name: model.name,
                                                                        type: model.type || 'iPhone',
                                                                        configurations: model.configurations?.join(', ') || '',
                                                                        colors: model.colors?.join(', ') || ''
                                                                    });
                                                                    setShowDeviceModelModal(true);
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                                                                title="Düzenle"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteDeviceModel(model)}
                                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                                                title="Sil"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                                            <Smartphone size={24} />
                                                        </div>
                                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Kayıtlı cihaz modeli bulunmuyor</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Add/Edit Device Model Modal */}
                        {showDeviceModelModal && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                                <div className="bg-white rounded-lg w-full max-w-xl p-8 shadow-2xl animate-scale-up border border-white/20">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-xl font-semibold text-gray-900">{editingDeviceModel ? 'Cihaz Modelini Düzenle' : 'Yeni Cihaz Modeli Ekle'}</h3>
                                        <button onClick={() => setShowDeviceModelModal(false)} className="w-10 h-10 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-md flex items-center justify-center transition-all">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-1">Cihaz Model Adı</label>
                                            <input
                                                type="text"
                                                value={deviceModelForm.name}
                                                onChange={(e) => setDeviceModelForm({ ...deviceModelForm, name: e.target.value })}
                                                placeholder="Orn: iPhone 15 Pro"
                                                className="w-full px-4 py-3 bg-gray-50 rounded-md border border-gray-200 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-sm text-gray-900"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-1">Cihaz Türü</label>
                                            <select
                                                value={deviceModelForm.type}
                                                onChange={(e) => setDeviceModelForm({ ...deviceModelForm, type: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 rounded-md border border-gray-200 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-sm text-gray-700"
                                            >
                                                <option value="iPhone">iPhone</option>
                                                <option value="iPad">iPad</option>
                                                <option value="Mac">Mac</option>
                                                <option value="Watch">Watch</option>
                                                <option value="Aksesuar">Aksesuar</option>
                                                <option value="Diğer">Diğer</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-1">Kapasite / Konfigürasyon Seçenekleri (Virgülle ayırın)</label>
                                            <input
                                                type="text"
                                                value={deviceModelForm.configurations}
                                                onChange={(e) => setDeviceModelForm({ ...deviceModelForm, configurations: e.target.value })}
                                                placeholder="Orn: 128GB, 256GB, 512GB, 1TB"
                                                className="w-full px-4 py-3 bg-gray-50 rounded-md border border-gray-200 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-sm text-gray-800"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-1">Renk Seçenekleri (Virgülle ayırın)</label>
                                            <input
                                                type="text"
                                                value={deviceModelForm.colors}
                                                onChange={(e) => setDeviceModelForm({ ...deviceModelForm, colors: e.target.value })}
                                                placeholder="Orn: Uzay Siyahı, Gümüş, Altın"
                                                className="w-full px-4 py-3 bg-gray-50 rounded-md border border-gray-200 focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-sm text-gray-800"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowDeviceModelModal(false)}
                                            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-md text-xs uppercase tracking-wider transition-all"
                                        >
                                            Vazgeç
                                        </button>
                                        <button
                                            onClick={handleSaveDeviceModel}
                                            className="flex-2 bg-gray-900 hover:bg-black text-white py-3 rounded-md font-bold text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95"
                                        >
                                            {editingDeviceModel ? 'Kaydet' : 'Ekle'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto pb-32 animate-fade-in px-4 md:px-8">
            <div className="flex flex-col lg:flex-row gap-8 mt-4">
                {/* Sol Menü: GSX Sidebar */}
                <div className="lg:w-72 shrink-0">
                    <div className="sticky top-24 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-6 py-5 bg-gray-50 border-b border-gray-200">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Sistem Ayarları</h3>
                        </div>
                        <nav className="p-2 space-y-1">
                            {[
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
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-semibold transition-all group ${
                                        activeTab === item.id 
                                        ? 'bg-blue-50 text-blue-700' 
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <item.icon size={18} className={activeTab === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'} />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {activeTab === item.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Sağ İçerik Alanı */}
                <div className="flex-1">
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">GSX Portal</span>
                            <ChevronRight size={12} className="text-gray-300" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Settings</span>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                            {activeTab === 'users' ? 'Personel & Rol Yönetimi' :
                             activeTab === 'locations' ? 'Mağaza & Lokasyon Ağı' :
                             activeTab === 'notifications' ? 'E-Posta & SMTP Yapısı' :
                             activeTab === 'warehouse_management' ? 'Ambar & Lojistik Yönetimi' :
                             activeTab === 'stock' ? 'Envanter Veritabanı' :
                             activeTab === 'device_models' ? 'Cihaz Modelleri Veritabanı' :
                             activeTab === 'updates' ? 'Yazılım Güncelleme' :
                             activeTab === 'roles' ? 'Yetki ve Rol Yönetimi' :
                             activeTab === 'service_terms' ? 'Servis Onay & Gizlilik' :
                             'Genel Sistem Ayarları'}
                        </h2>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[700px] overflow-hidden">
                        <div className="p-8 md:p-10">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100] flex items-center justify-center p-4 overflow-hidden">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-scale-up border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <RefreshCw size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Stok Transferi Başlat</h3>
                                    <p className="text-xs text-gray-400 font-medium">Ambarlar arası güvenli parça transferi</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTransferModal(false)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-200 rounded-full transition-all">
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto">
                            {/* Step 1: Stores */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Kaynak Ambar</label>
                                    <select 
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                        value={transferForm.sourceStoreId}
                                        onChange={(e) => setTransferForm({...transferForm, sourceStoreId: e.target.value, itemId: '', serialNumbers: []})}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {servicePoints.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Hedef Ambar</label>
                                    <select 
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                        value={transferForm.targetStoreId}
                                        onChange={(e) => setTransferForm({...transferForm, targetStoreId: e.target.value})}
                                    >
                                        <option value="">Seçiniz...</option>
                                        {servicePoints.filter(p => String(p.id) !== String(transferForm.sourceStoreId)).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Step 2: Item Selection */}
                            {transferForm.sourceStoreId && (
                                <div className="space-y-2 animate-fade-in">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Transfer Edilecek Parça</label>
                                    <select 
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                        value={transferForm.itemId}
                                        onChange={(e) => setTransferForm({...transferForm, itemId: e.target.value, serialNumbers: []})}
                                    >
                                        <option value="">Parça Seçiniz...</option>
                                        {inventory.filter(i => String(i.storeId) === String(transferForm.sourceStoreId) && i.quantity > 0).map(i => (
                                            <option key={i._id || i.id} value={i._id || i.id}>{i.name} ({i.partNumber}) - Mevcut: {i.quantity}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Step 3: Serial Selection */}
                            {transferForm.itemId && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Seri Numaraları Seçimi</label>
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Seçilen: {transferForm.serialNumbers.length}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        {(inventory.find(i => (i._id || i.id) === transferForm.itemId)?.kgbSerials || []).map(sn => (
                                            <label key={sn} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-blue-300 transition-all group">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                    checked={transferForm.serialNumbers.includes(sn)}
                                                    onChange={(e) => {
                                                        const sns = e.target.checked 
                                                            ? [...transferForm.serialNumbers, sn]
                                                            : transferForm.serialNumbers.filter(s => s !== sn);
                                                        setTransferForm({...transferForm, serialNumbers: sns});
                                                    }}
                                                />
                                                <span className="text-xs font-mono font-bold text-gray-700 group-hover:text-blue-600">{sn}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
                            <button
                                onClick={() => setShowTransferModal(false)}
                                className="flex-1 py-4 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleExecuteTransfer}
                                disabled={!transferForm.targetStoreId || !transferForm.itemId || transferForm.serialNumbers.length === 0}
                                className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} />
                                Transferi Gerçekleştir
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
