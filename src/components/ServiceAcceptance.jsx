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
import { resolveDeviceCatalog, buildDeviceCombinations } from '../utils/deviceCatalog';
import { appConfirm } from '../utils/alert';
import { hasPermission, ROLES, getAccessibleStoreIds } from '../utils/permissions';
import MyPhoneIcon from './LocalIcons';
import { getProductImage } from '../utils/productImages';
import InlineSelect from './ui/InlineSelect';
import { PROVINCES, districtsOf } from '../utils/turkeyRegions';
import {
    findCustomerMatches, describeMatch, blocksCreate, isForceable, isValidTc, customerKeyOf,
} from '../utils/customerMatch';

/* Müşteri ve cihaz bilgileri tek ekranda toplanır; ikinci adım yalnızca onay/imza */
const STEPS = [
    { id: 1, label: 'MÜŞTERİ & CİHAZ' },
    { id: 2, label: 'ONAY & İMZA' },
];

// Tek ekrana sığması için ortak, sıkışık ama okunur ölçüler
const FIELD = 'w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-[15px] font-semibold text-gray-900 focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/20 transition-all';
const LABEL = 'block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2 ml-0.5';
const CARD = 'gsx-card p-5';
const CARD_TITLE = 'flex items-center gap-3 text-[15px] font-semibold text-gray-900 mb-4';
const CARD_ICON = 'w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0';

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



const ServiceAcceptance = ({ setActiveTab, initialData, clearInitialData }) => {
    // eslint-disable-next-line no-unused-vars
    const { addRepair, customers, addCustomer, updateCustomer, companyProfile, uploadMedia, showToast, serviceTerms, currentUser, servicePoints, visibleServicePoints, deviceModels } = useAppContext();
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
    // Ürün grubu: alanın hemen altında açılan liste (ayrı pencere açılmaz)
    const [showProductPicker, setShowProductPicker] = useState(false);
    const storeSelectRef = useRef(null);
    const productPickerRef = useRef(null);

    // Click outside to close suggestions, store select and product list
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
            if (storeSelectRef.current && !storeSelectRef.current.contains(event.target)) {
                setShowStoreSelect(false);
            }
            if (productPickerRef.current && !productPickerRef.current.contains(event.target)) {
                setShowProductPicker(false);
            }
        };
        const handleEscape = (event) => {
            if (event.key === 'Escape') setShowProductPicker(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
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
        customerType: 'bireysel', // bireysel | kurumsal
        customerTC: '',
        customerPhone: '',
        customerEmail: '',
        customerAddress: '',
        customerCity: '',
        customerDistrict: '',
        satisfaction: '', // '' | 'memnun' | 'memnun_degil'
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
            if (!formData.customerName) { setStep(1); showToast('Lütfen Müşteri Adı giriniz.', 'error'); return; }
            if (!formData.customerPhone) { setStep(1); showToast('Lütfen Cep Numarası giriniz.', 'error'); return; }
            // Mükerrer cari engeli: eşleşen kayıt varsa ya seçilmeli ya da "farklı kişi" onaylanmalı
            if (needsCustomerDecision) {
                setStep(1);
                showToast(
                    customerMatch.level === 'exact'
                        ? 'Bu TC ile kayıtlı bir cari var. Lütfen mevcut cariyi seçin.'
                        : 'Eşleşen bir cari bulundu. Mevcut cariyi seçin ya da farklı kişi olduğunu onaylayın.',
                    'error'
                );
                return;
            }
            if (!formData.productGroup) { setStep(1); showToast('Lütfen Ürün Grubu seçiniz.', 'error'); return; }
            if (!formData.serialNumber) { setStep(1); showToast('Lütfen Seri Numarası giriniz.', 'error'); return; }
            if (!formData.deviceModel) { setStep(1); showToast('Lütfen Cihaz Modeli seçiniz.', 'error'); return; }
            if (!formData.warrantyStatus) { setStep(1); showToast('Lütfen Garanti Durumu seçiniz.', 'error'); return; }
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
                customerCity: formData.customerCity,
                customerDistrict: formData.customerDistrict,
                customerType: formData.customerType,
                satisfaction: formData.satisfaction,
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
                // --- Cari kaydı: mevcut varsa güncellenir, yoksa yeni açılır ---
                await syncCustomerRecord();

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
            // Ayarlar > Cihaz Modelleri ekranıyla aynı kaynak (bkz. utils/deviceCatalog)
            const { models: sourceDatabase } = resolveDeviceCatalog(deviceModels);
            sourceDatabase.forEach(dev => {
                const nameLower = dev.name.toLowerCase();
                if (searchTerms.some(term => nameLower.includes(term))) {
                    buildDeviceCombinations(dev).forEach(combo => {
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
            // Müşteri rehberinden gelindiyse o cariye bağlan; yeni cari açılmasın
            const { customerId, ...prefill } = initialData;
            if (customerId) setLinkedCustomerKey(customerId);
            setFormData(prev => ({
                ...prev,
                ...prefill,
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

    // --- Cari eşleştirme ---
    // Ad soyad, TC, telefon ve e-posta üzerinden kayıtlı cari aranır. Eşleşme
    // varsa yeni cari açılmaz; kullanıcı mevcut kaydı seçmeli ya da farklı kişi
    // olduğunu açıkça onaylamalıdır.
    const customerMatch = React.useMemo(() => findCustomerMatches(customers, {
        name: formData.customerName,
        tc: formData.customerTC,
        phone: formData.customerPhone,
        email: formData.customerEmail,
    }), [customers, formData.customerName, formData.customerTC, formData.customerPhone, formData.customerEmail]);

    const topMatch = customerMatch.matches[0] || null;
    const matchingCustomer = topMatch?.customer || null;

    // Kullanıcının onayladığı mevcut cari
    const [linkedCustomerKey, setLinkedCustomerKey] = useState(null);
    // "Farklı kişi" onayı (yalnızca telefon / ad soyad eşleşmesinde geçerli)
    const [differentPerson, setDifferentPerson] = useState(false);

    const linkedCustomer = React.useMemo(
        () => (linkedCustomerKey ? customers.find(c => String(customerKeyOf(c)) === String(linkedCustomerKey)) || null : null),
        [customers, linkedCustomerKey]
    );

    // Eşleşme listesi değişince önceki onaylar geçersiz olur
    React.useEffect(() => {
        setDifferentPerson(false);
        setLinkedCustomerKey(prev => (
            prev && customerMatch.matches.some(m => String(customerKeyOf(m.customer)) === String(prev)) ? prev : null
        ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerMatch.matches.map(m => customerKeyOf(m.customer)).join('|')]);

    /** Eşleşme çözülmeden servis kaydı tamamlanamaz */
    const needsCustomerDecision = blocksCreate(customerMatch.level) && !linkedCustomer && !differentPerson;

    const handleSelectCustomer = (customer) => {
        setFormData(prev => ({
            ...prev,
            customerName: customer.name || prev.customerName,
            customerPhone: customer.phone || prev.customerPhone,
            customerEmail: customer.email || prev.customerEmail,
            customerTC: customer.tc || prev.customerTC,
            customerAddress: customer.address || prev.customerAddress,
            customerCity: customer.city || prev.customerCity,
            customerDistrict: customer.district || prev.customerDistrict,
            customerType: customer.type === 'kurumsal' ? 'kurumsal' : 'bireysel'
        }));
        setLinkedCustomerKey(customerKeyOf(customer));
        setDifferentPerson(false);
        showToast(`${customer.name} kaydı bu servise bağlandı. Yeni cari açılmayacak.`, 'success');
    };

    /**
     * Servis kaydı tamamlanınca cari tarafını günceller.
     * - Mevcut bir cari bağlıysa (ya da kesin eşleşme varsa) yalnızca eksik
     *   alanları tamamlar; ikinci bir cari açılmaz.
     * - Eşleşme yoksa veya kullanıcı "farklı kişi" onayı verdiyse yeni cari açar.
     * - Sunucu yine de mükerrer bulursa eşleşen kaydı günceller.
     */
    const syncCustomerRecord = async () => {
        const payload = {
            name: formData.customerName,
            phone: formData.customerPhone,
            email: formData.customerEmail,
            address: [formData.customerAddress, formData.customerDistrict, formData.customerCity].filter(Boolean).join(', '),
            city: formData.customerCity || '',
            district: formData.customerDistrict || '',
            tc: formData.customerTC || '',
            type: formData.customerType || 'bireysel',
        };

        // Mevcut kayıtta yalnızca boş alanlar doldurulur, dolu bilgi ezilmez
        const fillGaps = async (existing) => {
            const updates = {};
            Object.entries(payload).forEach(([key, value]) => {
                if (value && !String(existing[key] || '').trim()) updates[key] = value;
            });
            if (Object.keys(updates).length) await updateCustomer(customerKeyOf(existing), updates);
        };

        try {
            const existing = linkedCustomer
                || (blocksCreate(customerMatch.level) && !differentPerson ? matchingCustomer : null);
            if (existing) {
                await fillGaps(existing);
                return;
            }

            const result = await addCustomer({
                ...payload,
                notes: 'Servis kaydı sırasında otomatik oluşturuldu.',
                force: differentPerson,
            });
            if (result?.duplicate && result.matches?.length) {
                await fillGaps(result.matches[0]);
            }
        } catch (custErr) {
            console.error('Cari kaydı senkronize edilemedi:', custErr);
        }
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

    const isTCValid = isValidTc(formData.customerTC);

    const selectedProductGroup = PRODUCT_GROUPS.find(g => g.id === formData.productGroup) || null;

    /** Ürün grubu seçimi: varsayılan işlem türü ve yer tutucu görsel de ayarlanır */
    const applyProductGroup = (groupId) => {
        const group = PRODUCT_GROUPS.find(g => g.id === groupId);
        if (!group) return;
        const isExchangeDefault = ['watch', 'airpods', 'other'].includes(group.id);
        setFormData(prev => {
            const uploadedFiles = (prev.mediaFiles || []).filter(f => !f.isDefault);
            return {
                ...prev,
                productGroup: group.id,
                serviceType: isExchangeDefault ? 'exchange' : 'repair',
                mediaFiles: [...uploadedFiles, { url: group.img || PRODUCT_IMAGES[group.id], id: 'placeholder', isDefault: true, productGroup: group.id }]
            };
        });
    };

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
                mediaFiles: [], notes: '',
                customerType: 'bireysel', customerCity: '', customerDistrict: '', satisfaction: '',
                productGroup: '', serviceType: 'repair', estimatedCost: '', beforeImages: [], afterImages: [],
                storeId: currentUser?.storeId || '', createdBy: currentUser?.name || ''
            });
            if (sigCanvas.current) sigCanvas.current.clear();
            setStep(1);
        }
    };

    return (
        <div className="page-shell animate-fade-in">
            {/* Üst şerit — sabit kalır */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                        <Wrench size={24} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-[26px] font-semibold text-gray-900 tracking-tight leading-tight">Servis Kaydı</h2>
                        <p className="text-[13px] font-medium text-gray-500 truncate">Müşteri ve cihaz bilgilerini tek ekranda doldurun.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {canPickStore && (
                        <div className="relative" ref={storeSelectRef}>
                            <button
                                type="button"
                                onClick={() => setShowStoreSelect(!showStoreSelect)}
                                aria-haspopup="listbox"
                                aria-expanded={showStoreSelect}
                                className={`flex items-center gap-2 h-10 px-3.5 rounded-xl border transition-all shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${showStoreSelect ? 'bg-[#0071e3] border-[#0071e3] text-white' : 'bg-white border-gray-200 text-[#1d1d1f] hover:bg-gray-50'}`}
                            >
                                <MapPin size={14} className={showStoreSelect ? 'text-white' : 'text-[#0071e3]'} aria-hidden="true" />
                                <span className="text-[11px] font-bold uppercase tracking-tight">
                                    {visibleServicePoints.find(sp => String(sp.id) === String(formData.storeId))?.name || 'Mağaza Seçiniz'}
                                </span>
                                <ChevronDown size={13} aria-hidden="true" className={`transition-transform ${showStoreSelect ? 'rotate-180' : 'opacity-50'}`} />
                            </button>

                            {showStoreSelect && (
                                <ul role="listbox" aria-label="Mağaza seçimi" className="absolute top-full right-0 mt-2 list-none bg-white border border-gray-200 shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-xl p-1.5 m-0 w-64 z-[60] max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                                    {visibleServicePoints.map(sp => {
                                        const active = String(formData.storeId) === String(sp.id);
                                        return (
                                            <li key={sp.id} role="option" aria-selected={active}>
                                                <button
                                                    type="button"
                                                    onClick={() => { setFormData({ ...formData, storeId: sp.id }); setShowStoreSelect(false); }}
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-[12px] font-semibold flex items-center gap-2.5 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active ? 'bg-[#0071e3]/8 text-[#0071e3]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                                >
                                                    <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-[#0071e3]' : 'bg-gray-300'}`} />
                                                    <span className="truncate">{sp.name}</span>
                                                    {active && <Check size={13} className="ml-auto shrink-0" aria-hidden="true" />}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    )}

                    <div role="group" aria-label="Kayıt adımı" className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                        {STEPS.map(({ id, label }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setStep(id)}
                                aria-current={step === id ? 'step' : undefined}
                                className={`h-9 px-3.5 rounded-lg text-[12px] font-bold transition-all flex items-center gap-2 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${step === id ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span aria-hidden="true" className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === id ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>{id}</span>
                                <span className="hidden md:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* İçerik */}
            <div className="page-scroll py-4 pr-1">
                {step === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-4 items-start animate-scale-up">
                        {/* --- Müşteri --- */}
                        <section aria-labelledby="sa-customer-title" className={`${CARD} xl:col-span-4`}>
                            <h3 id="sa-customer-title" className={CARD_TITLE}>
                                <span className={CARD_ICON}><User size={18} strokeWidth={2.5} /></span>
                                Müşteri Bilgileri
                            </h3>

                            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                                <div className="col-span-2">
                                    <label htmlFor="sa-name" className={LABEL}>
                                        Ad Soyad <span className="text-[#e30000]" aria-hidden="true">*</span>
                                    </label>
                                    <input
                                        id="sa-name" type="text" placeholder="Örn: Ayşe Yılmaz"
                                        className={FIELD}
                                        value={formData.customerName}
                                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <p id="sa-type-label" className={LABEL}>Müşteri Tipi</p>
                                    <div role="group" aria-labelledby="sa-type-label" className="grid grid-cols-2 gap-2">
                                        {[{ id: 'bireysel', label: 'Bireysel' }, { id: 'kurumsal', label: 'Kurumsal' }].map(opt => {
                                            const active = formData.customerType === opt.id;
                                            return (
                                                <button
                                                    key={opt.id} type="button"
                                                    onClick={() => setFormData({ ...formData, customerType: opt.id })}
                                                    aria-pressed={active}
                                                    className={`h-[46px] rounded-xl border text-[14px] font-bold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active
                                                        ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-sm shadow-[#0071e3]/20'
                                                        : 'bg-gray-50 border-gray-200 text-[#1d1d1f] hover:bg-white'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="sa-tc" className={LABEL}>
                                        {formData.customerType === 'kurumsal' ? 'Vergi No' : 'TC Kimlik No'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="sa-tc" type="text" maxLength={formData.customerType === 'kurumsal' ? 10 : 11}
                                            placeholder={formData.customerType === 'kurumsal' ? '10 haneli' : '11 haneli'}
                                            aria-invalid={formData.customerType === 'bireysel' && isTCValid === false ? 'true' : undefined}
                                            aria-describedby="sa-tc-status"
                                            className={`w-full pl-4 pr-10 py-3 rounded-xl border outline-none font-mono font-bold text-[15px] transition-all ${formData.customerType === 'bireysel' && isTCValid === true ? 'bg-green-50 border-green-500 text-green-900' : formData.customerType === 'bireysel' && isTCValid === false ? 'bg-red-50 border-red-500 text-red-900' : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-[#0071e3]'}`}
                                            value={formData.customerTC}
                                            onChange={(e) => setFormData({ ...formData, customerTC: e.target.value.replace(/\D/g, '') })}
                                        />
                                        {formData.customerType === 'bireysel' && isTCValid === true && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600"><CheckCircle size={16} strokeWidth={3} /></span>}
                                        {formData.customerType === 'bireysel' && isTCValid === false && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500"><AlertCircle size={16} strokeWidth={3} /></span>}
                                    </div>
                                    <p id="sa-tc-status" className="sr-only" aria-live="polite">
                                        {formData.customerType === 'bireysel' && isTCValid === false ? 'TC kimlik numarası geçersiz' : ''}
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="sa-phone" className={LABEL}>
                                        Cep Numarası <span className="text-[#e30000]" aria-hidden="true">*</span>
                                    </label>
                                    <input
                                        id="sa-phone" type="tel" placeholder="0 (5XX) 000 00 00"
                                        className={FIELD}
                                        value={formData.customerPhone}
                                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label htmlFor="sa-email" className={LABEL}>Mail Adresi</label>
                                    <input
                                        id="sa-email" type="email" placeholder="ornek@email.com"
                                        className={FIELD}
                                        value={formData.customerEmail}
                                        onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                    />
                                </div>

                                <InlineSelect
                                    id="sa-city"
                                    label="İl"
                                    dense
                                    icon={MapPin}
                                    value={formData.customerCity}
                                    options={PROVINCES}
                                    placeholder="İl seçiniz"
                                    searchPlaceholder="İl ara…"
                                    emptyText="Eşleşen il bulunamadı."
                                    onSelect={(city) => setFormData(prev => ({ ...prev, customerCity: city, customerDistrict: '' }))}
                                />

                                <InlineSelect
                                    id="sa-district"
                                    label="İlçe"
                                    dense
                                    value={formData.customerDistrict}
                                    options={districtsOf(formData.customerCity)}
                                    disabled={!formData.customerCity}
                                    disabledText="Önce il seçiniz"
                                    placeholder="İlçe seçiniz"
                                    searchPlaceholder="İlçe ara…"
                                    emptyText="Eşleşen ilçe bulunamadı."
                                    onSelect={(district) => setFormData(prev => ({ ...prev, customerDistrict: district }))}
                                />

                                <div className="col-span-2">
                                    <label htmlFor="sa-address" className={LABEL}>Açık Adres</label>
                                    <textarea
                                        id="sa-address" rows="2" placeholder="Mahalle, cadde, sokak, kapı no…"
                                        className={`${FIELD} resize-none`}
                                        value={formData.customerAddress}
                                        onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <p id="sa-sat-label" className={LABEL}>Önceki Servis Memnuniyeti</p>
                                    <div role="group" aria-labelledby="sa-sat-label" className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'memnun', label: 'Memnun', tone: 'bg-[#008000] border-[#008000]' },
                                            { id: 'memnun_degil', label: 'Memnun Değil', tone: 'bg-[#e30000] border-[#e30000]' },
                                            { id: '', label: 'Belirtilmedi', tone: 'bg-[#1d1d1f] border-[#1d1d1f]' },
                                        ].map(opt => {
                                            const active = (formData.satisfaction || '') === opt.id;
                                            return (
                                                <button
                                                    key={opt.id || 'none'} type="button"
                                                    onClick={() => setFormData({ ...formData, satisfaction: opt.id })}
                                                    aria-pressed={active}
                                                    className={`h-[46px] px-2 rounded-xl border text-[12px] font-bold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active
                                                        ? `${opt.tone} text-white shadow-sm`
                                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Kayıtlı cari eşleşmesi — çözülmeden kayıt tamamlanamaz */}
                            {linkedCustomer ? (
                                <div className="mt-3 p-3 bg-white border border-green-200 rounded-xl flex items-center gap-3">
                                    <span aria-hidden="true" className="w-9 h-9 bg-[#008000] rounded-full flex items-center justify-center text-white shrink-0">
                                        <CheckCircle size={18} strokeWidth={2.5} />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 text-[13px] truncate">{linkedCustomer.name}</p>
                                        <p className="text-[11px] text-gray-500 font-medium truncate">
                                            Mevcut cari kullanılıyor <span className="font-mono">{linkedCustomer.id}</span>
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setLinkedCustomerKey(null)}
                                        className="text-[11px] font-bold text-gray-500 hover:text-[#e30000] px-2 py-1.5 rounded-lg transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 shrink-0"
                                    >
                                        Kaldır
                                    </button>
                                </div>
                            ) : customerMatch.matches.length > 0 && (
                                <div
                                    role={blocksCreate(customerMatch.level) ? 'alert' : undefined}
                                    className={`mt-3 p-3 rounded-xl border space-y-2 ${customerMatch.level === 'exact'
                                        ? 'border-[#e30000]/30 bg-[#e30000]/5'
                                        : customerMatch.level === 'confirm'
                                            ? 'border-[#ff9500]/35 bg-[#ff9500]/5'
                                            : 'border-blue-100 bg-white'}`}
                                >
                                    {blocksCreate(customerMatch.level) && (
                                        <p className="flex items-start gap-2 text-[11px] font-semibold text-gray-800 leading-snug">
                                            <span aria-hidden="true" className={customerMatch.level === 'exact' ? 'text-[#e30000] mt-0.5' : 'text-[#bf5b04] mt-0.5'}>
                                                <AlertTriangle size={14} />
                                            </span>
                                            {customerMatch.level === 'exact'
                                                ? 'Bu TC ile kayıtlı bir cari var. Yeni cari açılamaz; aşağıdaki kaydı seçin.'
                                                : 'Eşleşen bir cari var. Mevcut cariyi seçin ya da farklı kişi olduğunu onaylayın.'}
                                        </p>
                                    )}

                                    {customerMatch.matches.slice(0, 3).map((match) => (
                                        <button
                                            key={customerKeyOf(match.customer)}
                                            type="button"
                                            onClick={() => handleSelectCustomer(match.customer)}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-left hover:border-[#0071e3]/40 hover:bg-[#0071e3]/5 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                        >
                                            <span className="flex items-center gap-3">
                                                <span aria-hidden="true" className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                    {match.customer.name?.[0] || 'M'}
                                                </span>
                                                <span className="flex-1 min-w-0">
                                                    <span className="block font-bold text-gray-900 text-[13px] truncate">{match.customer.name}</span>
                                                    <span className="block text-[11px] text-gray-500 font-medium truncate">{describeMatch(match.reasons)}</span>
                                                </span>
                                                <ChevronRight size={18} className="text-blue-500 shrink-0" aria-hidden="true" />
                                            </span>
                                        </button>
                                    ))}

                                    {isForceable(customerMatch.level) && (
                                        <label className="flex items-start gap-2.5 text-[11px] font-medium text-gray-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={differentPerson}
                                                onChange={(e) => setDifferentPerson(e.target.checked)}
                                                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#0071e3]"
                                            />
                                            <span>Bu farklı bir kişi, yeni cari açılsın.</span>
                                        </label>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* --- Cihaz kimliği + garanti --- */}
                        <div className="xl:col-span-4 space-y-4">
                            <section aria-labelledby="sa-device-title" className={CARD}>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h3 id="sa-device-title" className="flex items-center gap-3 text-[15px] font-semibold text-gray-900">
                                        <span className={CARD_ICON}><Phone size={18} strokeWidth={2.5} /></span>
                                        Cihaz Kimliği
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={openAppleCoverage}
                                        className="text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                    >
                                        Garanti Sorgula <ExternalLink size={12} />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div ref={productPickerRef} className="relative">
                                        <p id="sa-product-label" className={LABEL}>
                                            Ürün Grubu <span className="text-[#e30000]" aria-hidden="true">*</span>
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setShowProductPicker(open => !open)}
                                            aria-haspopup="listbox"
                                            aria-expanded={showProductPicker}
                                            aria-controls="sa-product-listbox"
                                            className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${showProductPicker
                                                ? 'bg-white border-[#0071e3]'
                                                : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300'}`}
                                        >
                                            <span className="flex items-center gap-3 min-w-0">
                                                {selectedProductGroup ? (
                                                    <>
                                                        <span className={`w-11 h-11 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 ${selectedProductGroup.color}`}>
                                                            <selectedProductGroup.icon size={22} />
                                                        </span>
                                                        <span className="text-[15px] font-bold text-gray-900 truncate">{selectedProductGroup.label}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="w-11 h-11 rounded-lg bg-gray-200 text-gray-400 flex items-center justify-center shrink-0">
                                                            <Package size={22} />
                                                        </span>
                                                        <span className="text-[15px] font-bold text-gray-400 truncate">Ürün Grubu Seçiniz</span>
                                                    </>
                                                )}
                                            </span>
                                            <ChevronDown size={16} aria-hidden="true" className={`text-gray-400 shrink-0 transition-transform ${showProductPicker ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showProductPicker && (
                                            <ul
                                                id="sa-product-listbox"
                                                role="listbox"
                                                aria-labelledby="sa-product-label"
                                                className="absolute top-full left-0 right-0 mt-2 z-40 list-none p-1.5 m-0 bg-white border border-gray-200 rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.12)] max-h-72 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2"
                                            >
                                                {PRODUCT_GROUPS.map(group => {
                                                    const selected = formData.productGroup === group.id;
                                                    return (
                                                        <li key={group.id} role="option" aria-selected={selected}>
                                                            <button
                                                                type="button"
                                                                onClick={() => { applyProductGroup(group.id); setShowProductPicker(false); }}
                                                                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${selected ? 'bg-[#0071e3]/8' : 'hover:bg-gray-50'}`}
                                                            >
                                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 ${group.color}`}>
                                                                    <group.icon size={16} />
                                                                </span>
                                                                <span className={`text-[13px] font-bold truncate ${selected ? 'text-[#0071e3]' : 'text-gray-900'}`}>{group.label}</span>
                                                                {selected && <Check size={15} strokeWidth={3} className="ml-auto text-[#0071e3] shrink-0" aria-hidden="true" />}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>

                                    {formData.productGroup && (
                                        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-100">
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide ml-2">İşlem Türü</span>
                                            <div className="flex gap-1">
                                                {['iphone', 'ipad', 'mac'].includes(formData.productGroup) && (
                                                    <button type="button" onClick={() => setFormData({ ...formData, serviceType: 'repair' })} aria-pressed={formData.serviceType === 'repair'} className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold uppercase transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${formData.serviceType === 'repair' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-gray-400 hover:bg-white'}`}>Onarım</button>
                                                )}
                                                <button type="button" onClick={() => setFormData({ ...formData, serviceType: 'exchange' })} aria-pressed={formData.serviceType === 'exchange'} className={`px-3.5 py-1.5 rounded-lg text-[11px] font-semibold uppercase transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${formData.serviceType === 'exchange' ? 'bg-white text-blue-600 shadow-sm border border-blue-100' : 'text-gray-400 hover:bg-white'}`}>Değişim</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="group relative">
                                        <label htmlFor="sa-serial" className={LABEL}>
                                            Seri Numarası (S/N) <span className="text-[#e30000]" aria-hidden="true">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="sa-serial"
                                                type="text"
                                                placeholder="Örn: C7H..."
                                                className="w-full pl-11 pr-24 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/20 outline-none transition-all font-mono font-bold text-[15px] text-gray-900 uppercase"
                                                value={formData.serialNumber}
                                                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value.toUpperCase() })}
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0071e3] transition-colors"><Fingerprint size={16} /></span>
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                                <button type="button" aria-label="Seri numarasını kameradan tara" onClick={() => { showToast('Kamera başlatılıyor...', 'info'); serialInputRef.current?.click(); }} className="p-1.5 hover:bg-blue-50 rounded-md text-blue-600 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"><Camera size={16} strokeWidth={2.5} /></button>
                                                <button type="button" aria-label="Seri numarasını sorgula" onClick={handleSerialSearch} disabled={searching} className="p-1.5 hover:bg-blue-50 rounded-md text-blue-600 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25">{searching ? <span className="block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Search size={16} strokeWidth={2.5} />}</button>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="group relative" ref={suggestionsRef}>
                                        <label htmlFor="sa-model" className={LABEL}>
                                            Cihaz Modeli <span className="text-[#e30000]" aria-hidden="true">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="sa-model"
                                                type="text"
                                                placeholder="Örn: iPhone 13..."
                                                autoComplete="off"
                                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/20 outline-none transition-all font-bold text-[15px] text-gray-900"
                                                value={formData.deviceModel}
                                                onChange={handleDeviceModelChange}
                                                onFocus={() => formData.deviceModel.length > 1 && setShowSuggestions(true)}
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0071e3] transition-colors"><Package size={16} /></span>
                                            {showSuggestions && deviceSuggestions.length > 0 && (
                                                <ul className="absolute top-full left-0 right-0 mt-2 list-none p-1.5 m-0 bg-white rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-200 max-h-56 overflow-y-auto z-50 custom-scrollbar animate-in fade-in slide-in-from-top-2">
                                                    {deviceSuggestions.map((suggestion, index) => (
                                                        <li key={index}>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setFormData(prev => ({ ...prev, deviceModel: suggestion, serviceType: /iPad|AirPods|Watch|Pencil|Mouse|Trackpad/.test(suggestion) ? 'exchange' : 'repair' })); setShowSuggestions(false); }}
                                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2.5 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                                            >
                                                                <span aria-hidden="true" className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                                                                    {suggestion.includes('iPhone') ? <Phone size={14} /> : <Package size={14} />}
                                                                </span>
                                                                <span className="font-bold text-[13px] text-gray-700 truncate">{suggestion}</span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="sa-imei1" className={LABEL}>IMEI 1 (Ops.)</label>
                                            <input
                                                id="sa-imei1" type="text" maxLength="15" placeholder="35..."
                                                className={`${FIELD} font-mono`}
                                                value={formData.imei1}
                                                onChange={(e) => setFormData({ ...formData, imei1: e.target.value.replace(/\D/g, '') })}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="sa-imei2" className={LABEL}>IMEI 2 (Ops.)</label>
                                            <input
                                                id="sa-imei2" type="text" maxLength="15" placeholder="35..."
                                                className={`${FIELD} font-mono`}
                                                value={formData.imei2}
                                                onChange={(e) => setFormData({ ...formData, imei2: e.target.value.replace(/\D/g, '') })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section aria-labelledby="sa-warranty-title" className={CARD}>
                                <h3 id="sa-warranty-title" className={CARD_TITLE}>
                                    <span className={CARD_ICON}><Shield size={18} strokeWidth={2.5} /></span>
                                    Garanti Kapsamı <span className="text-[#e30000]" aria-hidden="true">*</span>
                                </h3>
                                <div role="group" aria-labelledby="sa-warranty-title" className="grid grid-cols-2 gap-2">
                                    {[{ id: 'standard', label: 'Standart Garanti', icon: Shield }, { id: 'applecare', label: 'AppleCare+', icon: CheckCircle }, { id: 'troy-koruma', label: 'Troy Ekstra Koruma', icon: Shield }, { id: 'out-of-warranty', label: 'Garantisi Bitmiş', icon: ShieldAlert }].map((type) => {
                                        const active = formData.warrantyStatus === type.id;
                                        return (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, warrantyStatus: type.id })}
                                                aria-pressed={active}
                                                className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active ? 'border-[#0071e3] bg-[#0071e3]/6 text-[#1d1d1f] shadow-sm' : 'border-gray-200 bg-gray-50 hover:bg-white text-gray-600'}`}
                                            >
                                                <span aria-hidden="true" className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white text-[#0071e3]' : 'bg-white text-gray-400'}`}>
                                                    <type.icon size={17} strokeWidth={2.5} />
                                                </span>
                                                <span className="font-bold text-[12px] leading-tight">{type.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {formData.warrantyStatus === 'out-of-warranty' && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                                        <label htmlFor="sa-cost" className={LABEL}>Tahmini / Alınan Tutar</label>
                                        <div className="relative">
                                            <input
                                                id="sa-cost" type="text" placeholder="0.00"
                                                className="w-full pl-9 pr-4 py-3 rounded-xl bg-orange-50/50 border border-orange-200 outline-none font-bold text-[15px] text-orange-900 focus-visible:ring-4 focus-visible:ring-[#ff9500]/20"
                                                value={formData.estimatedCost}
                                                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                                            />
                                            <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400 font-semibold text-sm">₺</span>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* --- Durum, sorun ve görseller --- */}
                        <div className="xl:col-span-4 space-y-4">
                            <section aria-labelledby="sa-condition-title" className={CARD}>
                                <h3 id="sa-condition-title" className={CARD_TITLE}>
                                    <span className={CARD_ICON}><AlertTriangle size={18} strokeWidth={2.5} /></span>
                                    Fiziksel Durum
                                </h3>
                                <div role="group" aria-labelledby="sa-condition-title" className="grid grid-cols-2 gap-2">
                                    {['Ekran Çizik', 'Kasa Darbe', 'Kamera Çatlak', 'Sıvı Teması', 'Yamulma', 'Tuş Arızası', 'FaceID Arızası', 'Arka Cam Kırık', 'Lekeler', 'Soyulma'].map((item) => {
                                        const active = formData.visualCondition.includes(item);
                                        return (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => toggleCondition(item)}
                                                aria-pressed={active}
                                                className={`py-2.5 px-3 rounded-xl text-[12px] font-bold border transition-all text-left outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white'}`}
                                            >
                                                {item}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section aria-labelledby="sa-issue-title" className={CARD}>
                                <h3 id="sa-issue-title" className={CARD_TITLE}>
                                    <span className={CARD_ICON}><FileText size={18} strokeWidth={2.5} /></span>
                                    Sorun Detayları
                                </h3>
                                <label htmlFor="sa-issue" className="sr-only">Müşteri şikayeti</label>
                                <textarea
                                    id="sa-issue"
                                    rows="3"
                                    placeholder="Müşteri şikayetini yazınız…"
                                    value={formData.issueDescription}
                                    onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                                    className={`${FIELD} resize-none leading-relaxed`}
                                />
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {['Batarya Sorunu', 'Şarj Olmuyor', 'Ekran Kırık', 'Sıvı Teması', 'FaceID Çalışmıyor'].map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, issueDescription: prev.issueDescription ? prev.issueDescription + ', ' + tag : tag }))}
                                            className="text-[11px] font-bold px-3 py-2 bg-white border border-gray-200 hover:border-[#0071e3] hover:text-[#0071e3] text-gray-500 rounded-lg transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section aria-labelledby="sa-photos-title" className={CARD}>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h3 id="sa-photos-title" className="flex items-center gap-3 text-[15px] font-semibold text-gray-900">
                                        <span className={CARD_ICON}><Camera size={18} strokeWidth={2.5} /></span>
                                        Cihaz Fotoğrafları
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleAddPhoto}
                                        disabled={uploading}
                                        className="bg-gray-900 hover:bg-black disabled:opacity-40 text-white px-3.5 py-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                    >
                                        {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} Ekle
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg, image/png" capture="environment" onChange={(e) => handleFileChange(e, 'before')} />
                                <div className="grid grid-cols-4 gap-2.5">
                                    {formData.beforeImages?.map((url, index) => (
                                        <div key={index} className="relative aspect-square group rounded-lg overflow-hidden border border-gray-200">
                                            <img src={url} alt={`Kabul görseli ${index + 1}`} className="w-full h-full object-cover" />
                                            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                <button type="button" aria-label="Görseli yeni sekmede aç" onClick={() => window.open(url, '_blank')} className="p-1 bg-white/20 rounded text-white hover:bg-white/40"><ExternalLink size={12} /></button>
                                                <button type="button" aria-label="Görseli kaldır" onClick={() => removePhoto(index, 'before')} className="p-1 bg-red-500/80 rounded text-white hover:bg-red-600"><X size={12} /></button>
                                            </span>
                                        </div>
                                    ))}
                                    {(!formData.beforeImages || formData.beforeImages.length < 5) && (
                                        <button
                                            type="button"
                                            onClick={handleAddPhoto}
                                            aria-label="Cihaz fotoğrafı ekle"
                                            className="aspect-square rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-white hover:border-[#0071e3]/40 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                        >
                                            <Camera size={16} strokeWidth={1.5} />
                                        </button>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="max-w-3xl animate-scale-up">
                        <section aria-labelledby="sa-approval-title" className={CARD}>
                            <h3 id="sa-approval-title" className={CARD_TITLE}>
                                <span className={CARD_ICON}><FileText size={18} strokeWidth={2.5} /></span>
                                Onay ve Teslim
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData.findMyOff ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-200'} has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#0071e3]/25`}>
                                    <span aria-hidden="true" className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${formData.findMyOff ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                                        <Check size={14} strokeWidth={4} className={formData.findMyOff ? 'opacity-100' : 'opacity-0'} />
                                    </span>
                                    <input type="checkbox" className="sr-only" checked={formData.findMyOff} onChange={(e) => setFormData({ ...formData, findMyOff: e.target.checked })} />
                                    <span>
                                        <span className="font-bold text-gray-900 block text-sm mb-1">Cihazımı Bul (FMI) Kapalı</span>
                                        <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded uppercase mr-2">Zorunlu</span>
                                        <span className="text-[12px] text-gray-500 font-medium">Apple prosedürleri gereği kapalı olmadan servis kaydı açılamaz.</span>
                                    </span>
                                </label>

                                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData.backupTaken ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200'} has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#0071e3]/25`}>
                                    <span aria-hidden="true" className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${formData.backupTaken ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>
                                        <Check size={14} strokeWidth={4} className={formData.backupTaken ? 'opacity-100' : 'opacity-0'} />
                                    </span>
                                    <input type="checkbox" className="sr-only" checked={formData.backupTaken} onChange={(e) => setFormData({ ...formData, backupTaken: e.target.checked })} />
                                    <span>
                                        <span className="font-bold text-gray-900 block text-sm mb-1">Yedekleme Sorumluluğu</span>
                                        <span className="text-[12px] text-gray-500 font-medium">Müşteri veri kaybı riskini kabul etti.</span>
                                    </span>
                                </label>
                            </div>
                            <p className="text-[12px] text-gray-500 font-medium mt-3">
                                Kaydı tamamladığınızda müşteri imzası için tam ekran kabul formu açılır.
                            </p>
                        </section>
                    </div>
                )}
            </div>

            {/* Alt şerit — kayıt özeti ve gezinme her zaman görünür */}
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 shrink-0">Kayıt Özeti</span>
                    {[
                        { label: 'Müşteri', value: formData.customerName },
                        { label: 'Telefon', value: formData.customerPhone },
                        { label: 'Ürün', value: selectedProductGroup?.label },
                        { label: 'Cihaz', value: formData.deviceModel },
                        { label: 'Seri No', value: formData.serialNumber, mono: true },
                    ].map(row => (
                        <span key={row.label} className="flex items-baseline gap-1.5 min-w-0">
                            <dt className="text-[11px] font-bold uppercase tracking-widest text-gray-400 shrink-0">{row.label}</dt>
                            <dd className={`text-[13px] font-semibold truncate max-w-[180px] ${row.value ? 'text-[#1d1d1f]' : 'text-gray-300'} ${row.mono ? 'font-mono' : ''}`}>
                                {row.value || '—'}
                            </dd>
                        </span>
                    ))}
                </dl>

                <div className="flex items-center gap-3 shrink-0">
                    {step > 1 && (
                        <button
                            type="button"
                            onClick={() => setStep(step - 1)}
                            aria-label="Önceki adım"
                            className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-bold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    {step < 2 ? (
                        <button
                            type="button"
                            onClick={() => setStep(step + 1)}
                            className="h-11 px-5 rounded-xl bg-gray-900 text-white text-[13px] font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                        >
                            Onay ve İmza <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handlePrepareSubmission}
                            disabled={!formData.findMyOff || uploading}
                            className={`h-11 px-5 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-2 shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${(!formData.findMyOff || uploading) ? 'bg-gray-400 cursor-not-allowed opacity-50 text-white' : 'bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-[#0071e3]/20'}`}
                        >
                            {uploading ? 'Görsel Yükleniyor...' : <><Save size={16} strokeWidth={2.5} /> Kaydı Tamamla</>}
                        </button>
                    )}
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
