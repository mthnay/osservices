import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
    Scan,
    CheckCircle,
    AlertTriangle,
    Shield,
    ShieldAlert,
    X,
    Search,
    Camera,
    Save,
    Eraser,
    ImagePlus,
    Video,
    Loader2,
    ExternalLink,
    User,
    FileText,
    ChevronRight,
    ArrowLeft,
    Check,
    Wrench,
    RefreshCcw,
    Package,
    AlertCircle,
    Clock,
    Zap,
    Box,
    Phone,
    Fingerprint,
    MapPin,
    ChevronDown
} from 'lucide-react';
import ServiceFormPrint from './ServiceFormPrint';
import Toast from './Toast'; // Import Toast
import { useAppContext } from '../context/AppContext';
import { appConfirm } from '../utils/alert';
import { hasPermission, ROLES, getAccessibleStoreIds } from '../utils/permissions';
import MyPhoneIcon from './LocalIcons';
import { getProductImage } from '../utils/productImages';

const PRODUCT_GROUPS = [
    { id: 'iphone', label: 'iPhone', icon: MyPhoneIcon, color: 'bg-blue-600', img: getProductImage('iphone') },
    { id: 'ipad', label: 'iPad', icon: Package, color: 'bg-indigo-500', img: getProductImage('ipad') },
    { id: 'mac', label: 'Mac', icon: FileText, color: 'bg-slate-700', img: getProductImage('mac') },
    { id: 'watch', label: 'Apple Watch', icon: Clock, color: 'bg-orange-600', img: getProductImage('watch') },
    { id: 'airpods', label: 'AirPods', icon: Zap, color: 'bg-emerald-600', img: getProductImage('airpods') },
    { id: 'other', label: 'Aksesuar & Beats', icon: Box, color: 'bg-purple-600', img: getProductImage('other') }
];

// Fallback images if the ones above are not reachable
const PRODUCT_IMAGES = {
    iphone: getProductImage('iphone'),
    ipad: getProductImage('ipad'),
    mac: getProductImage('mac'),
    watch: getProductImage('watch'),
    airpods: getProductImage('airpods'),
    other: getProductImage('other')
};

const DEVICE_DATABASE = [
    // iPhones
    { name: 'iPhone 15 Pro Max', capacities: ['256 GB', '512 GB', '1 TB'], colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'] },
    { name: 'iPhone 15 Pro', capacities: ['128 GB', '256 GB', '512 GB', '1 TB'], colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'] },
    { name: 'iPhone 15 Plus', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pink', 'Yellow', 'Green', 'Blue', 'Black'] },
    { name: 'iPhone 15', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pink', 'Yellow', 'Green', 'Blue', 'Black'] },
    { name: 'iPhone 14 Pro Max', capacities: ['128 GB', '256 GB', '512 GB', '1 TB'], colors: ['Deep Purple', 'Gold', 'Silver', 'Space Black'] },
    { name: 'iPhone 14 Pro', capacities: ['128 GB', '256 GB', '512 GB', '1 TB'], colors: ['Deep Purple', 'Gold', 'Silver', 'Space Black'] },
    { name: 'iPhone 14 Plus', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Blue', 'Purple', 'Midnight', 'Starlight', '(PRODUCT)RED', 'Yellow'] },
    { name: 'iPhone 14', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Blue', 'Purple', 'Midnight', 'Starlight', '(PRODUCT)RED', 'Yellow'] },
    { name: 'iPhone 13 Pro Max', capacities: ['128 GB', '256 GB', '512 GB', '1 TB'], colors: ['Sierra Blue', 'Graphite', 'Gold', 'Silver', 'Alpine Green'] },
    { name: 'iPhone 13 Pro', capacities: ['128 GB', '256 GB', '512 GB', '1 TB'], colors: ['Sierra Blue', 'Graphite', 'Gold', 'Silver', 'Alpine Green'] },
    { name: 'iPhone 13', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pink', 'Blue', 'Midnight', 'Starlight', '(PRODUCT)RED', 'Green'] },
    { name: 'iPhone 13 mini', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pink', 'Blue', 'Midnight', 'Starlight', '(PRODUCT)RED', 'Green'] },
    { name: 'iPhone 12 Pro Max', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pacific Blue', 'Gold', 'Graphite', 'Silver'] },
    { name: 'iPhone 12 Pro', capacities: ['128 GB', '256 GB', '512 GB'], colors: ['Pacific Blue', 'Gold', 'Graphite', 'Silver'] },
    { name: 'iPhone 12 mini', capacities: ['64 GB', '128 GB', '256 GB'], colors: ['Black', 'White', '(PRODUCT)RED', 'Green', 'Blue', 'Purple'] },
    { name: 'iPhone 12', capacities: ['64 GB', '128 GB', '256 GB'], colors: ['Black', 'White', '(PRODUCT)RED', 'Green', 'Blue', 'Purple'] },
    { name: 'iPhone 11 Pro Max', capacities: ['64 GB', '256 GB', '512 GB'], colors: ['Midnight Green', 'Space Gray', 'Silver', 'Gold'] },
    { name: 'iPhone 11 Pro', capacities: ['64 GB', '256 GB', '512 GB'], colors: ['Midnight Green', 'Space Gray', 'Silver', 'Gold'] },
    { name: 'iPhone 11', capacities: ['64 GB', '128 GB', '256 GB'], colors: ['Black', 'Green', 'Yellow', 'Purple', '(PRODUCT)RED', 'White'] },
    { name: 'iPhone SE (3rd Gen)', capacities: ['64 GB', '128 GB', '256 GB'], colors: ['Midnight', 'Starlight', '(PRODUCT)RED'] },
    { name: 'iPhone SE (2nd Gen)', capacities: ['64 GB', '128 GB', '256 GB'], colors: ['Black', 'White', '(PRODUCT)RED'] },
    
    // iPads
    { name: 'iPad Pro 12.9"', generations: ['6th Gen (M2)', '5th Gen (M1)', '4th Gen'], capacities: ['128 GB', '256 GB', '512 GB', '1 TB', '2 TB'] },
    { name: 'iPad Pro 11"', generations: ['4th Gen (M2)', '3rd Gen (M1)', '2nd Gen'], capacities: ['128 GB', '256 GB', '512 GB', '1 TB', '2 TB'] },
    { name: 'iPad Air (5th Gen)', capacities: ['64 GB', '256 GB'], colors: ['Space Gray', 'Starlight', 'Pink', 'Purple', 'Blue'] },
    { name: 'iPad Air (4th Gen)', capacities: ['64 GB', '256 GB'], colors: ['Space Gray', 'Silver', 'Rose Gold', 'Green', 'Sky Blue'] },
    { name: 'iPad (10th Gen)', capacities: ['64 GB', '256 GB'], colors: ['Silver', 'Blue', 'Pink', 'Yellow'] },
    { name: 'iPad mini (6th Gen)', capacities: ['64 GB', '256 GB'], colors: ['Space Gray', 'Pink', 'Purple', 'Starlight'] },

    // MacBooks
    { name: 'MacBook Air 13" (M3)', chips: ['M3'], configurations: ['8 GB RAM', '16 GB RAM', '24 GB RAM'] },
    { name: 'MacBook Air 13" (M2)', chips: ['M2'], configurations: ['8 GB RAM', '16 GB RAM', '24 GB RAM'] },
    { name: 'MacBook Air 13" (M1)', chips: ['M1'], configurations: ['8 GB RAM', '16 GB RAM'] },
    { name: 'MacBook Air 15" (M3)', chips: ['M3'], configurations: ['8 GB RAM', '16 GB RAM', '24 GB RAM'] },
    { name: 'MacBook Air 15" (M2)', chips: ['M2'], configurations: ['8 GB RAM', '16 GB RAM', '24 GB RAM'] },
    { name: 'MacBook Pro 14"', chips: ['M1 Pro', 'M1 Max', 'M2 Pro', 'M2 Max', 'M3', 'M3 Pro', 'M3 Max'], configurations: ['16 GB RAM', '32 GB RAM', '64 GB RAM', '96 GB RAM', '128 GB RAM'] },
    { name: 'MacBook Pro 16"', chips: ['M1 Pro', 'M1 Max', 'M2 Pro', 'M2 Max', 'M3 Pro', 'M3 Max'], configurations: ['16 GB RAM', '32 GB RAM', '64 GB RAM', '96 GB RAM', '128 GB RAM'] },
    { name: 'MacBook Pro 13"', chips: ['M2', 'M1', 'Intel Core i5'], configurations: ['8 GB RAM', '16 GB RAM', '32 GB RAM'] },

    // Apple Watch
    { name: 'Apple Watch Ultra 2', sizes: ['49mm'], materials: ['Titanium'] },
    { name: 'Apple Watch Ultra', sizes: ['49mm'], materials: ['Titanium'] },
    { name: 'Apple Watch Series 9', sizes: ['41mm', '45mm'], materials: ['Aluminum', 'Stainless Steel'] },
    { name: 'Apple Watch Series 8', sizes: ['41mm', '45mm'], materials: ['Aluminum', 'Stainless Steel'] },
    { name: 'Apple Watch SE (2nd Gen)', sizes: ['40mm', '44mm'], materials: ['Aluminum'] },

    // AirPods
    { name: 'AirPods Pro (2nd Gen)', configurations: ['USB-C Case', 'Lightning Case'] },
    { name: 'AirPods (3rd Gen)', configurations: ['MagSafe Case', 'Lightning Case'] },
    { name: 'AirPods Max', colors: ['Space Gray', 'Silver', 'Pink', 'Green', 'Sky Blue'] }
];


const ServiceAcceptance = ({ setActiveTab, initialData, clearInitialData }) => {
    // eslint-disable-next-line no-unused-vars
    const { addRepair, customers, addCustomer, companyProfile, uploadMedia, showToast, serviceTerms, currentUser, servicePoints, visibleServicePoints, deviceModels } = useAppContext();
    const hasAllStores = currentUser?.role === 'admin' || currentUser?.role === ROLES?.SUPER_ADMIN || hasPermission(currentUser, 'view_all_stores');
    // Çok mağazalı kullanıcı da kaydın açılacağı mağazayı seçebilmeli
    const hasMultiStore = getAccessibleStoreIds(currentUser).length > 1;
    const canPickStore = hasAllStores || hasMultiStore;

    const [step, setStep] = useState(1);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showKioskModal, setShowKioskModal] = useState(false);
    const [lastRepairId, setLastRepairId] = useState(null);
    const [searching, setSearching] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [toast, setToast] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const serialInputRef = useRef(null); // Seri No tarama için ayrı ref

    // Suggestion State
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [deviceSuggestions, setDeviceSuggestions] = useState([]);
    const suggestionsRef = useRef(null);
    const [showStoreSelect, setShowStoreSelect] = useState(false);
    const storeSelectRef = useRef(null);

    // Click outside to close suggestions and store select
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (storeSelectRef.current && !storeSelectRef.current.contains(event.target)) {
                setShowStoreSelect(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [formData, setFormData] = useState({
        productGroup: '', // iphone, ipad, mac, watch, airpods, other
        serviceType: 'repair',
        serialNumber: '',
        imei1: '',
        imei2: '',
        deviceModel: '',
        warrantyStatus: '',
        estimatedCost: '', // Tahmini/Alınan Ücret
        vmiStatus: 'green', // green, yellow, red
        lciStatus: 'clean', // clean, triggered
        visualCondition: [],
        findMyOff: false,
        backupTaken: false,
        customerName: '',
        customerType: 'positive', // positive | negative
        customerTC: '',
        customerPhone: '',
        customerEmail: '',
        customerAddress: '',
        issueDescription: '',
        beforeImages: [],
        afterImages: [],
        mediaFiles: [],
        notes: '',
        storeId: currentUser?.storeId || '',
        createdBy: currentUser?.name || ''
    });
    const sigCanvas = useRef(null);

    const handlePrepareSubmission = () => {
        try {
            // 1. Zorunlu Alan Kontrolü
            if (!formData.serialNumber) { showToast('Lütfen Seri Numarası giriniz.', 'error'); return; }
            if (!formData.deviceModel) { showToast('Lütfen Cihaz Modeli seçiniz.', 'error'); return; }
            if (!formData.warrantyStatus) { showToast('Lütfen Garanti Durumu seçiniz.', 'error'); return; }
            if (!formData.customerName) { showToast('Lütfen Müşteri Adı giriniz.', 'error'); return; }
            if (!formData.customerPhone) { showToast('Lütfen Müşteri Telefonu giriniz.', 'error'); return; }
            if (canPickStore && !formData.storeId) { showToast('Lütfen kaydın bağlı olacağı Mağazayı seçiniz.', 'error'); return; }
            if (!formData.findMyOff) { showToast('Lütfen "Cihazımı Bul" özelliğinin kapalı olduğunu teyit ediniz.', 'error'); return; }

            // Geçiş: Form geçerliyse doğrudan full-screen Kiosk Modal aç.
            setShowKioskModal(true);

        } catch (error) {
            console.error('Validation Error:', error);
            showToast('İşlem başarısız: ' + (error.message || 'Bilinmeyen Hata'), 'error');
        }
    };

    const handleConfirmKiosk = async () => {
        try {
            if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
                showToast('Lütfen servis formunu parmağınızla imzalayınız.', 'error');
                return;
            }

            const signatureData = sigCanvas.current.toDataURL('image/png');

            // 3. Resim ve Medya Hazırlığı
            const realPhotos = formData.mediaFiles?.filter(f => !f.isDefault) || [];
            const mainImage = realPhotos.length > 0 ? realPhotos[0].url : (formData.mediaFiles?.[0]?.url || null);

            // AppContext üzerinden kayıt ekle
            const newRepair = await addRepair({
                ...formData,
                device: formData.deviceModel,
                serial: formData.serialNumber,
                imei1: formData.imei1,
                imei2: formData.imei2,
                customer: formData.customerName,
                customerPhone: formData.customerPhone,
                customerEmail: formData.customerEmail,
                customerAddress: formData.customerAddress,
                tcNo: formData.customerTC,
                issue: formData.issueDescription,
                status: formData.serviceType !== 'repair' ? 'Cihaz Hazır' : 'Beklemede',
                date: new Date().toLocaleDateString('tr-TR') + ' ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                image: mainImage,
                customerSignature: signatureData,
                storeId: formData.storeId || currentUser?.storeId,
                createdBy: currentUser?.name || 'Bilinmeyen Kullanıcı'
            });

            const repairId = newRepair?.id || newRepair?._id;

            if (repairId) {
                // --- Otomatik Müşteri Kaydı ---
                const existingCustomer = customers.find(c =>
                    (formData.customerPhone && c.phone === formData.customerPhone) ||
                    (formData.customerEmail && c.email === formData.customerEmail)
                );

                if (!existingCustomer) {
                    try {
                        const newCustomerData = {
                            name: formData.customerName,
                            phone: formData.customerPhone,
                            email: formData.customerEmail,
                            address: formData.customerAddress || '',
                            tc: formData.customerTC || '',
                            type: 'bireysel',
                            notes: 'Servis kaydı sırasında otomatik oluşturuldu.'
                        };
                        addCustomer(newCustomerData);
                    } catch (custErr) {
                        console.error("Otomatik müşteri ekleme hatası:", custErr);
                    }
                }

                showToast(`Servis kaydı başarıyla oluşturuldu! Kayıt No: #${repairId}`, 'success');
                setLastRepairId(repairId);
                setFormData(prev => ({ ...prev, customerSignature: signatureData }));
                setShowKioskModal(false);
                setShowPrintModal(true);
            } else {
                throw new Error('Kayıt oluşturulurken bir sorun oluştu (ID alınamadı).');
            }
        } catch (error) {
            console.error('Submit Error:', error);
            showToast('İşlem başarısız: ' + (error.message || 'Bilinmeyen Hata'), 'error');
        }
    };

    const handleDeviceModelChange = (e) => {
        const val = e.target.value;
        setFormData({ ...formData, deviceModel: val });

        if (val.length > 1) {
            const searchTerms = val.toLowerCase().split(' ').filter(t => t.length > 0);
            const results = [];
            const sourceDatabase = deviceModels && deviceModels.length > 0 ? deviceModels : DEVICE_DATABASE;
            sourceDatabase.forEach(dev => {
                const nameLower = dev.name.toLowerCase();
                if (searchTerms.some(term => nameLower.includes(term))) {
                    let combinations = [];
                    // Adapt to both DB format and static DEVICE_DATABASE format
                    const configs = dev.configurations || dev.capacities || dev.chips || dev.generations || dev.sizes || [];
                    const colors = dev.colors || [];

                    if (configs.length > 0 && colors.length > 0) {
                        colors.forEach(color => configs.forEach(config => combinations.push(`${dev.name}, ${config}, ${color}`)));
                    } else if (configs.length > 0) {
                        configs.forEach(config => combinations.push(`${dev.name}, ${config}`));
                    } else if (colors.length > 0) {
                        colors.forEach(color => combinations.push(`${dev.name}, ${color}`));
                    } else {
                        combinations.push(dev.name);
                    }

                    combinations.forEach(combo => {
                        const comboLower = combo.toLowerCase();
                        if (searchTerms.every(term => comboLower.includes(term))) results.push(combo);
                    });
                }
            });

            const sortedResults = results.sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                const firstTerm = searchTerms[0];
                const aStarts = aLower.startsWith(firstTerm);
                const bStarts = bLower.startsWith(firstTerm);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.length - b.length;
            }).slice(0, 50);

            setDeviceSuggestions(sortedResults);
            setShowSuggestions(sortedResults.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSerialSearch = async () => {
        if (!formData.serialNumber) return;
        setSearching(true);
        setTimeout(() => {
            setSearching(false);
            showToast('Seri numarası yerel veritabanında bulunamadı. Lütfen bilgileri manuel giriniz.', 'info');
        }, 800);
    };

    const openAppleCoverage = () => {
        if (!formData.serialNumber) {
            showToast('Lütfen önce bir seri numarası giriniz.', 'warning');
            return;
        }
        const url = `https://checkcoverage.apple.com/?sn=${formData.serialNumber}`;
        window.open(url, '_blank');
    };

    // Handle Initial Data (from Customer Detail)
    React.useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                customerTC: initialData.tcNo || initialData.customerTC || '',
                customerAddress: initialData.customerAddress || initialData.address || '',
                serialNumber: initialData.serial || initialData.serialNumber || '',
                deviceModel: initialData.device || initialData.deviceModel || ''
            }));
            if (clearInitialData) clearInitialData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]);
 
    // Kullanıcının bağlı olduğu mağazayı varsayılan seç
    React.useEffect(() => {
        if (currentUser?.storeId && !canPickStore) {
            // Tek mağazalı ve yetkisiz: her zaman kendi mağazası
            setFormData(prev => ({ ...prev, storeId: currentUser.storeId }));
        } else if (currentUser?.storeId && !formData.storeId) {
            // Mağaza seçebilenlerde boşsa birincil mağazayı varsayılan ata (değiştirilebilir)
            setFormData(prev => ({ ...prev, storeId: currentUser.storeId }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.storeId]);

    // Customer Matching
    const matchingCustomer = React.useMemo(() => {
        if (!formData?.customerTC || formData.customerTC.length < 3) return null;
        return customers.find(c => c.tc === formData.customerTC);
    }, [formData?.customerTC, customers]);

    const handleSelectCustomer = (customer) => {
        setFormData(prev => ({
            ...prev,
            customerName: customer.name || prev.customerName,
            customerPhone: customer.phone || prev.customerPhone,
            customerEmail: customer.email || prev.customerEmail,
            customerAddress: customer.address || prev.customerAddress,
            customerType: customer.type || prev.customerType || 'positive'
        }));
        showToast('Müşteri bilgileri aktarıldı.', 'success');
    };

    const toggleCondition = (condition) => {
        setFormData(prev => ({
            ...prev,
            visualCondition: prev.visualCondition.includes(condition)
                ? prev.visualCondition.filter(c => c !== condition)
                : [...prev.visualCondition, condition]
        }));
    };

    const handleAddPhoto = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = async (e, category = 'before') => {
        const file = e.target.files[0];
        if (!file) return;

        const field = category === 'before' ? 'beforeImages' : 'afterImages';
        if (formData[field] && formData[field].length >= 15) {
            showToast('En fazla 15 görsel yükleyebilirsiniz.', 'error');
            return;
        }

        setUploading(true);
        try {
            const data = await uploadMedia(file);
            if (data && data.url) {
                const imageUrl = data.url;
                const imageId = data.id || data.filename || Date.now();
                
                setFormData(prev => {
                    const field = category === 'before' ? 'beforeImages' : 'afterImages';
                    const currentFieldImages = prev[field] || [];
                    const currentMediaFiles = prev.mediaFiles || [];

                    return { 
                        ...prev, 
                        [field]: [...currentFieldImages, imageUrl],
                        // mediaFiles'ı da güncelle ki addRepair aşamasında kullanılabilsin
                        mediaFiles: [...currentMediaFiles, { 
                            url: imageUrl, 
                            id: imageId, 
                            isDefault: false 
                        }]
                    };
                });
                showToast('Fotoğraf başarıyla eklendi.', 'success');
            } else {
                showToast('Yükleme başarısız oldu.', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Hata: ' + (error.message || 'Dosya yükleme hatası.'), 'error');
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const removePhoto = (index, category = 'before') => {
        setFormData(prev => {
            const field = category === 'before' ? 'beforeImages' : 'afterImages';
            const newList = [...(prev[field] || [])];
            newList.splice(index, 1);
            return { ...prev, [field]: newList };
        });
    };

    const validateTC = (value) => {
        value = String(value);
        if (!value || value.length !== 11) return null;
        if (value[0] === '0') return false;
        let odd = 0, even = 0, sum = 0;
        for (let i = 0; i < 9; i++) {
            const digit = parseInt(value[i]);
            if (i % 2 === 0) odd += digit; else even += digit;
            sum += digit;
        }
        const tenth = ((odd * 7) - even) % 10;
        const eleventh = (sum + tenth) % 10;
        return tenth === parseInt(value[9]) && eleventh === parseInt(value[10]);
    };

    const isTCValid = validateTC(formData.customerTC);

    const clearSignature = () => sigCanvas.current.clear();

    const handleClosePrintModal = async () => {
        setShowPrintModal(false);
        if (await appConfirm("Tüm işlemler tamamlandı.<br><br>'İşlem Bekleyenler' ekranına gitmek ister misiniz?")) {
            setActiveTab('pending-repairs');
        } else {
            setFormData({
                serialNumber: '', imei1: '', imei2: '', deviceModel: '', warrantyStatus: '', visualCondition: [],
                findMyOff: false, backupTaken: false, customerName: '', customerTC: '',
                customerPhone: '', customerEmail: '', customerAddress: '', issueDescription: '',
                mediaFiles: [], notes: ''
            });
            if (sigCanvas.current) sigCanvas.current.clear();
            setStep(1);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4 border-b border-gray-100 mb-6 sticky top-4 z-30 bg-[#f5f5f7]/80 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-md text-blue-600 border border-blue-100 shadow-sm">
                        <Wrench size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Servis Kaydı</h2>
                        <p className="text-gray-500 mt-1 font-medium">Cihaz ve müşteri bilgilerini eksiksiz doldurun.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {canPickStore && (
                        <div className="relative" ref={storeSelectRef}>
                            <button 
                                onClick={() => setShowStoreSelect(!showStoreSelect)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all shadow-sm
                                    ${showStoreSelect ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200' : 'bg-blue-50/50 border-blue-100 text-blue-700 hover:bg-blue-100'}
                                `}
                            >
                                <MapPin size={14} className={showStoreSelect ? 'text-white' : 'text-blue-600'} />
                                <span className="text-[11px] font-bold uppercase tracking-tight">
                                    {visibleServicePoints.find(sp => String(sp.id) === String(formData.storeId))?.name || 'Mağaza Seçiniz'}
                                </span>
                                <ChevronDown size={12} className={`transition-transform ${showStoreSelect ? 'rotate-180' : 'opacity-50'}`} />
                            </button>

                            {showStoreSelect && (
                                <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-xl p-1.5 w-64 z-[60] animate-in fade-in slide-in-from-top-2">
                                    <div className="px-3 py-2 border-b border-gray-50 mb-1">
                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mağaza Seçimi</span>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                        {visibleServicePoints.map(sp => (
                                            <button
                                                key={sp.id}
                                                onClick={() => {
                                                    setFormData({ ...formData, storeId: sp.id });
                                                    setShowStoreSelect(false);
                                                }}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold flex items-center gap-3 transition-all
                                                    ${String(formData.storeId) === String(sp.id) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                                `}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${String(formData.storeId) === String(sp.id) ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                                {sp.name}
                                                {String(formData.storeId) === String(sp.id) && <Check size={12} className="ml-auto text-blue-500" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-white p-1 rounded-md border border-gray-200 shadow-sm">
                        {[1, 2].map(s => (
                            <div key={s} onClick={() => setStep(s)} className={`px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${step === s ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === s ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>{s}</span>
                                <span className="hidden sm:inline">{s === 1 ? 'BİLGİLER' : 'İMZA'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-scale-up">
                            <div className="gsx-card p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                                        <div className="p-3 bg-blue-50 rounded-md text-blue-600">
                                            <Phone size={24} strokeWidth={2.5} />
                                        </div>
                                        Cihaz Kimliği
                                    </h3>
                                    <button onClick={openAppleCoverage} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
                                        Garanti Sorgula <ExternalLink size={14} />
                                    </button>
                                </div>

                                <div className="mb-10">
                                    <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide mb-4 block ml-1">Ürün Grubu Seçiniz</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                        {PRODUCT_GROUPS.map((group) => (
                                            <button
                                                key={group.id}
                                                onClick={() => {
                                                    const isExchangeDefault = ['watch', 'airpods', 'other'].includes(group.id);
                                                    setFormData(prev => {
                                                        const uploadedFiles = (prev.mediaFiles || []).filter(f => !f.isDefault);
                                                        return { 
                                                            ...prev, productGroup: group.id, serviceType: isExchangeDefault ? 'exchange' : 'repair',
                                                            mediaFiles: [...uploadedFiles, { url: group.img || PRODUCT_IMAGES[group.id], id: 'placeholder', isDefault: true, productGroup: group.id }]
                                                        };
                                                    });
                                                }}
                                                className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all duration-300 ${formData.productGroup === group.id ? `border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-200/50 scale-105` : 'border-transparent bg-gray-50 hover:bg-white hover:border-gray-200 transform hover:-translate-y-1'}`}
                                            >
                                                <div className={`w-12 h-12 rounded-md flex items-center justify-center text-white shadow-md ${formData.productGroup === group.id ? group.color : 'bg-gray-400 opacity-60'}`}><group.icon size={24} /></div>
                                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${formData.productGroup === group.id ? 'text-blue-700' : 'text-gray-500'}`}>{group.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.productGroup && (
                                    <div className="mb-8 flex items-center justify-between bg-gray-50 p-2 rounded-md border border-gray-100 animate-in slide-in-from-top-2">
                                        <span className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide ml-4">İşlem Türü</span>
                                        <div className="flex gap-1">
                                            {['iphone', 'ipad', 'mac'].includes(formData.productGroup) && (
                                                <button onClick={() => setFormData({ ...formData, serviceType: 'repair' })} className={`px-4 py-1.5 rounded-md text-[10px] font-semibold uppercase transition-all ${formData.serviceType === 'repair' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-gray-400 hover:bg-white'}`}>Onarım</button>
                                            )}
                                            <button onClick={() => setFormData({ ...formData, serviceType: 'exchange' })} className={`px-4 py-1.5 rounded-md text-[10px] font-semibold uppercase transition-all ${formData.serviceType === 'exchange' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-gray-400 hover:bg-white'}`}>Değişim</button>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    {/* Sol Sütun: Seri ve Model */}
                                    <div className="space-y-6">
                                        <div className="group relative">
                                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide mb-2 block ml-1">Seri Numarası (S/N)</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Örn: C7H..."
                                                    className="w-full pl-12 pr-24 py-4 rounded-md bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono font-bold text-lg text-gray-900 uppercase"
                                                    value={formData.serialNumber}
                                                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value.toUpperCase() })}
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"><Fingerprint size={20} /></div>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                    <button onClick={() => { showToast('Kamera başlatılıyor...', 'info'); serialInputRef.current?.click(); }} className="p-2 hover:bg-blue-50 rounded-md text-blue-600 transition-colors"><Camera size={20} strokeWidth={2.5} /></button>
                                                    <button onClick={handleSerialSearch} disabled={searching} className="p-2 hover:bg-blue-50 rounded-md text-blue-600 transition-colors">{searching ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <Search size={20} strokeWidth={2.5} />}</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="group relative" ref={suggestionsRef}>
                                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide mb-2 block ml-1">Cihaz Modeli</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Örn: iPhone 13..."
                                                    className="w-full pl-12 pr-4 py-4 rounded-md bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-lg text-gray-900"
                                                    value={formData.deviceModel}
                                                    onChange={handleDeviceModelChange}
                                                    onFocus={() => formData.deviceModel.length > 1 && setShowSuggestions(true)}
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"><Package size={20} /></div>
                                                {showSuggestions && deviceSuggestions.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-md shadow-2xl border border-gray-100 max-h-80 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2 custom-scrollbar">
                                                        <div className="p-2 sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-10"><span className="text-[10px] font-semibold uppercase text-gray-400 px-2">Önerilen Modeller ({deviceSuggestions.length})</span></div>
                                                        <div className="p-1.5">
                                                            {deviceSuggestions.map((suggestion, index) => (
                                                                <button key={index} onClick={() => { setFormData(prev => ({ ...prev, deviceModel: suggestion, serviceType: /iPad|AirPods|Watch|Pencil|Mouse|Trackpad/.test(suggestion) ? 'exchange' : 'repair' })); setShowSuggestions(false); }} className="w-full text-left px-4 py-3 rounded-md hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3 group/item border border-transparent hover:border-blue-100">
                                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover/item:bg-white flex items-center justify-center text-gray-500 transition-colors">{suggestion.includes('iPhone') ? <Phone size={16} /> : <Package size={16} />}</div>
                                                                    <span className="font-bold text-sm text-gray-700 group-hover/item:text-blue-700">{suggestion}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sağ Sütun: IMEI Alanları */}
                                    <div className="space-y-6">
                                        <div className="group relative">
                                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide mb-2 block ml-1">IMEI 1 (Opsiyonel)</label>
                                            <input
                                                type="text"
                                                maxLength="15"
                                                placeholder="35..."
                                                className="w-full px-5 py-4 rounded-md bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono text-base uppercase text-gray-900 font-bold shadow-sm"
                                                value={formData.imei1}
                                                onChange={(e) => setFormData({ ...formData, imei1: e.target.value.replace(/\D/g, '') })}
                                            />
                                        </div>
                                        <div className="group relative">
                                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide mb-2 block ml-1">IMEI 2 (Opsiyonel)</label>
                                            <input
                                                type="text"
                                                maxLength="15"
                                                placeholder="35..."
                                                className="w-full px-5 py-4 rounded-md bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono text-base uppercase text-gray-900 font-bold shadow-sm"
                                                value={formData.imei2}
                                                onChange={(e) => setFormData({ ...formData, imei2: e.target.value.replace(/\D/g, '') })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="gsx-card p-6">
                                    <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-3"><div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-gray-500"><Shield size={18} strokeWidth={2.5} /></div>Garanti Kapsamı</h3>
                                    <div className="space-y-3">
                                        {[ { id: 'standard', label: 'Standart Garanti', icon: Shield }, { id: 'applecare', label: 'AppleCare+', icon: CheckCircle }, { id: 'troy-koruma', label: 'Troy Ekstra Koruma', icon: Shield }, { id: 'out-of-warranty', label: 'Garantisi Bitmiş', icon: ShieldAlert }].map((type) => (
                                            <button key={type.id} onClick={() => setFormData({ ...formData, warrantyStatus: type.id })} className={`w-full p-4 rounded-md border flex items-center gap-3 transition-all duration-300 ${formData.warrantyStatus === type.id ? 'border-blue-500 bg-blue-50/50 text-blue-900 shadow-md scale-[1.02]' : 'border-transparent bg-gray-50 hover:bg-white hover:border-gray-200 text-gray-600'}`}>
                                                <div className={`w-10 h-10 rounded-md flex items-center justify-center ${formData.warrantyStatus === type.id ? 'bg-white text-blue-600' : 'bg-white text-gray-400'}`}><type.icon size={20} strokeWidth={2.5} /></div>
                                                <span className="font-bold text-sm">{type.label}</span>
                                                {formData.warrantyStatus === type.id && <div className="ml-auto bg-blue-600 text-white p-1 rounded-full"><Check size={12} strokeWidth={4} /></div>}
                                            </button>
                                        ))}
                                    </div>
                                    {formData.warrantyStatus === 'out-of-warranty' && (
                                        <div className="mt-6 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-4">
                                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide mb-2 block ml-1">Tahmini / Alınan Tutar</label>
                                            <div className="relative">
                                                <input type="text" placeholder="0.00" className="w-full pl-12 pr-4 py-4 rounded-md bg-orange-50/50 border border-orange-200 outline-none font-bold text-lg text-orange-900" value={formData.estimatedCost} onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })} />
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-400 font-semibold text-lg">₺</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="gsx-card p-6">
                                    <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-3"><div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-gray-500"><AlertTriangle size={18} strokeWidth={2.5} /></div>Fiziksel Durum</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Ekran Çizik', 'Kasa Darbe', 'Kamera Çatlak', 'Sıvı Teması', 'Yamulma', 'Tuş Arızası', 'FaceID Arızası', 'Arka Cam Kırık', 'Lekeler', 'Soyulma'].map((item) => (
                                            <button key={item} onClick={() => toggleCondition(item)} className={`py-3 px-4 rounded-md text-xs font-bold border transition-all text-left ${formData.visualCondition.includes(item) ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-white hover:border-gray-200'}`}>{item}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="gsx-card p-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3"><div className="p-3 bg-orange-50 rounded-md text-orange-600"><AlertTriangle size={24} strokeWidth={2.5} /></div>Sorun Detayları</h3>
                                <textarea rows="6" placeholder="Müşteri şikayetini detaylıca yazınız..." value={formData.issueDescription} onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })} className="w-full p-6 rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 resize-none transition-all text-base leading-relaxed font-medium text-gray-700"></textarea>
                                <div className="flex flex-wrap gap-2.5 mt-6">
                                    {['Batarya Sorunu', 'Şarj Olmuyor', 'Ekran Kırık', 'Sıvı Teması', 'FaceID Çalışmıyor'].map(tag => (
                                        <button key={tag} onClick={() => setFormData(prev => ({ ...prev, issueDescription: prev.issueDescription ? prev.issueDescription + ', ' + tag : tag }))} className="text-xs font-bold px-4 py-2 bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-500 rounded-md transition-all">+ {tag}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="gsx-card p-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3"><div className="p-3 bg-indigo-50 rounded-md text-indigo-600"><Camera size={24} strokeWidth={2.5} /></div>Cihaz Fotoğrafları</h3>
                                    <button onClick={handleAddPhoto} disabled={uploading} className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all">{uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}Fotoğraf Ekle</button>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg, image/png" capture="environment" onChange={(e) => handleFileChange(e, 'before')} />
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {formData.beforeImages?.map((url, index) => (
                                        <div key={index} className="relative aspect-square group rounded-[22px] overflow-hidden border border-gray-100 shadow-sm">
                                            <img src={url} alt="Before" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                                <button onClick={() => window.open(url, '_blank')} className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/40"><ExternalLink size={16} /></button>
                                                <button onClick={() => removePhoto(index, 'before')} className="p-2 bg-red-500/80 rounded-lg text-white hover:bg-red-600"><X size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!formData.beforeImages || formData.beforeImages.length < 5) && (
                                        <button onClick={handleAddPhoto} className="aspect-square rounded-[22px] border-2 border-dashed border-gray-100 bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-white hover:border-blue-200 transition-all">
                                            <div className="p-3 bg-white rounded-md shadow-sm"><Camera size={24} strokeWidth={1.5} /></div>
                                            <span className="text-[10px] font-semibold uppercase">Ekle</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-scale-up">
                            <div className="gsx-card p-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-8 flex items-center gap-3"><div className="p-3 bg-green-50 rounded-md text-green-600"><FileText size={24} strokeWidth={2.5} /></div>Onay ve Teslim</h3>
                                <div className="space-y-5 mb-10">
                                    <label className={`flex items-start gap-5 p-5 rounded-lg border cursor-pointer transition-all ${formData.findMyOff ? 'bg-green-50 border-green-200 shadow-md' : 'bg-white border-gray-200'}`}>
                                        <div className={`mt-0.5 w-7 h-7 rounded-md border-2 flex items-center justify-center ${formData.findMyOff ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}><Check size={16} strokeWidth={4} className={formData.findMyOff ? 'opacity-100' : 'opacity-0'} /><input type="checkbox" className="hidden" checked={formData.findMyOff} onChange={(e) => setFormData({ ...formData, findMyOff: e.target.checked })} /></div>
                                        <div><span className="font-bold text-gray-900 block text-lg mb-1">Cihazımı Bul (FMI) Kapalı</span><span className="text-xs font-bold bg-black text-white px-2 py-0.5 rounded uppercase mr-2">Zorunlu</span><span className="text-sm text-gray-500 font-medium">Apple prosedürleri gereği servis kaydı açılamaz.</span></div>
                                    </label>
                                    <label className={`flex items-start gap-5 p-5 rounded-lg border cursor-pointer transition-all ${formData.backupTaken ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-gray-200'}`}>
                                        <div className={`mt-0.5 w-7 h-7 rounded-md border-2 flex items-center justify-center ${formData.backupTaken ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}><Check size={16} strokeWidth={4} className={formData.backupTaken ? 'opacity-100' : 'opacity-0'} /><input type="checkbox" className="hidden" checked={formData.backupTaken} onChange={(e) => setFormData({ ...formData, backupTaken: e.target.checked })} /></div>
                                        <div><span className="font-bold text-gray-900 block text-lg mb-1">Yedekleme Sorumluluğu</span><span className="text-sm text-gray-500 font-medium">Müşteri veri kaybı riskini kabul etti.</span></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className="gsx-card p-6 sticky top-32">
                        <h3 className="font-semibold text-gray-900 mb-8 flex items-center gap-3"><div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-500"><User size={20} strokeWidth={2.5} /></div>Müşteri Bilgileri</h3>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide ml-1">Ad Soyad</label>
                                <input type="text" placeholder="Ad Soyad" className="w-full px-5 py-4 rounded-md bg-gray-50 border border-gray-200 outline-none font-bold text-gray-900" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide ml-1">TC Kimlik</label>
                                <div className="relative">
                                    <input type="text" maxLength="11" placeholder="11 Haneli" className={`w-full pl-5 pr-10 py-4 rounded-md border outline-none font-mono font-bold text-sm ${isTCValid === true ? 'bg-green-50 border-green-500 text-green-900' : isTCValid === false ? 'bg-red-50 border-red-500 text-red-900' : 'bg-gray-50 border-gray-200'}`} value={formData.customerTC} onChange={(e) => setFormData({ ...formData, customerTC: e.target.value.replace(/\D/g, '') })} />
                                    {isTCValid === true && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600"><CheckCircle size={18} strokeWidth={3} /></div>}
                                    {isTCValid === false && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500"><AlertCircle size={18} strokeWidth={3} /></div>}
                                </div>
                                {matchingCustomer && (
                                    <div onClick={() => handleSelectCustomer(matchingCustomer)} className="mt-3 p-4 bg-white border border-blue-100 rounded-xl shadow-xl cursor-pointer hover:bg-blue-50 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">{matchingCustomer.name?.[0] || 'M'}</div>
                                            <div className="flex-1"><div className="flex items-center gap-2"><h4 className="font-bold text-gray-900 text-sm">{matchingCustomer.name}</h4><span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">Kayıtlı</span></div><p className="text-[11px] text-gray-500 font-medium">{matchingCustomer.phone}</p></div>
                                            <div className="text-blue-500"><ChevronRight size={20} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2"><label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide ml-1">Telefon</label><input type="tel" placeholder="0 (5XX)..." className="w-full px-5 py-4 rounded-md bg-gray-50 border border-gray-200 outline-none font-bold text-gray-900 text-sm" value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} /></div>
                            <div className="space-y-2"><label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide ml-1">E-Posta</label><input type="email" placeholder="ornek@email.com" className="w-full px-5 py-4 rounded-md bg-gray-50 border border-gray-200 outline-none font-medium text-gray-900 text-sm" value={formData.customerEmail} onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })} /></div>
                            <div className="space-y-2"><label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide ml-1">Adres</label><textarea rows="3" placeholder="Tam adres..." className="w-full px-5 py-4 rounded-md bg-gray-50 border border-gray-200 outline-none font-medium text-gray-900 text-sm resize-none" value={formData.customerAddress} onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}></textarea></div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide ml-1">Müşteri Tipi</label>
                                <div className="flex bg-gray-50 p-1.5 rounded-md border border-gray-200">
                                    <button onClick={() => setFormData({ ...formData, customerType: 'positive' })} className={`flex-1 py-2.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${formData.customerType === 'positive' ? 'bg-white text-green-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}>Olumlu</button>
                                    <button onClick={() => setFormData({ ...formData, customerType: 'negative' })} className={`flex-1 py-2.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${formData.customerType === 'negative' ? 'bg-white text-red-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}>Olumsuz</button>
                                </div>
                            </div>
                        </div>
                        <div className="mt-10 pt-8 border-t border-gray-100 flex gap-3">
                            {step > 1 && <button onClick={() => setStep(step - 1)} className="px-5 py-4 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold transition-all"><ArrowLeft size={20} /></button>}
                            {step < 2 ? (
                                <button onClick={() => setStep(step + 1)} className="flex-1 bg-gray-900 text-white px-6 py-4 rounded-md font-bold hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl">Sonraki Adım <ChevronRight size={18} /></button>
                            ) : (
                                <button onClick={handlePrepareSubmission} disabled={!formData.findMyOff || uploading} className={`flex-1 px-6 py-4 rounded-md font-bold transition-all flex items-center justify-center gap-3 shadow-xl ${(!formData.findMyOff || uploading) ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-200'}`}>{uploading ? 'Görsel Yükleniyor...' : <><Save size={18} strokeWidth={2.5} /> Kaydı Tamamla</>}</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showKioskModal && (
                <div className="fixed inset-0 bg-white z-[100] flex flex-col md:flex-row animate-in slide-in-from-bottom-5">
                    <div className="md:w-[45%] bg-gray-50 flex flex-col p-8 overflow-y-auto">
                        <div className="flex items-center justify-between mb-8"><h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Kabul Formu<br/><span className="text-blue-600">ve Sözleşme</span></h2><button onClick={() => setShowKioskModal(false)} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 hover:bg-gray-100 transition-colors"><X size={24} /></button></div>
                        <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm mb-6 flex flex-col gap-4"><h3 className="text-xs font-semibold uppercase text-gray-400 tracking-widest border-b border-gray-100 pb-3">Servis Detayları</h3><div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Müşteri Adı:</span><span className="text-sm font-semibold text-gray-900">{formData.customerName}</span></div><div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Cihaz Modeli:</span><span className="text-sm font-semibold text-gray-900">{formData.deviceModel}</span></div>{formData.estimatedCost && formData.warrantyStatus === 'out-of-warranty' && (<div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Ön Tutar:</span><span className="text-lg font-semibold text-orange-600">{Number(formData.estimatedCost).toLocaleString('tr-TR')} ₺</span></div>)}</div>
                        <div className="text-xs font-medium text-gray-500 space-y-4 leading-relaxed pr-4 text-justify h-full overflow-y-auto custom-scrollbar bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                            <h3 className="text-base font-semibold text-gray-900 mb-2">{serviceTerms?.termsTitle || 'Hüküm ve Koşullar'}</h3>
                            <div className="whitespace-pre-line">
                                {serviceTerms?.termsContent}
                            </div>
                            <div className="mt-8 p-4 bg-orange-50 text-orange-800 rounded-md italic font-bold">
                                * {serviceTerms?.approvalText}
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-400">
                                <Check size={12} className="text-green-500" /> {serviceTerms?.kvkkText}
                            </div>
                        </div>
                    </div>
                    <div className="md:w-[55%] bg-white flex flex-col p-10 relative">
                        <div className="flex-1 flex flex-col items-center justify-center relative">
                            <div className="flex justify-between w-full mb-6 items-end"><div><h3 className="text-2xl font-semibold text-gray-900">Müşteri Dijital İmzası</h3><p className="text-sm text-gray-400 font-bold mt-1">Lütfen aşağıdaki alana imza atınız.</p></div><button onClick={clearSignature} className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-sm font-bold transition-colors flex items-center gap-2"><Eraser size={18} /> Temizle</button></div>
                            <div className="w-full h-full max-h-[500px] border-[3px] border-blue-100 bg-blue-50/10 rounded-lg overflow-hidden relative shadow-inner"><SignatureCanvas ref={sigCanvas} penColor="black" minWidth={2} maxWidth={4} canvasProps={{ className: 'sigCanvas w-full h-full cursor-crosshair' }} /></div>
                            <button onClick={handleConfirmKiosk} className="w-full mt-8 py-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xl shadow-2xl flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"><CheckCircle size={28} /> İMZAYI ONAYLA VE KAYDI TAMAMLA</button>
                        </div>
                    </div>
                </div>
            )}

            {showPrintModal && <ServiceFormPrint formData={formData} repairId={lastRepairId} onClose={handleClosePrintModal} />}
        </div>
    );
};

export default ServiceAcceptance;
