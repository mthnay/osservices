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
import PickerModal from './ui/PickerModal';
import InlineSelect from './ui/InlineSelect';
import { PROVINCES, districtsOf } from '../utils/turkeyRegions';
import {
    findCustomerMatches, describeMatch, blocksCreate, isForceable, isValidTc, customerKeyOf,
} from '../utils/customerMatch';

const STEPS = [
    { id: 1, label: 'MÜŞTERİ' },
    { id: 2, label: 'CİHAZ' },
    { id: 3, label: 'İMZA' },
];

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
    // Popup seçiciler: ürün grubu, il, ilçe
    const [showProductPicker, setShowProductPicker] = useState(false);
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
            if (!formData.productGroup) { setStep(2); showToast('Lütfen Ürün Grubu seçiniz.', 'error'); return; }
            if (!formData.serialNumber) { setStep(2); showToast('Lütfen Seri Numarası giriniz.', 'error'); return; }
            if (!formData.deviceModel) { setStep(2); showToast('Lütfen Cihaz Modeli seçiniz.', 'error'); return; }
            if (!formData.warrantyStatus) { setStep(2); showToast('Lütfen Garanti Durumu seçiniz.', 'error'); return; }
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
        <div className="page-scroll space-y-6 animate-fade-in pr-1">
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
                        {STEPS.map(({ id, label }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setStep(id)}
                                aria-current={step === id ? 'step' : undefined}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${step === id ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === id ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>{id}</span>
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                    {step === 1 && (
                        <div className="space-y-6 animate-scale-up">
                            <div className="gsx-card p-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-8 flex items-center gap-3">
                                    <div className="p-3 bg-blue-50 rounded-md text-blue-600"><User size={24} strokeWidth={2.5} /></div>
                                    Müşteri Bilgileri
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    {/* Ad Soyad */}
                                    <div className="md:col-span-2 space-y-2">
                                        <label htmlFor="sa-name" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                                            Ad Soyad <span className="text-[#e30000]" aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id="sa-name" type="text" placeholder="Örn: Ayşe Yılmaz"
                                            className="w-full px-5 py-4 rounded-md bg-gray-50 border border-gray-200 outline-none font-bold text-gray-900 focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                                            value={formData.customerName}
                                            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                        />
                                    </div>

                                    {/* Müşteri tipi */}
                                    <div className="md:col-span-2 space-y-2">
                                        <p id="sa-type-label" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Müşteri Tipi</p>
                                        <div role="group" aria-labelledby="sa-type-label" className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'bireysel', label: 'Bireysel', hint: 'TC kimlik numarası ile' },
                                                { id: 'kurumsal', label: 'Kurumsal', hint: 'Vergi kimlik numarası ile' },
                                            ].map(opt => {
                                                const active = formData.customerType === opt.id;
                                                return (
                                                    <button
                                                        key={opt.id} type="button"
                                                        onClick={() => setFormData({ ...formData, customerType: opt.id })}
                                                        aria-pressed={active}
                                                        className={`flex flex-col items-start gap-1 p-4 rounded-lg border transition-all text-left outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active
                                                            ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-sm shadow-[#0071e3]/20'
                                                            : 'bg-gray-50 border-gray-200 text-[#1d1d1f] hover:bg-white'}`}
                                                    >
                                                        <span className="text-sm font-bold">{opt.label}</span>
                                                        <span className={`text-[11px] font-medium ${active ? 'text-white/75' : 'text-gray-500'}`}>{opt.hint}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* TC / VKN */}
                                    <div className="space-y-2">
                                        <label htmlFor="sa-tc" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                                            {formData.customerType === 'kurumsal' ? 'Vergi Kimlik No' : 'TC Kimlik Numarası'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="sa-tc" type="text" maxLength={formData.customerType === 'kurumsal' ? 10 : 11}
                                                placeholder={formData.customerType === 'kurumsal' ? '10 haneli' : '11 haneli'}
                                                aria-invalid={formData.customerType === 'bireysel' && isTCValid === false ? 'true' : undefined}
                                                aria-describedby="sa-tc-status"
                                                className={`w-full pl-5 pr-10 py-4 rounded-md border outline-none font-mono font-bold text-sm transition-all ${formData.customerType === 'bireysel' && isTCValid === true ? 'bg-green-50 border-green-500 text-green-900' : formData.customerType === 'bireysel' && isTCValid === false ? 'bg-red-50 border-red-500 text-red-900' : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-[#0071e3]'}`}
                                                value={formData.customerTC}
                                                onChange={(e) => setFormData({ ...formData, customerTC: e.target.value.replace(/\D/g, '') })}
                                            />
                                            {formData.customerType === 'bireysel' && isTCValid === true && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600"><CheckCircle size={18} strokeWidth={3} /></div>}
                                            {formData.customerType === 'bireysel' && isTCValid === false && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500"><AlertCircle size={18} strokeWidth={3} /></div>}
                                        </div>
                                        <p id="sa-tc-status" className="sr-only" aria-live="polite">
                                            {formData.customerType === 'bireysel' && isTCValid === false ? 'TC kimlik numarası geçersiz' : ''}
                                        </p>
                                    </div>

                                    {/* Cep numarası */}
                                    <div className="space-y-2">
                                        <label htmlFor="sa-phone" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                                            Cep Numarası <span className="text-[#e30000]" aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id="sa-phone" type="tel" placeholder="0 (5XX) 000 00 00"
                                            className="w-full px-5 py-4 rounded-md bg-gray-50 border border-gray-200 outline-none font-bold text-gray-900 text-sm focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                                            value={formData.customerPhone}
                                            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                        />
                                    </div>

                                    {/* E-posta */}
                                    <div className="md:col-span-2 space-y-2">
                                        <label htmlFor="sa-email" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Mail Adresi</label>
                                        <input
                                            id="sa-email" type="email" placeholder="ornek@email.com"
                                            className="w-full px-5 py-4 rounded-md bg-gray-50 border border-gray-200 outline-none font-medium text-gray-900 text-sm focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                                            value={formData.customerEmail}
                                            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                        />
                                    </div>

                                    {/* İl — alanın altında açılan aranabilir liste */}
                                    <InlineSelect
                                        id="sa-city"
                                        label="İl"
                                        icon={MapPin}
                                        value={formData.customerCity}
                                        options={PROVINCES}
                                        placeholder="İl seçiniz"
                                        searchPlaceholder="İl ara…"
                                        emptyText="Eşleşen il bulunamadı."
                                        onSelect={(city) => setFormData(prev => ({ ...prev, customerCity: city, customerDistrict: '' }))}
                                    />

                                    {/* İlçe — il seçilene kadar kapalı */}
                                    <InlineSelect
                                        id="sa-district"
                                        label="İlçe"
                                        value={formData.customerDistrict}
                                        options={districtsOf(formData.customerCity)}
                                        disabled={!formData.customerCity}
                                        disabledText="Önce il seçiniz"
                                        placeholder="İlçe seçiniz"
                                        searchPlaceholder="İlçe ara…"
                                        emptyText="Eşleşen ilçe bulunamadı."
                                        onSelect={(district) => setFormData(prev => ({ ...prev, customerDistrict: district }))}
                                    />

                                    {/* Açık adres */}
                                    <div className="md:col-span-2 space-y-2">
                                        <label htmlFor="sa-address" className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Açık Adres</label>
                                        <textarea
                                            id="sa-address" rows="3" placeholder="Mahalle, cadde, sokak, kapı no…"
                                            className="w-full px-5 py-4 rounded-md bg-gray-50 border border-gray-200 outline-none font-medium text-gray-900 text-sm resize-none focus:bg-white focus:border-[#0071e3] focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 transition-all"
                                            value={formData.customerAddress}
                                            onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Kayıtlı cari eşleşmesi — çözülmeden kayıt tamamlanamaz */}
                                {linkedCustomer ? (
                                    <div className="mt-6 p-4 bg-white border border-green-200 rounded-xl flex items-center gap-4">
                                        <span aria-hidden="true" className="w-12 h-12 bg-[#008000] rounded-full flex items-center justify-center text-white shrink-0">
                                            <CheckCircle size={22} strokeWidth={2.5} />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 text-sm truncate">{linkedCustomer.name}</p>
                                            <p className="text-[11px] text-gray-500 font-medium">
                                                Mevcut cari kullanılıyor <span className="font-mono">{linkedCustomer.id}</span> — yeni cari açılmayacak.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setLinkedCustomerKey(null)}
                                            className="text-[11px] font-bold text-gray-500 hover:text-[#e30000] px-3 py-2 rounded-lg transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                        >
                                            Bağlantıyı kaldır
                                        </button>
                                    </div>
                                ) : customerMatch.matches.length > 0 && (
                                    <div
                                        role={blocksCreate(customerMatch.level) ? 'alert' : undefined}
                                        className={`mt-6 p-4 rounded-xl border space-y-3 ${customerMatch.level === 'exact'
                                            ? 'border-[#e30000]/30 bg-[#e30000]/5'
                                            : customerMatch.level === 'confirm'
                                                ? 'border-[#ff9500]/35 bg-[#ff9500]/5'
                                                : 'border-blue-100 bg-white'}`}
                                    >
                                        {blocksCreate(customerMatch.level) && (
                                            <div className="flex items-start gap-3">
                                                <span aria-hidden="true" className={customerMatch.level === 'exact' ? 'text-[#e30000] mt-0.5' : 'text-[#bf5b04] mt-0.5'}>
                                                    <AlertTriangle size={16} />
                                                </span>
                                                <p className="text-[12px] font-semibold text-gray-800 leading-snug">
                                                    {customerMatch.level === 'exact'
                                                        ? 'Bu TC kimlik numarasıyla kayıtlı bir cari var. Yeni cari açılamaz; aşağıdaki kaydı seçin.'
                                                        : 'Bu bilgilerle eşleşen bir cari var. Mevcut cariyi seçin ya da farklı kişi olduğunu onaylayın.'}
                                                </p>
                                            </div>
                                        )}

                                        {customerMatch.matches.slice(0, 3).map((match) => (
                                            <button
                                                key={customerKeyOf(match.customer)}
                                                type="button"
                                                onClick={() => handleSelectCustomer(match.customer)}
                                                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-left hover:border-[#0071e3]/40 hover:bg-[#0071e3]/5 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                            >
                                                <span className="flex items-center gap-4">
                                                    <span aria-hidden="true" className="w-11 h-11 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0">
                                                        {match.customer.name?.[0] || 'M'}
                                                    </span>
                                                    <span className="flex-1 min-w-0">
                                                        <span className="flex items-center gap-2">
                                                            <span className="font-bold text-gray-900 text-sm truncate">{match.customer.name}</span>
                                                            <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">Kayıtlı</span>
                                                        </span>
                                                        <span className="block text-[11px] text-gray-500 font-medium truncate">
                                                            {describeMatch(match.reasons)} — bu cariyi kullanmak için tıklayın
                                                        </span>
                                                    </span>
                                                    <ChevronRight size={20} className="text-blue-500 shrink-0" aria-hidden="true" />
                                                </span>
                                            </button>
                                        ))}

                                        {isForceable(customerMatch.level) && (
                                            <label className="flex items-start gap-2.5 text-[12px] font-medium text-gray-700 cursor-pointer">
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
                            </div>

                            {/* Memnuniyet anketi */}
                            <div className="gsx-card p-6">
                                <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-500"><CheckCircle size={20} strokeWidth={2.5} /></div>
                                    Memnuniyet Anketi
                                </h3>
                                <p id="sa-sat-label" className="text-[12px] font-medium text-gray-500 mb-4">
                                    Müşterinin önceki servis deneyimine dair değerlendirmesi. Bu bilgi servis kaydında görünür.
                                </p>
                                <div role="group" aria-labelledby="sa-sat-label" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                                className={`py-4 px-4 rounded-lg border text-sm font-bold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${active
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
                    )}

                    {step === 2 && (
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

                                <div className="mb-10 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                                        Ürün Grubu <span className="text-[#e30000]" aria-hidden="true">*</span>
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setShowProductPicker(true)}
                                        aria-haspopup="dialog"
                                        className="w-full p-4 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between gap-4 text-left hover:bg-white hover:border-gray-300 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                    >
                                        <span className="flex items-center gap-4 min-w-0">
                                            {selectedProductGroup ? (
                                                <>
                                                    <span className={`w-12 h-12 rounded-md flex items-center justify-center text-white shadow-md shrink-0 ${selectedProductGroup.color}`}>
                                                        <selectedProductGroup.icon size={24} />
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block text-sm font-bold text-gray-900 truncate">{selectedProductGroup.label}</span>
                                                        <span className="block text-[11px] font-medium text-gray-500">Değiştirmek için tıklayın</span>
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="w-12 h-12 rounded-md bg-gray-200 text-gray-400 flex items-center justify-center shrink-0">
                                                        <Package size={24} />
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block text-sm font-bold text-gray-400">Ürün Grubu Seçiniz</span>
                                                        <span className="block text-[11px] font-medium text-gray-400">iPhone, iPad, Mac, Watch, AirPods…</span>
                                                    </span>
                                                </>
                                            )}
                                        </span>
                                        <ChevronDown size={18} className="text-gray-400 shrink-0" aria-hidden="true" />
                                    </button>
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

                    {step === 3 && (
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
                        <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-500"><FileText size={20} strokeWidth={2.5} /></div>
                            Kayıt Özeti
                        </h3>

                        <dl className="space-y-3">
                            {[
                                { label: 'Müşteri', value: formData.customerName, step: 1 },
                                { label: 'Tip', value: formData.customerType === 'kurumsal' ? 'Kurumsal' : 'Bireysel', step: 1 },
                                { label: 'Telefon', value: formData.customerPhone, step: 1 },
                                {
                                    label: 'Konum',
                                    value: [formData.customerCity, formData.customerDistrict].filter(Boolean).join(' / '),
                                    step: 1,
                                },
                                { label: 'Ürün Grubu', value: selectedProductGroup?.label, step: 2 },
                                { label: 'Cihaz', value: formData.deviceModel, step: 2 },
                                { label: 'Seri No', value: formData.serialNumber, step: 2, mono: true },
                            ].map(row => (
                                <div key={row.label} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                                    <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0 pt-0.5">{row.label}</dt>
                                    <dd className={`text-[13px] font-semibold text-right min-w-0 truncate ${row.value ? 'text-[#1d1d1f]' : 'text-gray-300'} ${row.mono ? 'font-mono' : ''}`}>
                                        {row.value || '—'}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        {formData.satisfaction === 'memnun_degil' && (
                            <p className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-[#e30000]/[0.05] border border-[#e30000]/20 text-[11px] font-semibold text-[#c30000]">
                                <AlertTriangle size={13} aria-hidden="true" className="shrink-0 mt-0.5" />
                                Müşteri önceki deneyimden memnun değil.
                            </p>
                        )}
                        {formData.satisfaction === 'memnun' && (
                            <p className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-[#008000]/[0.06] border border-[#008000]/20 text-[11px] font-semibold text-[#1d7a4c]">
                                <CheckCircle size={13} aria-hidden="true" className="shrink-0 mt-0.5" />
                                Müşteri önceki deneyimden memnun.
                            </p>
                        )}

                        <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setStep(step - 1)}
                                    aria-label="Önceki adım"
                                    className="px-5 py-4 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                            )}
                            {step < 3 ? (
                                <button
                                    type="button"
                                    onClick={() => setStep(step + 1)}
                                    className="flex-1 bg-gray-900 text-white px-6 py-4 rounded-md font-bold hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                                >
                                    Sonraki Adım <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handlePrepareSubmission}
                                    disabled={!formData.findMyOff || uploading}
                                    className={`flex-1 px-6 py-4 rounded-md font-bold transition-all flex items-center justify-center gap-3 shadow-xl outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25 ${(!formData.findMyOff || uploading) ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-200'}`}
                                >
                                    {uploading ? 'Görsel Yükleniyor...' : <><Save size={18} strokeWidth={2.5} /> Kaydı Tamamla</>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Ürün grubu seçimi */}
            {showProductPicker && (
                <PickerModal
                    title="Ürün Grubu Seçiniz"
                    description="Cihazın ait olduğu ürün ailesini seçin."
                    placeholder="Ürün grubu ara…"
                    value={formData.productGroup}
                    options={PRODUCT_GROUPS.map(g => ({ value: g.id, label: g.label }))}
                    onSelect={(val) => applyProductGroup(val)}
                    onClose={() => setShowProductPicker(false)}
                />
            )}

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
