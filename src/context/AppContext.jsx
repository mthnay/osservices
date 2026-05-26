import React, { createContext, useContext, useState, useEffect } from 'react';
import Toast from '../components/Toast';
import { hasPermission, ROLES, setGlobalRoles } from '../utils/permissions';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {

    const API_URL = import.meta.env.VITE_API_URL ||
        (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:5001/api'
            : '/api');

    const apiFetch = async (url, options = {}) => {
        // Çıkış yapılıyorsa veya token yoksa (ve login/public değilse) istekleri durdur veya sessizce geç
        if (window.isLoggingOut) {
            return new Response(JSON.stringify([]), { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = sessionStorage.getItem('token');
        
        // Token yoksa ve korumalı bir route ise sunucuya gitmeden durdur (çıkış aşamasında olabiliriz)
        if (!token && !url.includes('/login') && !url.includes('/forgot-password') && !url.includes('/track')) {
            return new Response(JSON.stringify([]), { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const headers = {
            ...options.headers,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        try {
            const res = await fetch(url, { ...options, headers });
            
            if (res.status === 401 && !url.includes('/login') && !url.includes('/forgot-password')) {
                const currentToken = sessionStorage.getItem('token');
                if (currentToken && !window.isLoggingOut) {
                    sessionStorage.clear();
                    setCurrentUser(null);
                    window.location.href = '/';
                    // Hata fırlatmak yerine sadece durdurabiliriz veya yönlendirme yeterli
                    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
                }
            }
            return res;
        } catch (error) {
            if (window.isLoggingOut) {
                return new Response(JSON.stringify([]), { status: 200 });
            }
            throw error;
        }
    };

    const [servicePoints, setServicePoints] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = sessionStorage.getItem('currentUser');
            if (saved && saved !== 'undefined' && saved !== 'null') {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error("Local storage parse error:", e);
            sessionStorage.removeItem('currentUser');
        }
        return null;
    });

    const [emailSettings, setEmailSettings] = useState({
        host: '',
        port: '',
        incomingHost: '',
        incomingPort: '',
        user: '',
        pass: ''
    });

    const [companyProfile, setCompanyProfile] = useState({
        name: "TROY",
        title: "ARTIBİLGİ TEKNOLOJİ BİLİŞİM VE DIŞ TİC. A.Ş.",
        address: "Bağdat Caddesi No:123, 34728 Kadıköy / İstanbul",
        phone: "0216 123 45 67",
        mersis: "0085034123400018",
        dealerCode: "TR-APR-0042"
    });

    const [notificationSettings, setNotificationSettings] = useState({
        requireDamageDescription: false,
        includeDiagnosisInEmail: false
    });

    const [notificationTemplates, setNotificationTemplates] = useState({
        email: {
            status_update: {
                id: 'status_update',
                title: 'Durum Güncellemesi',
                subject: 'Servis Kaydınız Hakkında Bilgilendirme - #{serviceNo}',
                body: 'Sayın {customerName},\n\n{device} cihazınızın servis durumu "{status}" olarak güncellenmiştir.\n\nServis No: #{serviceNo}\nAçıklama: {damageReason}\n\nDetaylı bilgi için müşteri portalımızı ziyaret edebilir veya bizimle iletişime geçebilirsiniz.\n\nİyi günler dileriz,\nTroy Servis Ekibi'
            },
            repair_requote: {
                id: 'repair_requote',
                title: 'Fiyat Teklifi / Onay Bekliyor',
                subject: 'Servis İşlemi İçin Onayınız Bekleniyor - #{serviceNo}',
                body: 'Sayın {customerName},\n\n{device} cihazınızın arıza tespiti tamamlanmıştır.\n\nServis No: #{serviceNo}\nTahmini Onarım Bedeli: {cost} ₺\nTespit Edilen Durum: {damageReason}\n\nİşleme devam edilebilmesi için fiyat teklifini onaylamanız gerekmektedir. Ek detaylar müşteri portalında yer almaktadır.\n\nTeşekkür ederiz,\nTroy Servis Ekibi'
            },
            ready_pickup: {
                id: 'ready_pickup',
                title: 'Teslime Hazır',
                subject: 'Cihazınız Teslim Alınmaya Hazır - #{serviceNo}',
                body: 'Sayın {customerName},\n\n{device} cihazınızın servis işlemleri başarıyla tamamlanmış olup, cihazınız teslime hazırdır.\n\nServis No: #{serviceNo}\nÖdenecek Tutar: {cost} ₺\nYapılan İşlem/Açıklama: {damageReason}\n\nMüsait olduğunuzda servis noktamızdan cihazınızı teslim alabilirsiniz.\n\nİyi günler dileriz,\nTroy Servis Ekibi'
            },
            general_info: {
                id: 'general_info',
                title: 'Genel Bilgilendirme',
                subject: 'Servis Kaydınız ile İlgili Bilgilendirme - #{serviceNo}',
                body: 'Sayın {customerName},\n\n#{serviceNo} kayıt numaralı {device} cihazınız ile ilgili teknik servis ekibimizin bilgilendirmesi aşağıda yer almaktadır:\n\n{damageReason}\n\nİyi günler dileriz,\nTroy Servis Ekibi'
            }
        },
        sms: {
            status_update: 'Sayın {customerName}, {device} cihazinizin durumu "{status}" olarak guncellenmistir. ({damageReason}) Servis No: #{serviceNo}. Bilgi icin: troyservis.com B001',
            repair_requote: 'Sayın {customerName}, #{serviceNo} nolu cihaziniza ait onarim bedeli {cost} TL olarak belirlenmistir. ({damageReason}) Onay icin lutfen donus yapiniz. B001',
            ready_pickup: 'Sayın {customerName}, #{serviceNo} nolu {device} cihazinizin islemleri tamamlanmis olup teslime hazirdir. ({damageReason}) B001',
            general_info: 'Sayın {customerName}, #{serviceNo} nolu {device} cihaziniz ile ilgili bilgilendirme: {damageReason}. B001'
        },
        whatsapp: {
            status_update: '🛡️ *TROY TEKNİK SERVİS* 📱\n\nMerhaba *{customerName}*,\n\n*{device}* cihazınızın onarım süreci güncellendi:\n📍 Durum: *{status}*\n🔢 Servis No: #{serviceNo}\n📝 Açıklama: *{damageReason}*\n\nCanlı takip için: troy.onlar/track?id={serviceNo}',
            repair_requote: '⚠️ *ONAYINIZ BEKLENİYOR* ⚠️\n\nMerhaba *{customerName}*,\n\n#{serviceNo} nolu cihazınız için onarım teklifi hazırlandı:\n💰 Tutar: *{cost} TL*\n📝 Tanı: *{damageReason}*\n\nİşleme devam etmek için lütfen portal üzerinden onay veriniz.',
            ready_pickup: '✅ *CİHAZINIZ HAZIR* ✅\n\nMerhaba *{customerName}*,\n\n#{serviceNo} nolu *{device}* cihazınızın işlemleri tamamlandı! Mesai saatleri içinde teslim alabilirsiniz.\n📝 Ek Bilgi: *{damageReason}*\n\nBekliyoruz! 👋',
            general_info: 'ℹ️ *GENEL BİLGİLENDİRME* ℹ️\n\nMerhaba *{customerName}*,\n\n#{serviceNo} nolu *{device}* cihazınız ile ilgili ekibimizin notu:\n\n📝 *{damageReason}*\n\nİyi günler dileriz.'
        }
    });

    const [selectedStoreId, setSelectedStoreId] = useState(() => {
        try {
            const saved = sessionStorage.getItem('currentUser');
            if (saved && saved !== 'undefined' && saved !== 'null') {
                const user = JSON.parse(saved);
                // SuperAdmin ve Yönetici için varsayılan olarak Tüm Mağazalar (0)
                const role = user.role?.toLowerCase();
                if (role === 'superadmin' || role === 'admin' || role === 'yonetici') {
                    return 0;
                }
                return (user.storeId !== undefined && user.storeId !== null) ? Number(user.storeId) : 0;
            }
        } catch (e) {
            console.error("Store init error:", e);
        }
        return 0;
    });
    const [repairs, setRepairs] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [earnings, setEarnings] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [clearedAlertIds, setClearedAlertIds] = useState([]);
    const [roles, setRoles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [serviceTerms, setServiceTerms] = useState({
        termsTitle: '1. GENEL ŞARTLAR VE KOŞULLAR',
        termsContent: "İşbu sözleşme, Troy Teknik Servis ile müşteri arasında servis girişi yapılan cihazın onarım ve hizmet şartlarını belirler. Cihaz içindeki verilerin yedeklenmesi tamamen müşterinin sorumluluğundadır. Sökülen koruyucu aksesuarların iadesi mümkün değildir. Sıvı temaslı veya darbeli cihazlarda onarım sırasında oluşabilecek riskler müşteriye aittir.",
        approvalText: "Müşteri olarak, yukarıdaki sözleşme metnini ve teknik riskleri okudum, anladım ve cihazımı bu şartlar altında teslim ediyorum.",
        kvkkText: "Kişisel verileriniz KVKK kapsamında işlenmektedir. Aydınlatma metnini okuduğumu kabul ediyorum."
    });

    // SLA Helper
    const checkSLA = (repair) => {
        if (!repair.date || repair.status === 'Teslim Edildi' || repair.status === 'Cihaz Hazır' || repair.status === 'Tamamlandı') return null;
        const parseDateString = (dateStr) => {
            try {
                const [datePart, timePart] = dateStr.split(' ');
                const [day, month, year] = datePart.split('.');
                const isoDate = `${year}-${month}-${day}T${timePart || '00:00:00'}`;
                return new Date(isoDate);
            } catch (e) { return new Date(); }
        };
        const startDate = parseDateString(repair.date);
        const now = new Date();
        const diffHours = (now - startDate) / (1000 * 60 * 60);
        if (repair.status === 'Beklemede') {
            if (diffHours > 48) return { type: 'critical', message: '48 Saati Geçti (Kritik Gecikme)', hours: diffHours };
            if (diffHours > 24) return { type: 'warning', message: '24 Saati Geçti (Gecikme Başladı)', hours: diffHours };
        }
        if (repair.status === 'Müşteri Onayı Bekliyor' && diffHours > 72) {
            return { type: 'info', message: 'Müşteri 3 Gündür Karar Vermedi', hours: diffHours };
        }
        return null;
    };

    const computeAlerts = (repairsList) => {
        const newAlerts = [];
        repairsList.forEach(r => {
            const sla = checkSLA(r);
            if (sla && !clearedAlertIds.includes(r.id)) {
                newAlerts.push({ id: r.id, repair: r, ...sla });
            }
        });
        setAlerts(newAlerts);
    };

    const clearAllAlerts = () => {
        const allIds = alerts.map(a => a.id);
        setClearedAlertIds(prev => [...new Set([...prev, ...allIds])]);
        setAlerts([]);
    };

    useEffect(() => {
        if (repairs.length > 0) computeAlerts(repairs);
    }, [repairs, clearedAlertIds]);

    const uploadMedia = async (file) => {
        try {
            // JPG/PNG Validation
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                throw new Error('Sadece JPG veya PNG formatında görseller yüklenebilir.');
            }

            const formData = new FormData();
            formData.append('file', file);
            const res = await apiFetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                return await res.json(); // Returns { url, id }
            }
            const errorData = await res.json().catch(() => ({ message: 'Sunucu hatası' }));
            throw new Error(errorData.message || 'Yükleme sırasında bir sorun oluştu.');
        } catch (error) {
            console.error("Upload Error:", error);
            throw error; // Hatayı yukarı fırlat ki bileşen yakalasın
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return;
            try {
                const [usersRes, servicePointsRes] = await Promise.all([
                    apiFetch(`${API_URL}/users`),
                    apiFetch(`${API_URL}/service-points`)
                ]);
                if (usersRes.ok) {
                    const fetchedUsers = await usersRes.json();
                    setUsers(fetchedUsers);
                    if (currentUser) {
                        const updatedSelf = fetchedUsers.find(u => u.id === currentUser.id || u._id === currentUser._id);
                        if (updatedSelf) setCurrentUser(updatedSelf);
                    }
                }
                if (servicePointsRes.ok) setServicePoints(await servicePointsRes.json());

                let queryParams = '';
                if (!hasPermission(currentUser, 'view_all_stores') && currentUser.storeId) {
                    queryParams = `?storeId=${currentUser.storeId}`;
                }
                const [repairsRes, inventoryRes, techniciansRes, settingsRes, customersRes, companyRes, earningsRes, notifSetRes, notifTempRes, serviceTermsRes, rolesRes] = await Promise.all([
                    apiFetch(`${API_URL}/repairs${queryParams}`),
                    apiFetch(`${API_URL}/inventory${queryParams}`),
                    apiFetch(`${API_URL}/technicians${queryParams}`),
                    apiFetch(`${API_URL}/settings/emailSettings`),
                    apiFetch(`${API_URL}/customers${queryParams}`),
                    apiFetch(`${API_URL}/settings/companyProfile`),
                    apiFetch(`${API_URL}/earnings${queryParams}`),
                    apiFetch(`${API_URL}/settings/notificationSettings`),
                    apiFetch(`${API_URL}/settings/notificationTemplates`),
                    apiFetch(`${API_URL}/settings/serviceTerms`),
                    apiFetch(`${API_URL}/roles`)
                ]);
                if (repairsRes.ok) {
                    const data = await repairsRes.json();
                    if (Array.isArray(data)) {
                        // Verileri normalize et (serialNumber -> serial, deviceModel -> device)
                        const normalizedData = data.map(r => ({
                            ...r,
                            serial: r.serial || r.serialNumber || '',
                            device: r.device || r.deviceModel || '',
                            tcNo: r.tcNo || r.customerTC || '',
                            customerAddress: r.customerAddress || r.address || ''
                        }));
                        setRepairs(normalizedData);
                    } else {
                        setRepairs([]);
                    }
                }
                if (inventoryRes.ok) {
                    const invData = await inventoryRes.json();
                    setInventory(Array.isArray(invData) ? invData : []);
                }
                if (techniciansRes.ok) {
                    const techData = await techniciansRes.json();
                    setTechnicians(Array.isArray(techData) ? techData : []);
                }
                if (earningsRes.ok) {
                    const earnData = await earningsRes.json();
                    setEarnings(Array.isArray(earnData) ? earnData : []);
                }
                if (settingsRes.ok) {
                    const settings = await settingsRes.json();
                    if (settings) setEmailSettings(settings);
                }
                if (companyRes.ok) {
                    const profile = await companyRes.json();
                    if (profile) setCompanyProfile(profile);
                }
                if (notifSetRes.ok) {
                    const notifSet = await notifSetRes.json();
                    if (notifSet) setNotificationSettings(notifSet);
                }
                if (notifTempRes.ok) {
                    const notifTemp = await notifTempRes.json();
                    if (notifTemp) setNotificationTemplates(notifTemp);
                }
                if (serviceTermsRes.ok) {
                    const terms = await serviceTermsRes.json();
                    if (terms) setServiceTerms(terms);
                }
                if (rolesRes && rolesRes.ok) {
                    const fetchedRoles = await rolesRes.json();
                    setRoles(fetchedRoles);
                    setGlobalRoles(fetchedRoles);
                }
                if (customersRes.ok) {
                    const custData = await customersRes.json();
                    setCustomers(Array.isArray(custData) ? custData : []);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, [currentUser]);

    // Force store restriction for unauthorized users
    useEffect(() => {
        if (currentUser && !hasPermission(currentUser, 'view_all_stores')) {
            const userStoreId = Number(currentUser.storeId);
            if (selectedStoreId === 0 || selectedStoreId === '0' || Number(selectedStoreId) !== userStoreId) {
                console.log("Enforcing store restriction for user:", currentUser.name);
                setSelectedStoreId(userStoreId);
            }
        }
    }, [currentUser, selectedStoreId]);

    useEffect(() => {
        if (currentUser) sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        else sessionStorage.removeItem('currentUser');
    }, [currentUser]);

    const saveSettings = async (key, value) => {
        try {
            await apiFetch(`${API_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });
        } catch (error) { console.error("Error saving settings:", error); }
    };

    const login = async (email, password) => {
        try {
            const res = await apiFetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (res.ok) {
                const data = await res.json();
                setCurrentUser(data.user);

                // SuperAdmin ve Yönetici için varsayılan olarak Tüm Mağazalar (0)
                const role = data.user.role?.toLowerCase();
                if (role === 'superadmin' || role === 'admin' || role === 'yonetici') {
                    setSelectedStoreId(0);
                } else if (data.user.storeId !== undefined && data.user.storeId !== null) {
                    setSelectedStoreId(Number(data.user.storeId));
                }
                sessionStorage.setItem('token', data.token);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Login Error:", error);
            return false;
        }
    };

    const logout = () => {
        try {
            window.isLoggingOut = true;
            sessionStorage.clear();
            setCurrentUser(null);
            window.location.href = '/';
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = '/';
        }
    };

    const addUser = async (user) => {
        try {
            const res = await apiFetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...user, id: user.id || `u${Date.now()}` })
            });
            if (res.ok) {
                const saved = await res.json();
                setUsers(prev => [...prev, saved]);
                return true;
            }
        } catch (error) { console.error("Error adding user:", error); return false; }
    };

    const updateUser = async (id, updates) => {
        try {
            console.log(`[AppContext] Updating user ${id}...`, updates);
            const res = await apiFetch(`${API_URL}/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                const updated = await res.json();
                console.log("[AppContext] Update success:", updated);

                setUsers(prev => prev.map(u => {
                    const uId = String(u._id || u.id);
                    const updatedId = String(updated._id || updated.id);
                    return uId === updatedId ? { ...u, ...updated } : u;
                }));

                const currentId = String(currentUser?._id || currentUser?.id);
                const updatedId = String(updated._id || updated.id);
                if (currentId === updatedId) {
                    setCurrentUser(prev => ({ ...prev, ...updated }));
                    sessionStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...updated }));
                }
                return true;
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error("[AppContext] Update failed on server:", res.status, errorData);
                throw new Error(errorData.message || `Sunucu hatası: ${res.status}`);
            }
        } catch (error) {
            console.error("[AppContext] Network error updating user:", error);
            return false;
        }
    };

    const removeUser = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== id && u._id !== id));
                return true;
            }
            return false;
        } catch (error) { console.error("Error removing user:", error); return false; }
    };

    const addRepair = async (repair) => {
        const newRepairInitial = {
            ...repair,
            tcNo: repair.tcNo || repair.customerTC || '',
            customerAddress: repair.customerAddress || repair.address || '',
            serial: repair.serial || repair.serialNumber || '',
            device: repair.device || repair.deviceModel || '',
            id: repair.id || `TR-${Math.floor(Math.random() * 10000)}`,
            date: new Date().toLocaleString('tr-TR'),
            status: 'Beklemede',
            history: [{ status: 'Kayıt Oluşturuldu', date: new Date().toLocaleString(), note: 'Cihaz servise kabul edildi.' }],
            storeId: parseInt(currentUser?.storeId) || 0
        };
        try {
            const res = await apiFetch(`${API_URL}/repairs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRepairInitial)
            });
            if (res.ok) {
                const saved = await res.json();
                const normalized = {
                    ...saved,
                    serial: saved.serial || saved.serialNumber || repair.serial || repair.serialNumber || '',
                    device: saved.device || saved.deviceModel || repair.device || repair.deviceModel || '',
                    tcNo: saved.tcNo || saved.customerTC || repair.tcNo || repair.customerTC || '',
                    customerAddress: saved.customerAddress || saved.address || repair.customerAddress || repair.address || ''
                };
                setRepairs(prev => [normalized, ...prev]);
                return normalized;
            }
        } catch (error) { console.error("Error adding repair:", error); return null; }
    };

    const removeRepair = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/repairs/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setRepairs(prev => prev.filter(r => r.id !== id && r._id !== id));
                return true;
            }
            return false;
        } catch (error) { console.error("Error removing repair:", error); return false; }
    };

    const updateRepair = async (id, updates) => {
        const repair = repairs.find(r => r.id === id || r._id === id);
        if (!repair) return false;
        let newHistory = repair.history || [];
        const extraUpdates = {};

        if (updates.status && updates.status !== repair.status) {
            newHistory = [...newHistory, { status: updates.status, date: new Date().toLocaleString(), note: updates.historyNote || 'Durum güncellendi.' }];

            // Performans Takibi için Tarihsel Damgalar
            if (updates.status === 'İşlemde' && !repair.startedAt) {
                extraUpdates.startedAt = new Date();
            }
            if (['Tamamlandı', 'Cihaz Hazır', 'Teslim Edildi'].includes(updates.status) && !repair.completedAt) {
                extraUpdates.completedAt = new Date();
            }
        }

        try {
            const normalizedUpdates = {
                ...updates,
                tcNo: updates.tcNo || updates.customerTC || undefined,
                customerAddress: updates.customerAddress || updates.address || undefined
            };
            // undefined alanları temizle ki DB'deki veriyi silmesin
            Object.keys(normalizedUpdates).forEach(key => normalizedUpdates[key] === undefined && delete normalizedUpdates[key]);

            const res = await apiFetch(`${API_URL}/repairs/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...normalizedUpdates, ...extraUpdates, history: newHistory })
            });
            if (res.ok) {
                const updated = await res.json();
                const normalized = {
                    ...updated,
                    serial: updated.serial || updated.serialNumber || '',
                    device: updated.device || updated.deviceModel || '',
                    tcNo: updated.tcNo || updated.customerTC || '',
                    customerAddress: updated.customerAddress || updated.address || ''
                };
                setRepairs(prev => prev.map(r => (r._id === updated._id || r.id === id) ? normalized : r));
                return true;
            }
        } catch (error) { console.error("Error updating repair:", error); return false; }
    };

    const updateRepairStatus = async (id, status, note = '') => {
        return updateRepair(id, { status, historyNote: note });
    };

    const addTechnician = async (tech) => {
        try {
            const res = await apiFetch(`${API_URL}/technicians`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...tech, id: tech.id || `t${Date.now()}` })
            });
            if (res.ok) {
                const saved = await res.json();
                setTechnicians(prev => [...prev, saved]);
                return true;
            }
        } catch (error) { console.error("Error adding tech:", error); return false; }
    };

    const updateTechnician = async (id, updates) => {
        try {
            const res = await apiFetch(`${API_URL}/technicians/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updated = await res.json();
                setTechnicians(prev => prev.map(t => (t._id === updated._id || t.id === id) ? updated : t));
                return updated;
            }
        } catch (error) { console.error("Error updating technician:", error); return null; }
    };

    const removeTechnician = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/technicians/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTechnicians(prev => prev.filter(t => t.id !== id && t._id !== id));
                return true;
            }
            return false;
        } catch (error) { console.error("Error removing technician:", error); return false; }
    };

    const assignTechnician = async (repairId, techId) => {
        const updatedTech = await updateTechnician(techId, { status: 'busy', currentJob: repairId });
        if (updatedTech) await updateRepairStatus(repairId, 'İşlemde', `${techId} atandı.`);
    };

    const completeJob = async (techId) => {
        await updateTechnician(techId, { status: 'available', currentJob: null });
    };

    const verifyTechnicianPassword = async (userId, password) => {
        try {
            const res = await apiFetch(`${API_URL}/users/verify-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });
            if (res.ok) {
                const data = await res.json();
                return data.success;
            }
            return false;
        } catch (error) {
            console.error("Error verifying password:", error);
            return false;
        }
    };

    const updateServicePoint = async (id, updates) => {
        try {
            const res = await apiFetch(`${API_URL}/service-points/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updated = await res.json();
                setServicePoints(prev => prev.map(p => (p._id === updated._id || p.id === id) ? updated : p));
                return true;
            }
        } catch (error) { console.error("Error updating service point:", error); return false; }
    };

    const removeServicePoint = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/service-points/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setServicePoints(prev => prev.filter(p => p.id !== id && p._id !== id));
                return true;
            }
        } catch (error) { console.error("Error removing service point:", error); return false; }
    };

    const addServicePoint = async (point) => {
        try {
            const res = await apiFetch(`${API_URL}/service-points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...point, id: point.id || Date.now() })
            });
            if (res.ok) {
                const saved = await res.json();
                setServicePoints(prev => [...prev, saved]);
                return { success: true };
            }
            const errData = await res.json();
            return { success: false, message: errData.message || 'Sunucu hatası' };
        } catch (error) {
            console.error("Error adding service point:", error);
            return { success: false, message: error.message };
        }
    };

    const addCustomer = async (customer) => {
        try {
            const res = await apiFetch(`${API_URL}/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...customer, id: customer.id || `c${Date.now()}` })
            });
            if (res.ok) {
                const saved = await res.json();
                setCustomers(prev => [...prev, saved]);
                return saved;
            }
        } catch (error) { console.error("Error adding customer:", error); return null; }
    };

    const updateCustomer = async (id, updates) => {
        try {
            const res = await apiFetch(`${API_URL}/customers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updated = await res.json();
                setCustomers(prev => prev.map(c => (c._id === updated._id || c.id === id) ? updated : c));
                return true;
            }
        } catch (error) { console.error("Error updating customer:", error); return false; }
    };

    const removeCustomer = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setCustomers(prev => prev.filter(c => c.id !== id && c._id !== id));
                return true;
            }
            return false;
        } catch (error) { console.error("Error removing customer:", error); return false; }
    };

    const addInventoryItem = async (item) => {
        try {
            const itemToSave = { ...item };
            if (itemToSave.kgbSerial && (!itemToSave.kgbSerials || itemToSave.kgbSerials.length === 0)) {
                itemToSave.kgbSerials = [itemToSave.kgbSerial];
            }
            if (itemToSave.kbbSerial && (!itemToSave.kbbSerials || itemToSave.kbbSerials.length === 0)) {
                itemToSave.kbbSerials = [itemToSave.kbbSerial];
            }
            const res = await apiFetch(`${API_URL}/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...itemToSave, storeId: itemToSave.storeId || currentUser?.storeId || 0 })
            });
            if (res.ok) {
                const saved = await res.json();
                setInventory(prev => [...prev, saved]);
                return true;
            }
        } catch (error) { console.error("Error adding item:", error); return false; }
    };

    const updateInventoryItem = async (id, updates) => {
        try {
            const updatesToSave = { ...updates };
            if (updatesToSave.kgbSerial && (!updatesToSave.kgbSerials || updatesToSave.kgbSerials.length === 0)) {
                updatesToSave.kgbSerials = [updatesToSave.kgbSerial];
            }
            if (updatesToSave.kbbSerial && (!updatesToSave.kbbSerials || updatesToSave.kbbSerials.length === 0)) {
                updatesToSave.kbbSerials = [updatesToSave.kbbSerial];
            }
            const res = await apiFetch(`${API_URL}/inventory/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatesToSave)
            });
            if (res.ok) {
                const updated = await res.json();
                setInventory(prev => prev.map(i => (i._id === updated._id || i.id === id) ? updated : i));
                return true;
            }
        } catch (error) { console.error("Error updating item:", error); return false; }
    };

    const removeInventoryItem = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setInventory(prev => prev.filter(i => i.id !== id && i._id !== id));
                return true;
            }
            return false;
        } catch (error) { console.error("Error removing item:", error); return false; }
    };

    const usePart = async (partId, quantity = 1) => {
        try {
            const res = await apiFetch(`${API_URL}/inventory/use`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partId, quantity })
            });
            if (res.ok) {
                const updated = await res.json();
                setInventory(prev => prev.map(i => (i._id === updated._id || i.id === partId) ? updated : i));
                return true;
            }
        } catch (error) { console.error("Error using part:", error); return false; }
    };

    const processStockMovement = async (repairId, parts) => {
        if (!parts || parts.length === 0) return true;

        try {
            // Backend endpoint to process stock movement in one go
            // This is safer than multiple manual updates to prevent race conditions
            const res = await apiFetch(`${API_URL}/inventory/process-movement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repairId, parts })
            });

            if (res.ok) {
                // Refresh inventory from server to get accurate state
                const invRes = await apiFetch(`${API_URL}/inventory`);
                if (invRes.ok) setInventory(await invRes.json());
                return true;
            } else {
                // Fallback: If endpoint doesn't exist, we'll need to do it manually (for backward compatibility)
                console.warn("process-movement endpoint not found, falling back to manual updates.");

                for (const part of parts) {
                    const storeId = part.storeId || currentUser?.storeId || 0;

                    // 1. KGB'den Düş
                    const kgbItem = inventory.find(i =>
                        i.partNumber === part.partNumber &&
                        (String(i.storeId) === String(storeId)) &&
                        (i.warehouseType === 'KGB' || !i.warehouseType)
                    );

                    if (kgbItem) {
                        const newQuantity = Math.max(0, kgbItem.quantity - 1);
                        const newSerials = (kgbItem.kgbSerials || []).filter(s => s !== part.kgbSerial);
                        await updateInventoryItem(kgbItem._id || kgbItem.id, {
                            quantity: newQuantity,
                            kgbSerials: newSerials
                        });
                    }

                    // 2. KBB'ye Gir
                    const kbbItem = inventory.find(i =>
                        i.partNumber === part.partNumber &&
                        (String(i.storeId) === String(storeId)) &&
                        i.warehouseType === 'KBB'
                    );

                    if (kbbItem) {
                        const newQuantity = (kbbItem.quantity || 0) + 1;
                        const newSerials = [...(kbbItem.kbbSerials || []), part.kbbSerial].filter(Boolean);
                        await updateInventoryItem(kbbItem._id || kbbItem.id, {
                            quantity: newQuantity,
                            kbbSerials: newSerials
                        });
                    } else {
                        // Create new KBB record
                        await addInventoryItem({
                            name: part.description || part.name,
                            partNumber: part.partNumber,
                            quantity: 1,
                            kbbSerials: [part.kbbSerial].filter(Boolean),
                            warehouseType: 'KBB',
                            storeId: storeId,
                            category: part.category || 'Diğer'
                        });
                    }
                }
                return true;
            }
        } catch (error) {
            console.error("Error processing stock movement:", error);
            return false;
        }
    };

    const transferInventorySerial = async (sourceItemId, targetStoreId, serialNumbers, serialType) => {
        try {
            const res = await apiFetch(`${API_URL}/inventory/transfer-serial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceItemId, targetStoreId, serialNumbers, serialType })
            });
            if (res.ok) {
                const { sourceItem, targetItem } = await res.json();
                setInventory(prev => {
                    let next = [...prev];
                    const sIndex = next.findIndex(i => (i._id === sourceItem._id) || (i.id === sourceItem.id));
                    if (sIndex > -1) next[sIndex] = sourceItem;

                    const tIndex = next.findIndex(i => (i._id === targetItem._id) || (i.id === targetItem.id));
                    if (tIndex > -1) next[tIndex] = targetItem;
                    else next.push(targetItem);

                    return next;
                });
                return true;
            }
        } catch (e) {
            console.error("Error transferring serial:", e);
        }
        return false;
    };

    const addEarning = async (earning) => {
        try {
            const res = await apiFetch(`${API_URL}/earnings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(earning)
            });
            if (res.ok) {
                const saved = await res.json();
                setEarnings(prev => [...prev, saved]);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error adding earning:", error);
            return false;
        }
    };

    const addRole = async (role) => {
        try {
            const res = await apiFetch(`${API_URL}/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(role)
            });
            if (res.ok) {
                const savedRole = await res.json();
                setRoles(prev => [...prev, savedRole]);
                return true;
            } else {
                const errorData = await res.json();
                showToast(errorData.message || 'Rol eklenemedi', 'error');
                return false;
            }
        } catch (error) {
            console.error("Error adding role:", error);
            showToast('Bağlantı hatası', 'error');
            return false;
        }
    };

    const updateRole = async (id, roleData) => {
        try {
            const res = await apiFetch(`${API_URL}/roles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roleData)
            });
            if (res.ok) {
                const updated = await res.json();
                setRoles(prev => prev.map(r => r._id === id ? updated : r));
                return true;
            } else {
                const errorData = await res.json();
                showToast(errorData.message || 'Rol güncellenemedi', 'error');
                return false;
            }
        } catch (error) {
            console.error("Error updating role:", error);
            return false;
        }
    };

    const deleteRole = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/roles/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setRoles(prev => prev.filter(r => r._id !== id));
                return true;
            } else {
                const errorData = await res.json();
                showToast(errorData.message || 'Rol silinemedi', 'error');
                return false;
            }
        } catch (error) {
            console.error("Error deleting role:", error);
            return false;
        }
    };

    const getStoreRepairs = () => {
        if (!currentUser) return [];
        if (hasPermission(currentUser, 'view_all_stores')) {
            if (String(selectedStoreId) === '0') return repairs;
            return repairs.filter(r => String(r.storeId) === String(selectedStoreId));
        }
        return repairs.filter(r => String(r.storeId) === String(currentUser.storeId));
    };

    const [toast, setToast] = useState({ message: '', type: 'info', isVisible: false });
    const sendWhatsApp = (phone, message) => {
        if (!phone) return;
        // Sadece rakamları al
        const cleanPhone = phone.replace(/\D/g, '');
        // Başına ülke kodu ekle (yoksa Türkiye 90)
        const finalPhone = cleanPhone.startsWith('90') ? cleanPhone : (cleanPhone.startsWith('0') ? '90' + cleanPhone.substring(1) : '90' + cleanPhone);
        const encodedMsg = encodeURIComponent(message);
        window.open(`https://wa.me/${finalPhone}?text=${encodedMsg}`, '_blank');
    };

    const showToast = (message, type = 'info') => setToast({ message, type, isVisible: true });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const { isAdmin, isStaff } = React.useMemo(() => {
        if (!currentUser) return { isAdmin: false, isStaff: false };
        const role = currentUser.role?.toLowerCase() || '';
        const normalized = role.replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
        return {
            isAdmin: normalized === 'admin' || normalized === 'superadmin' || normalized === 'yonetici',
            isStaff: ['technician', 'reception', 'logistic', 'accountant', 'teknisyen', 'storemanager', 'muhasebe', 'servis_sorumlusu', 'servissorumlusu'].includes(normalized)
        };
    }, [currentUser]);

    // Filtered service points based on user permissions
    const visibleServicePoints = React.useMemo(() => {
        if (!currentUser) return [];
        const hasViewAllPerm = hasPermission(currentUser, 'view_all_stores');
        if ((isAdmin || hasViewAllPerm) && !isStaff) {
            return servicePoints;
        }
        return servicePoints.filter(sp => String(sp.id) === String(currentUser.storeId));
    }, [servicePoints, currentUser, isAdmin, isStaff]);

    const filterByStore = React.useCallback((list, storeIdKey = 'storeId') => {
        if (!currentUser || !Array.isArray(list)) return [];
        const hasViewAllPerm = hasPermission(currentUser, 'view_all_stores');
        if ((isAdmin || hasViewAllPerm) && !isStaff) {
            return selectedStoreId === 0 ? list : list.filter(item => String(item[storeIdKey]) === String(selectedStoreId));
        }
        return list.filter(item => String(item[storeIdKey]) === String(currentUser.storeId));
    }, [currentUser, isAdmin, isStaff, selectedStoreId]);

    return (
        <AppContext.Provider value={{
            API_URL,
            repairs: getStoreRepairs(),
            allRepairs: repairs,
            users,
            currentUser,
            servicePoints: visibleServicePoints,
            allServicePoints: servicePoints,
            visibleServicePoints,
            searchQuery,
            setSearchQuery,
            inventory: filterByStore(inventory),
            allInventory: inventory,
            technicians: (() => {
                const baseTechnicians = filterByStore(technicians);
                const technicianUsers = users
                    .filter(u => {
                        const isTech = u.role?.toLowerCase() === 'technician' || u.role === 'Teknisyen';
                        if (!isTech) return false;
                        if (!currentUser) return false;
                        const hasViewAllPerm = hasPermission(currentUser, 'view_all_stores');
                        if ((isAdmin || hasViewAllPerm) && !isStaff) {
                            return selectedStoreId === 0 || String(u.storeId) === String(selectedStoreId);
                        }
                        return String(u.storeId) === String(currentUser.storeId);
                    })
                    .map(u => ({
                        ...u,
                        name: u.name,
                        id: u.id || u._id,
                        specialty: u.specialty || 'Genel Teknisyen',
                        status: 'Müsait',
                        isUserAcc: true
                    }));

                const combined = [...baseTechnicians];
                technicianUsers.forEach(uTech => {
                    const exists = combined.some(ct => (ct.name?.toLowerCase() === uTech.name?.toLowerCase()) || (ct.email?.toLowerCase() === uTech.email?.toLowerCase()));
                    if (!exists) combined.push(uTech);
                });
                return combined;
            })(),
            allTechnicians: technicians,
            customers: filterByStore(customers),
            allCustomers: customers,
            earnings: filterByStore(earnings),
            allEarnings: earnings,
            login, logout, addUser, updateUser, removeUser, addRepair, removeRepair, updateRepair, updateRepairStatus,
            addTechnician, updateTechnician, removeTechnician, assignTechnician, completeJob, verifyTechnicianPassword, addServicePoint, updateServicePoint, removeServicePoint,
            addCustomer, updateCustomer, removeCustomer, addInventoryItem, updateInventoryItem, removeInventoryItem, usePart, processStockMovement, transferInventorySerial, addEarning,
            emailSettings, setEmailSettings: (s) => { setEmailSettings(s); saveSettings('emailSettings', s); },
            companyProfile, setCompanyProfile: (p) => { setCompanyProfile(p); saveSettings('companyProfile', p); },
            notificationSettings, setNotificationSettings: (s) => { setNotificationSettings(s); saveSettings('notificationSettings', s); },
            notificationTemplates, setNotificationTemplates: (s) => { setNotificationTemplates(s); saveSettings('notificationTemplates', s); },
            serviceTerms, setServiceTerms: (s) => { setServiceTerms(s); saveSettings('serviceTerms', s); },
            roles, addRole, updateRole, deleteRole,
            selectedStoreId, setSelectedStoreId, showToast, alerts: alerts.filter(a => !clearedAlertIds.includes(a.id)), checkSLA, sendWhatsApp, uploadMedia, clearAllAlerts
        }}>
            {children}
            {toast.isVisible && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
        </AppContext.Provider>
    );
};
