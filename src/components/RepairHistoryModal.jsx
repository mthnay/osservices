/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useMemo } from 'react';
import {
    X, CheckCircle, Clock, Truck, MessageCircle, Wrench, Phone, User,
    Calendar, ArrowRight, Printer, FileText, Shield, Eye, Package,
    ChevronRight, Save, Pencil, PlusCircle, Send, Receipt, Hash, ShieldCheck,
    AlertCircle, FileInput, Fingerprint, Coins, Camera, Info, Image, Bell, Trash2, MapPin, Award
} from 'lucide-react';
import ServiceFormPrint from './ServiceFormPrint';
import DeliveryFormPrint from './DeliveryFormPrint';
import { useAppContext } from '../context/AppContext';
import { appPrompt, appAlert, appConfirm } from '../utils/alert';
import CustomerNotificationModal from './CustomerNotificationModal';
import { hasPermission } from '../utils/permissions';
import { getSafeRepairImageUrl } from '../utils/productImages';

const STATUS_STEPS = [
    { id: 'entry', label: 'Servis Kabul', keys: ['Kayıt Oluşturuldu', 'Beklemede'] },
    { id: 'diagnosis', label: 'Arıza Tespit', keys: ['Teşhis Ediliyor', 'Teklif Sunuldu', 'Müşteri Onayı Bekliyor', 'Teklif Onaylandı', 'Teklif Reddedildi'] },
    { id: 'repair', label: 'Onarımda', keys: ['İşlemde', "Apple'a Gönderildi", 'Transferde'] },
    { id: 'ready', label: 'Kalite & Hazır', keys: ['Tamamlandı', 'Cihaz Hazır', 'İade Hazır'] },
    { id: 'delivered', label: 'Teslim', keys: ['Teslim Edildi', 'İade Edildi'] },
];

const REPAIR_TYPE_LABELS = {
    'carry-in': 'Mağaza İçi Onarım',
    'apple-center': 'Apple Onarım Merkezi',
    'direct-return': 'İşlemsiz İade',
    'service': 'Onarım Olmayan Servis',
    'mail-in': 'Bütün Birim Posta',
    'approval': 'Teklif Bekliyor',
    'returnbefore': 'Değiştirmeden Önce İade'
};

const RepairHistoryModal = ({ repair: initialRepair, onClose, onDiagnose }) => {
    const { updateRepair, updateRepairStatus, removeRepair, repairs, servicePoints, currentUser, showToast, API_URL } = useAppContext();
    const repair = repairs.find(r => r.id === initialRepair.id) || initialRepair;
    
    // UI States
    // eslint-disable-next-line no-unused-vars
    const [activeTab, setActiveTab] = useState('info'); // 'info', 'docs', 'finance', 'media'
    const [selectedPhoto, setSelectedPhoto] = useState(null); // Fullscreen preview
    const [showAcceptancePrint, setShowAcceptancePrint] = useState(false);
    const [showDeliveryPrint, setShowDeliveryPrint] = useState(false);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [targetStoreId, setTargetStoreId] = useState('');
    const [newNote, setNewNote] = useState('');
    const [invoiceNo, setInvoiceNo] = useState(repair?.invoiceNumber || '');
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showDeviceModal, setShowDeviceModal] = useState(false);
    
    // Technicians should be able to edit basic info if they are the owner or admin
    const isAdmin = hasPermission(currentUser, 'manage_settings') || currentUser?.role === 'technician';

    // Edit Form State
    const [editForm, setEditForm] = useState({
        customer: repair?.customer || '',
        customerPhone: repair?.customerPhone || '',
        customerEmail: repair?.customerEmail || '',
        device: repair?.device || '',
        serial: repair?.serial || repair?.serialNumber || '',
        imei1: repair?.imei1 || '',
        imei2: repair?.imei2 || '',
        issue: repair?.issue || '',
        tcNo: repair?.tcNo || '',
        customerAddress: repair?.customerAddress || ''
    });

    const [customerForm, setCustomerForm] = useState({
        customer: repair?.customer || '',
        customerPhone: repair?.customerPhone || '',
        customerEmail: repair?.customerEmail || '',
        customerAddress: repair?.customerAddress || '',
        tcNo: repair?.tcNo || '',
        taxOffice: repair?.taxOffice || '',
    });

    React.useEffect(() => {
        if (repair) {
            setEditForm({
                customer: repair.customer || '',
                customerPhone: repair.customerPhone || '',
                customerEmail: repair.customerEmail || '',
                device: repair.device,
                serial: repair.serial || repair.serialNumber,
                imei1: repair.imei1 || '',
                imei2: repair.imei2 || '',
                issue: repair.issue,
                tcNo: repair.tcNo || '',
                customerAddress: repair.customerAddress || ''
            });
            setCustomerForm({
                customer: repair.customer || '',
                customerPhone: repair.customerPhone || '',
                customerEmail: repair.customerEmail || '',
                customerAddress: repair.customerAddress || '',
                tcNo: repair.tcNo || '',
                taxOffice: repair.taxOffice || '',
            });
            setInvoiceNo(repair.invoiceNumber || '');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [repair.id]);

    if (!repair) return null;

    // Logic Functions
    const handleSaveDevice = () => {
        updateRepair(repair.id, { ...editForm });
        setShowDeviceModal(false);
        showToast('Cihaz bilgileri güncellendi.', 'success');
    };

    const handleSave = () => {
        updateRepair(repair.id, { ...editForm });
        setIsEditing(false);
        showToast('Bilgiler başarıyla güncellendi.', 'success');
    };

    const handleSaveCustomer = () => {
        updateRepair(repair.id, { ...customerForm });
        setShowCustomerModal(false);
        showToast('Müşteri bilgileri başarıyla güncellendi.', 'success');
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        const noteObj = {
            text: newNote,
            date: new Date().toLocaleString('tr-TR'),
            user: currentUser?.name || 'Sistem'
        };
        const updatedNotes = repair.internalNotes ? [...repair.internalNotes, noteObj] : [noteObj];
        updateRepair(repair.id, { internalNotes: updatedNotes });
        setNewNote('');
    };

    const handleSaveInvoice = () => {
        updateRepair(repair.id, { invoiceNumber: invoiceNo });
        appAlert('Fatura numarası başarıyla kaydedildi.', 'success');
    };

    const handleAddProcess = async () => {
        const note = await appPrompt("Yeni işlem için açıklama giriniz (Örn: Müşteri tekrar getirdi, 2. arıza tespit edildi):");
        if (note) {
            updateRepairStatus(repair.id, 'İşlemde', `YENİ SÜREÇ BAŞLATILDI: ${note}`);
        }
    };

    const handleWhatsApp = () => {
        let phone = repair.customerPhone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = phone.substring(1);
        const trackingLink = `${window.location.origin}/?track=${repair.id}`;
        let message = `Merhaba ${repair.customer}, Troy Servis'e bıraktığınız ${repair.device} cihazınızın durumunu şu linkten takip edebilirsiniz:\n${trackingLink}`;
        if (repair.status === 'Müşteri Onayı Bekliyor') {
            message = `Merhaba ${repair.customer}, Troy Servis'te bulunan cihazınızın incelemesi tamamlandı. Teklif için tıklayın:\n${trackingLink}`;
        } else if (['Hazır', 'Cihaz Hazır', 'Tamamlandı'].includes(repair.status)) {
            message = `Merhaba ${repair.customer}, Troy Servis'teki ${repair.device} cihazınız teslim için sizi bekliyor! Detay:\n${trackingLink}`;
        }
        window.open(`https://wa.me/90${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleTransfer = async () => {
        if (!targetStoreId) return;
        const targetStore = servicePoints.find(sp => String(sp.id) === String(targetStoreId));
        const storeName = targetStore ? targetStore.name : 'Diğer Mağaza';
        await updateRepair(repair.id, {
            storeId: parseInt(targetStoreId),
            status: 'Transferde',
            historyNote: `Cihaz ${storeName} şubesine doğru yola çıktı (Transfer). (İşlem yapan: ${currentUser?.name || 'Sistem'})`
        });
        appAlert(`Cihaz başarıyla ${storeName} şubesine transfer edildi. Ancak karşı şubenin ekranına düşmesi için kargoyu/transferi teslim alması gerekir.`, "success");
        setShowTransferModal(false);
        onClose();
    };

    // eslint-disable-next-line no-unused-vars
    const handlePhotoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            appAlert("Dosya boyutu çok büyük (Maks 5MB)", "error");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const photoObj = {
                id: Date.now(),
                url: reader.result,
                date: new Date().toLocaleString(),
                user: currentUser?.name || 'Teknisyen'
            };
            const updatedPhotos = repair.photos ? [...repair.photos, photoObj] : [photoObj];
            updateRepair(repair.id, { photos: updatedPhotos, historyNote: 'Sisteme yeni servis fotoğrafı eklendi.' });
        };
        reader.readAsDataURL(file);
    };

    const handlePhotoDelete = async (url, category = 'after') => {
        const confirmed = await appConfirm("Bu fotoğrafı arşivden silmek istediğinize emin misiniz?");
        if (confirmed) {
            const field = category === 'before' ? 'beforeImages' : 'afterImages';
            const newList = (repair[field] || []).filter(item => item !== url);
            updateRepair(repair.id, { [field]: newList });
            if (selectedPhoto?.url === url) setSelectedPhoto(null);
        }
    };

    const handleDeleteRepair = async () => {
        const confirmed = await appConfirm(
            `<div class="text-red-600 font-bold mb-2">DİKKAT: KAYIT SİLİNİYOR</div>
            <span><b>#${repair.id}</b> numaralı kayıt veritabanından tamamen silinecektir. Bu işlem geri alınamaz!</span>`
        );

        if (confirmed) {
            const success = await removeRepair(repair._id || repair.id);
            if (success) {
                showToast('Kayıt başarıyla silindi.', 'success');
                onClose();
            } else {
                showToast('Silme işlemi başarısız oldu.', 'error');
            }
        }
    };

    // Calculate Progress
    const determineStepIndex = () => {
        for (let i = STATUS_STEPS.length - 1; i >= 0; i--) {
            if (STATUS_STEPS[i].keys.includes(repair.status)) return i;
        }
        return 2; // Default to middle if unknown
    };
    const currentStepIndex = determineStepIndex();

    // Stream Combiner & Sorter
    const parseDate = (dString) => {
        if (!dString) return 0;
        try {
            const [datePart, timePart] = dString.split(' ');
            if (!datePart) return 0;
            const [day, month, year] = datePart.split('.');
            const [hr, min, sec] = (timePart || '00:00').split(':');
            return new Date(year, month - 1, day, hr || 0, min || 0, sec || 0).getTime();
        } catch { return 0; }
    };

    const combinedStream = useMemo(() => {
        const stream = [];
        (repair.history || []).forEach(h => stream.push({ ...h, streamType: 'history' }));
        (repair.internalNotes || []).forEach(n => stream.push({ ...n, streamType: 'note', status: 'Dahili Not' }));
        
        // Notları Birleşik Akışa (Timeline) Ekleme
        const defaultDate = repair.history?.[0]?.date || new Date().toLocaleString('tr-TR');

        if (repair.technicianNote) {
            stream.push({ 
                status: 'İlk Giriş Teknisyen Notu', 
                text: repair.technicianNote, 
                date: defaultDate, 
                streamType: 'report', 
                user: 'Teknisyen' 
            });
        }
        
        if (repair.tests) {
            const diagDate = repair.history?.find(h => h.status.includes('Teşhis') || h.status.includes('Teklif'))?.date || defaultDate;
            stream.push({ 
                status: 'Tanı Testleri & Gözlemler', 
                text: repair.tests, 
                date: diagDate, 
                streamType: 'report', 
                user: 'İnceleme' 
            });
        }
        
        if (repair.diagnosisNotes) {
            const diagDate = repair.history?.find(h => h.status.includes('Teşhis') || h.status.includes('Teklif'))?.date || defaultDate;
            let text = repair.diagnosisNotes;
            if (repair.quoteAmount) text += `\n>> Teklif Tutarı: ${repair.quoteAmount} ₺`;
            
            const isDOA = text.toUpperCase().includes('DOA RAPORU:');
            
            stream.push({ 
                status: isDOA ? 'Arıza Raporu (DOA)' : 'Arıza Tanı Raporu', 
                text: isDOA ? text.replace(/DOA RAPORU:/i, '').trim() : text, 
                date: diagDate, 
                streamType: isDOA ? 'doa' : 'report', 
                user: 'Arıza Tespit' 
            });
        }
        
        if (repair.repairClosingNote) {
            const closeDate = repair.history?.find(h => h.status.includes('Tamamlandı') || h.status.includes('Hazır'))?.date || defaultDate;
            let text = repair.repairClosingNote;
            if (repair.parts?.length > 0) text += `\n>> Değişen Parçalar: ` + repair.parts.map(p => p.description).join(', ');
            stream.push({ 
                status: 'Kapanış Raporu', 
                text: text, 
                date: closeDate, 
                streamType: 'report', 
                user: 'Onarım' 
            });
        }

        return stream.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    }, [repair.history, repair.internalNotes, repair.technicianNote, repair.tests, repair.diagnosisNotes, repair.repairClosingNote, repair.quoteAmount, repair.parts]);

    // Helpers
    const getStatusIcon = (status) => {
        if (status === 'Dahili Not') return <MessageCircle size={14} />;
        if (status.includes('DOA')) return <Shield size={14} />;
        if (status.includes('Teknisyen Notu') || status.includes('Raporu')) return <FileText size={14} />;
        if (status.includes('Kayıt')) return <Phone size={14} />;
        if (status.includes('Teklif') || status.includes('Onay')) return <AlertCircle size={14} />;
        if (status.includes('İşlem')) return <Wrench size={14} />;
        if (status.includes('Gönderildi') || status.includes('Transfer')) return <Truck size={14} />;
        if (status.includes('Tamamlandı') || status.includes('Hazır')) return <CheckCircle size={14} />;
        if (status.includes('Teslim')) return <ShieldCheck size={14} />;
        return <Clock size={14} />;
    };

    const getStatusColor = (status) => {
        if (status === 'Dahili Not') return 'bg-yellow-500 border-yellow-200';
        if (status.includes('DOA')) return 'bg-red-600 border-red-200';
        if (status.includes('Teknisyen Notu')) return 'bg-indigo-500 border-indigo-200';
        if (status.includes('Tanı Raporu')) return 'bg-orange-500 border-orange-200';
        if (status.includes('Kapanış')) return 'bg-teal-500 border-teal-200';
        if (status.includes('Kayıt')) return 'bg-blue-500 border-blue-200';
        if (status.includes('Onay Bekliyor')) return 'bg-orange-500 border-orange-200';
        if (status.includes('Reddedildi')) return 'bg-red-500 border-red-200';
        if (status.includes('İşlem')) return 'bg-purple-500 border-purple-200';
        if (status.includes('Tamamlandı') || status.includes('Hazır')) return 'bg-green-500 border-green-200';
        if (status.includes('Teslim')) return 'bg-apple-blue border-blue-200';
        return 'bg-gray-400 border-gray-200';
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content w-full max-w-[90vw] lg:max-w-[1300px] flex flex-col max-h-[85vh] rounded-lg overflow-hidden">
                {/* Header & Progress Bar */}
                <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
                    <div className="p-6 flex justify-between items-center">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-gray-50 rounded-md flex items-center justify-center text-3xl shadow-sm border border-gray-100">
                                {repair.device.includes('iPhone') ? '📱' : '💻'}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-semibold uppercase text-apple-blue px-2 py-1 bg-blue-50 rounded border border-blue-100/50">#{repair.id}</span>
                                    {repair.productGroup && (
                                        <span className="text-[9px] font-semibold uppercase text-white bg-gray-900 px-2 py-1 rounded shadow-sm">{repair.productGroup}</span>
                                    )}
                                    {repair.serviceType && (
                                        <span className={`text-[9px] font-semibold uppercase px-2 py-1 rounded shadow-sm ${repair.serviceType === 'exchange' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                            {repair.serviceType === 'exchange' ? 'Değişim' : 'Onarım'}
                                        </span>
                                    )}
                                    {repair.storeId && (
                                        <span className="text-[9px] font-semibold uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded shadow-sm flex items-center gap-1">
                                            <MapPin size={10} /> {servicePoints.find(sp => String(sp.id) === String(repair.storeId))?.name || 'Mağaza Bilgisi'}
                                        </span>
                                    )}
                                    {isEditing ? (
                                        <input value={editForm.device} onChange={e => setEditForm({...editForm, device: e.target.value})} className="text-xl font-semibold text-gray-900 border-b-2 border-apple-blue outline-none bg-transparent"/>
                                    ) : (
                                        <h3 className="text-xl font-semibold text-gray-900">{repair.device}</h3>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 font-medium flex items-center gap-2 mt-1">
                                    <User size={12} className="text-gray-400"/> {repair.customer} ({repair.customerPhone})
                                </p>
                                {repair.createdBy && (
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight flex items-center gap-2 mt-1.5 pl-0.5">
                                        <Award size={12} className="text-blue-500" /> Kayıt Açan: <span className="text-gray-600">{repair.createdBy}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <button onClick={handleSave} className="h-10 px-5 bg-green-500 hover:bg-green-600 text-white rounded-md flex items-center gap-2 font-bold shadow transition-all"><Save size={16} /> Kaydet</button>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="h-10 w-10 bg-white hover:bg-gray-50 text-gray-400 hover:text-blue-600 rounded-md flex items-center justify-center border border-gray-200 shadow-sm transition-all"><Pencil size={18} /></button>
                            )}
                            <button onClick={onClose} className="h-10 w-10 bg-white hover:bg-gray-50 text-gray-400 hover:text-red-500 rounded-md flex items-center justify-center border border-gray-200 shadow-sm transition-all"><X size={20} /></button>
                        </div>
                    </div>

                    {/* Progress Tracker Widget */}
                    <div className="px-10 pb-6 pt-2">
                        <div className="relative flex justify-between items-center w-full max-w-4xl mx-auto">
                            {/* Connecting Line Backdrop */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full"></div>
                            {/* Progress Connecting Line */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-apple-blue rounded-full transition-all duration-700" style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}></div>
                            
                            {STATUS_STEPS.map((step, idx) => {
                                const isCompleted = idx < currentStepIndex;
                                const isActive = idx === currentStepIndex;
                                return (
                                    <div key={idx} className="relative z-10 flex flex-col items-center gap-2 group">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-md ${isActive ? 'bg-apple-blue border-blue-200 text-white scale-125' : isCompleted ? 'bg-green-500 border-green-200 text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                                            {isCompleted ? <CheckCircle size={14} /> : <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-gray-300'}`}></div>}
                                        </div>
                                        <span className={`text-[10px] uppercase tracking-wide font-bold absolute -bottom-6 whitespace-nowrap transition-colors ${isActive ? 'text-apple-blue' : isCompleted ? 'text-gray-700' : 'text-gray-400'}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f5f5f7] p-6 lg:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 w-full max-w-none pt-4">
                        
                        {/* ---------------- SOL / ANA İÇERİK (8 KOLON) ---------------- */}
                        <div className="lg:col-span-8 flex flex-col gap-8">
                            
                            {/* ÜST BİLGİ KARTLARI */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Müşteri */}
                                <div onClick={() => setShowCustomerModal(true)} className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col gap-3 transition-transform hover:-translate-y-1 hover:shadow-md cursor-pointer relative group">
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-apple-blue bg-blue-50 p-2 rounded-md">
                                        <Eye size={16} />
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-400 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><User size={16} /></div> 
                                        <span className="text-[10px] font-semibold text-xs uppercase tracking-wide">Müşteri Bilgisi</span>
                                    </div>
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <input value={editForm.customer} onChange={e => setEditForm({...editForm, customer: e.target.value})} className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm font-bold bg-blue-50/30 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" placeholder="Müşteri Adı"/>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input value={editForm.customerPhone} onChange={e => setEditForm({...editForm, customerPhone: e.target.value})} className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm bg-blue-50/30 font-mono outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" placeholder="Telefon"/>
                                                <input value={editForm.customerEmail} onChange={e => setEditForm({...editForm, customerEmail: e.target.value})} className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm bg-blue-50/30 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" placeholder="E-Posta"/>
                                            </div>
                                            <input value={editForm.tcNo} onChange={e => setEditForm({...editForm, tcNo: e.target.value})} className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm bg-blue-50/30 font-mono outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" placeholder="TC / VKN"/>
                                            <textarea value={editForm.customerAddress} onChange={e => setEditForm({...editForm, customerAddress: e.target.value})} className="w-full px-4 py-3 border border-blue-200 rounded-md text-sm bg-blue-50/30 font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none" rows="2" placeholder="Adres"></textarea>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-semibold text-gray-900 text-xl tracking-tight">{repair.customer}</p>
                                            <p className="text-sm text-gray-500 mt-2 font-medium">{repair.customerPhone}</p>
                                            
                                            <div className="mt-3 space-y-1">
                                                {repair.tcNo && (
                                                    <p className="text-xs text-gray-400 font-mono"><span className="font-bold text-gray-400">TC/VKN:</span> {repair.tcNo}</p>
                                                )}
                                                {repair.customerAddress && (
                                                    <p className="text-xs text-gray-400 line-clamp-2" title={repair.customerAddress}><span className="font-bold text-gray-400">Adres:</span> {repair.customerAddress}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Cihaz & Garanti */}
                                <div onClick={() => setShowDeviceModal(true)} className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col gap-3 transition-transform hover:-translate-y-1 hover:shadow-md cursor-pointer relative group">
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-apple-blue bg-blue-50 p-2 rounded-md">
                                        <Pencil size={16} />
                                    </div>
                                    <div className="flex items-center gap-3 text-apple-blue mb-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><Fingerprint size={16} /></div>
                                        <span className="text-[10px] font-semibold text-xs uppercase tracking-wide">Cihaz & Durum</span>
                                    </div>
                                    <div>
                                        <div className="flex flex-col gap-1.5">
                                            <div className="inline-flex px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md border border-gray-200 text-xs font-mono font-bold">
                                                S/N: <span className="text-gray-900 ml-1 uppercase">{repair.serial || repair.serialNumber || 'Girilmedi'}</span>
                                            </div>
                                            {repair.imei1 && (
                                                <div className="inline-flex px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md border border-gray-200 text-[10px] font-mono font-bold">
                                                    IMEI 1: <span className="text-gray-900 ml-1 uppercase">{repair.imei1}</span>
                                                </div>
                                            )}
                                            {repair.imei2 && (
                                                <div className="inline-flex px-3 py-1.5 bg-gray-50 text-gray-700 rounded-md border border-gray-200 text-[10px] font-mono font-bold">
                                                    IMEI 2: <span className="text-gray-900 ml-1 uppercase">{repair.imei2}</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-apple-blue font-semibold uppercase mt-4 flex items-center gap-1.5 p-2 bg-blue-50 border border-blue-100 rounded-md inline-flex shadow-sm">
                                            <Shield size={14}/> {repair.warrantyStatus || 'Garanti Durumu'}
                                        </p>
                                    </div>
                                </div>

                                {/* FMI & Yedek */}
                                <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
                                    <div className={`flex items-center gap-4 p-3 rounded-md border ${repair.findMyOff ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${repair.findMyOff ? 'bg-green-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md'}`}>
                                            {repair.findMyOff ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold uppercase opacity-80 block mb-0.5">Cihazımı Bul (FMI)</span>
                                            <span className="text-sm font-semibold">{repair.findMyOff ? 'KAPALI' : 'AÇIK'}</span>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-4 p-3 rounded-md border ${repair.backupTaken ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                        <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${repair.backupTaken ? 'bg-apple-blue text-white shadow-md' : 'bg-gray-200 text-gray-400'}`}>
                                            <Save size={20}/>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold uppercase opacity-80 block mb-0.5">Veri Yedeği</span>
                                            <span className="text-sm font-semibold">{repair.backupTaken ? 'ALINDI' : 'YOK'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ŞİKAYET VE DURUM ANALİZİ */}
                            <div className="bg-white p-8 rounded-lg border border-gray-100 shadow-sm">
                                <h4 className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide flex items-center gap-2 mb-4">
                                    <AlertCircle size={16} className="text-orange-500"/> Müşteri Şikayeti & Fiziksel Durum
                                </h4>
                                {isEditing ? (
                                    <textarea value={editForm.issue} onChange={e => setEditForm({...editForm, issue: e.target.value})} rows={3} className="w-full p-5 border border-blue-200 rounded-md text-sm bg-blue-50/30 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/>
                                ) : (
                                    <div className="p-6 bg-gray-50 rounded-md border border-gray-100">
                                        <p className="text-base text-gray-800 font-medium italic leading-relaxed pl-4 border-l-4 border-apple-blue/50">
                                            "{repair.issue || repair.issueDescription || 'Belirtilmedi'}"
                                        </p>
                                    </div>
                                )}
                                {repair.visualCondition && repair.visualCondition.length > 0 && (
                                    <div className="mt-6 flex flex-wrap gap-2 pt-6 border-t border-gray-50">
                                        {repair.visualCondition.map((v, i) => (
                                            <span key={i} className="text-xs px-4 py-2 bg-red-50 text-red-600 rounded-md border border-red-100 font-bold shadow-sm flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {v}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* BELGELER VE MEDYA GALERİSİ */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Evraklar ve Raporlar */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide pl-2">Raporlar & Belgeler</h4>
                                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col gap-4">
                                        <button onClick={() => setShowAcceptancePrint(true)} className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-100 hover:border-apple-blue hover:bg-blue-50 transition-all group shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white text-apple-blue rounded-[14px] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.05)] border border-gray-100 group-hover:border-blue-200"><Printer size={20} /></div>
                                                <div className="text-left">
                                                    <span className="text-sm font-semibold text-gray-900 block">Kabul Formu (PDF)</span>
                                                    <span className="text-[10px] text-gray-500 font-bold">Müşteri sözleşmesi ve ıslak imza</span>
                                                </div>
                                            </div>
                                            <ChevronRight size={20} className="text-gray-300 group-hover:text-apple-blue transition-transform group-hover:translate-x-1" />
                                        </button>
                                        {(['Teslim Edildi', 'Cihaz Hazır', 'Tamamlandı', 'İade Hazır', 'İade Edildi'].includes(repair.status)) && (
                                            <button onClick={() => setShowDeliveryPrint(true)} className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all group shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white text-green-600 rounded-[14px] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.05)] border border-gray-100 group-hover:border-green-200"><Printer size={20} /></div>
                                                    <div className="text-left">
                                                        <span className="text-sm font-semibold text-gray-900 block">Teslim Formu (PDF)</span>
                                                        <span className="text-[10px] text-gray-500 font-bold">Ödeme ve çıkış makbuzu</span>
                                                    </div>
                                                </div>
                                                <ChevronRight size={20} className="text-gray-300 group-hover:text-green-500 transition-transform group-hover:translate-x-1" />
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Fatura Bloğu */}
                                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-5"><Receipt size={18} className="text-gray-400"/> Vergi & Fatura</h4>
                                        <div className="flex gap-2">
                                            <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Fatura No girin..." className="flex-1 px-5 py-4 bg-gray-50 border border-gray-200 rounded-md text-sm font-bold font-mono focus:bg-white focus:border-blue-500 outline-none uppercase transition-all shadow-inner" />
                                            <button onClick={handleSaveInvoice} disabled={invoiceNo === repair.invoiceNumber} className="bg-gray-900 text-white px-6 rounded-md font-semibold hover:bg-black disabled:opacity-40 transition-all shadow-xl active:scale-95"><Save size={16}/></button>
                                        </div>
                                    </div>
                                </div>

                                {/* VMI ve Medya */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide pl-2">Görsel VMI Kayıtları</h4>
                                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col gap-8 h-full">
                                        {/* Öncesi */}
                                        <div>
                                            <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2">
                                                <span className="text-xs font-semibold text-gray-900 flex items-center gap-2"><Camera size={14} className="text-indigo-500"/> Kabul (Öncesi)</span>
                                                <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1 rounded-lg font-semibold shadow-sm">{repair.beforeImages?.length || repair.mediaFiles?.filter(f=>!f.isDefault).length || 0} Adet</span>
                                            </div>
                                            <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3">
                                                {(repair.beforeImages || repair.mediaFiles?.filter(f=>!f.isDefault) || []).map((img, i) => (
                                                    <div key={i} className="relative group shrink-0 ring-offset-2 hover:ring-2 ring-indigo-500/30 rounded-[20px] transition-all cursor-zoom-in">
                                                        <img src={getSafeRepairImageUrl(img.url || img, repair.productGroup, repair.device, API_URL)} onClick={()=>setSelectedPhoto({url: getSafeRepairImageUrl(img.url||img, repair.productGroup, repair.device, API_URL), user: 'Servis Kabul', date: repair.date})} className="w-24 h-24 rounded-[20px] object-cover border border-gray-200 shadow-sm" />
                                                    </div>
                                                ))}
                                                {(!repair.beforeImages?.length && (!repair.mediaFiles || repair.mediaFiles.filter(f=>!f.isDefault).length===0)) && <div className="text-xs text-gray-400 p-8 border-2 border-dashed border-gray-100 rounded-lg w-full text-center bg-gray-50 font-medium">Görsel yüklenmemiş</div>}
                                            </div>
                                        </div>
                                        
                                        {/* Sonrası */}
                                        <div>
                                            <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2">
                                                <span className="text-xs font-semibold text-gray-900 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/> Teslim (Sonrası)</span>
                                                <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-lg font-semibold shadow-sm">{repair.afterImages?.length || 0} Adet</span>
                                            </div>
                                            <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3">
                                                {repair.afterImages?.map((url, i) => (
                                                    <div key={i} className="relative group shrink-0 ring-offset-2 hover:ring-2 ring-emerald-500/30 rounded-[20px] transition-all cursor-zoom-in">
                                                        <img src={getSafeRepairImageUrl(url, repair.productGroup, repair.device, API_URL)} onClick={()=>setSelectedPhoto({url: getSafeRepairImageUrl(url, repair.productGroup, repair.device, API_URL), user: 'Teknisyen', date: ''})} className="w-24 h-24 rounded-[20px] object-cover border border-gray-200 shadow-sm" />
                                                        <button onClick={() => handlePhotoDelete(url, 'after')} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 shadow-xl border-2 border-white transition-all scale-75 group-hover:scale-100"><Trash2 size={12}/></button>
                                                    </div>
                                                ))}
                                                {(!repair.afterImages?.length) && <div className="text-xs text-emerald-600/60 p-8 border-2 border-dashed border-emerald-100 rounded-lg w-full text-center bg-emerald-50/50 font-bold">Onarım sonucu eklenmemiş</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* ADMIN DANGER ZONE */}
                            {hasPermission(currentUser, 'manage_settings') && (
                                <div className="mt-8 bg-red-50/80 rounded-lg p-8 border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-white text-red-600 rounded-md flex items-center justify-center font-semibold shadow-sm border border-red-100"><AlertCircle size={28} /></div>
                                        <div>
                                            <h5 className="text-lg font-semibold text-red-900 tracking-tight">Kritik Yönetici İşlemi</h5>
                                            <p className="text-sm text-red-700 font-medium">Kayıt veritabanından kalıcı olarak silinecektir. Bu işlem geri alınamaz.</p>
                                        </div>
                                    </div>
                                    <button onClick={handleDeleteRepair} className="w-full md:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-red-500/30 active:scale-95">
                                        <Trash2 size={18} /> Sistemi Temizle ve Sil
                                    </button>
                                </div>
                            )}

                        </div>

                        {/* ---------------- SAĞ / TİMELİNE (4 KOLON) ---------------- */}
                        <div className="lg:col-span-4 flex flex-col h-[60vh] lg:h-[calc(85vh-200px)] bg-white rounded-lg border border-gray-100 shadow-2xl overflow-hidden sticky top-0">
                            <div className="px-8 py-8 bg-gray-900 flex items-center justify-between shrink-0 z-10 shadow-md">
                                <h4 className="text-sm font-semibold tracking-widest text-white flex items-center gap-3"><Clock size={18} className="text-blue-400" /> SERVİS AKIŞI</h4>
                                <button onClick={handleAddProcess} className="w-10 h-10 flex items-center justify-center bg-white/10 text-white rounded-md hover:bg-white/20 transition-colors shadow-sm border border-white/10">
                                    <PlusCircle size={20} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gray-50/50">
                                <div className="relative pl-6">
                                    <div className="absolute left-[11px] top-6 bottom-6 w-[3px] bg-gradient-to-b from-gray-300 via-gray-200 to-transparent rounded-full opacity-50"></div>
                                    <div className="space-y-10">
                                        {combinedStream.map((entry, idx) => (
                                            <div key={idx} className="relative group animate-in slide-in-from-bottom-5 fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                                <div className={`absolute -left-[30px] top-1 w-8 h-8 rounded-full flex items-center justify-center text-white border-4 border-white shadow-md z-10 transition-transform group-hover:scale-125 duration-300 ${getStatusColor(entry.status).split(' ')[0]}`}>
                                                    {getStatusIcon(entry.status)}
                                                </div>
                                                <div className={`bg-white p-6 rounded-lg transition-all hover:-translate-y-1 hover:shadow-xl ${
                                                    entry.streamType === 'note' ? 'border-2 border-yellow-200 shadow-sm bg-yellow-50/20' 
                                                    : entry.streamType === 'report' ? 'border-2 border-purple-200 shadow-sm bg-purple-50/20' 
                                                    : entry.streamType === 'doa' ? 'border-2 border-red-200 shadow-sm bg-red-50/30'
                                                    : 'border border-gray-100 shadow-sm'
                                                }`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="pr-2">
                                                            <h5 className="text-base font-semibold text-gray-900 tracking-tight leading-tight">{entry.status}</h5>
                                                            <span className="text-[10px] font-bold text-gray-400 capitalize mt-1 block">Yapan: <span className="text-gray-600">{entry.user || 'Sistem Aksiyonu'}</span></span>
                                                        </div>
                                                        <span className="text-[9px] bg-gray-100 text-gray-500 font-bold px-2.5 py-1 rounded-lg mt-0.5 shrink-0 shadow-inner">
                                                            {entry.date.replace(' ', '\n')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-600 leading-relaxed whitespace-pre-wrap">
                                                        {entry.streamType === 'note' || entry.streamType === 'report' ? entry.text : (entry.note || 'İşlem detay belirtilmedi.')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {combinedStream.length === 0 && <div className="text-center py-20 text-sm text-gray-400 font-bold italic">Cihaz kaydı temiz.</div>}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Timeline Giriş Input */}
                            <div className="p-6 bg-white border-t border-gray-100 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 w-8 h-8 rounded-full bg-blue-50 text-apple-blue flex items-center justify-center"><MessageCircle size={14}/></div>
                                    <input 
                                        type="text" 
                                        value={newNote} 
                                        onChange={(e)=>setNewNote(e.target.value)} 
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                        placeholder="Ekibe bir not bırakın..." 
                                        className="w-full pl-15 pr-16 py-5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:bg-white focus:border-apple-blue focus:ring-4 ring-blue-500/10 transition-all shadow-inner"
                                        style={{ paddingLeft: '3.5rem' }}
                                    />
                                    <button onClick={handleAddNote} disabled={!newNote.trim()} className="absolute right-3 p-3 bg-gray-900 text-white rounded-[16px] disabled:opacity-30 hover:bg-apple-blue transition-colors shadow-lg active:scale-95"><Send size={18}/></button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Quick Actions */}
                <div className="bg-white px-6 py-4 flex flex-wrap justify-between items-center shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] border-t border-gray-200/50 z-30">
                    <div className="flex gap-2">
                         {repair.status === 'Beklemede' && (
                             <button onClick={() => setShowTransferModal(true)} className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold rounded-md hover:bg-indigo-100 flex items-center gap-2 transition-all">
                                 <Truck size={14} /> Şubeye Yolla
                             </button>
                         )}
                         <button onClick={() => setShowNotificationModal(true)} className="px-4 py-2 bg-amber-50 border border-amber-100 text-amber-600 text-xs font-bold rounded-md hover:bg-amber-100 flex items-center gap-2 transition-all shadow-sm">
                             <Bell size={14} /> Teklif & Bildirim
                         </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {onDiagnose && repair.status === 'Beklemede' && (
                            <button 
                                onClick={() => onDiagnose(repair)}
                                className="px-6 py-2 bg-orange-500 text-white text-xs font-bold rounded-md hover:bg-orange-600 flex items-center gap-2 shadow-sm transition-all animate-pulse"
                            >
                                <Wrench size={14} /> Teşhis Yap
                            </button>
                        )}
                        <button onClick={handleWhatsApp} className="px-4 py-2 bg-[#25D366] text-white text-xs font-bold rounded-md hover:bg-[#128C7E] flex items-center gap-2 shadow-sm shadow-[#25D366]/20 transition-all">
                            <MessageCircle size={14} /> Müşteriye Yaz
                        </button>
                        <button onClick={onClose} className="px-6 py-2 bg-gray-900 text-white text-xs font-bold rounded-md hover:bg-black flex items-center gap-2 shadow-sm transition-all ml-2">
                            Kapat <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

            </div>

             {/* Transfer Modal Ekranı  */}
             {showTransferModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-8 w-full max-w-md shadow-2xl animate-scale-up">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-md flex items-center justify-center"><Truck size={24} /></div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Servis Transferi</h3>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">Kaydı hedefe yönlendirin.</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <label className="text-[10px] font-semibold text-gray-400 text-xs uppercase tracking-wide pl-1">Hedef Şube</label>
                            <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:border-indigo-500 outline-none text-sm font-bold text-gray-700 transition-all" value={targetStoreId} onChange={(e) => setTargetStoreId(e.target.value)}>
                                <option value="">Mağaza Seçiniz...</option>
                                {servicePoints.filter(sp => String(sp.id) !== String(repair.storeId)).map(sp => (
                                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setShowTransferModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 text-xs font-bold rounded-md hover:bg-gray-200">İptal</button>
                            <button onClick={handleTransfer} disabled={!targetStoreId} className="flex-1 py-3 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700 disabled:opacity-50">Onayla ve Transfer Et</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Fullscreen Preview */}
            {selectedPhoto && (
                <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-8 animate-in fade-in duration-300" onClick={() => setSelectedPhoto(null)}>
                    <button className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
                        <X size={32} />
                    </button>
                    <img src={selectedPhoto.url} className="max-w-full max-h-full object-contain shadow-2xl animate-scale-up" />
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-3 rounded-md border border-white/20">
                        <p className="text-white font-bold text-sm">{selectedPhoto.user} tarafından yüklendi</p>
                        <p className="text-white/60 text-xs font-mono">{selectedPhoto.date}</p>
                    </div>
                </div>
            )}

            {/* ---------------- MÜŞTERİ BİLGİSİ MODALI ---------------- */}
            {showCustomerModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up border border-white/20">
                        <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white text-apple-blue rounded-[16px] flex items-center justify-center shadow-sm">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-blue-900 tracking-tight">Müşteri Detay Profili</h3>
                                    <p className="text-xs text-blue-700/70 font-bold text-xs uppercase tracking-wide mt-0.5">Kişisel Bilgiler ve İletişim Formu</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCustomerModal(false)} className="w-10 h-10 bg-white text-blue-400 hover:text-red-500 rounded-full flex items-center justify-center shadow-sm transition-all focus:outline-none">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            {!isAdmin && (
                                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 flex items-start gap-3 shadow-sm mb-2">
                                    <Info className="shrink-0 mt-0.5" size={18} />
                                    <p className="text-sm font-bold leading-relaxed">Müşteri detay formunu değiştirme yetkiniz bulunmamaktadır. Değişiklik yapmak için bir yönetici (Admin) ile iletişime geçiniz.</p>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1 block">Ad Soyad</label>
                                    <input 
                                        type="text" 
                                        value={customerForm.customer} 
                                        onChange={e => setCustomerForm({...customerForm, customer: e.target.value})} 
                                        disabled={!isAdmin}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[20px] text-sm font-bold text-gray-900 focus:bg-white focus:border-apple-blue focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-70" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1 block">Telefon Numarası</label>
                                    <input 
                                        type="text" 
                                        value={customerForm.customerPhone} 
                                        onChange={e => setCustomerForm({...customerForm, customerPhone: e.target.value})} 
                                        disabled={!isAdmin}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[20px] text-sm font-bold font-mono text-gray-900 focus:bg-white focus:border-apple-blue focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-70" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1 block">E-Posta Adresi</label>
                                    <input 
                                        type="email" 
                                        value={customerForm.customerEmail} 
                                        onChange={e => setCustomerForm({...customerForm, customerEmail: e.target.value})} 
                                        disabled={!isAdmin}
                                        placeholder="ornek@posta.com"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[20px] text-sm font-medium text-gray-900 focus:bg-white focus:border-apple-blue focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-70" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1 block">TC / Vergi No <span className="opacity-50">(Opsiyonel)</span></label>
                                    <input 
                                        type="text" 
                                        value={customerForm.tcNo} 
                                        onChange={e => setCustomerForm({...customerForm, tcNo: e.target.value})} 
                                        disabled={!isAdmin}
                                        placeholder="İsteğe Bağlı..."
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[20px] text-sm font-mono font-medium text-gray-900 focus:bg-white focus:border-apple-blue focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-70" 
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1 block">Açık Adres Seçimi / Fatura Adresi</label>
                                    <textarea 
                                        rows={3} 
                                        value={customerForm.customerAddress} 
                                        onChange={e => setCustomerForm({...customerForm, customerAddress: e.target.value})} 
                                        disabled={!isAdmin}
                                        placeholder="Sokak, Mahalle, İlçe, İl, Posta Kodu detaylarını buraya giriniz..."
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[20px] text-sm font-medium text-gray-900 focus:bg-white focus:border-apple-blue focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none disabled:opacity-70 custom-scrollbar" 
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {isAdmin && (
                            <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex justify-end gap-3 rounded-b-[32px]">
                                <button onClick={() => setShowCustomerModal(false)} className="px-6 py-4 bg-white text-gray-600 font-bold text-sm rounded-[16px] hover:bg-gray-100 border border-gray-200 transition-colors shadow-sm">Vazgeç</button>
                                <button onClick={handleSaveCustomer} className="px-8 py-4 bg-apple-blue text-white font-bold text-sm rounded-[16px] hover:bg-blue-600 shadow-xl hover:shadow-blue-500/30 transition-all flex items-center gap-2 active:scale-95">
                                    <Save size={18} /> Profili Kaydet
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ---------------- CİHAZ BİLGİSİ MODALI ---------------- */}
            {showDeviceModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up border border-white/20">
                        <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white text-gray-800 rounded-[16px] flex items-center justify-center shadow-sm">
                                    <Fingerprint size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 tracking-tight">Cihaz Detayları</h3>
                                    <p className="text-xs text-gray-500 font-bold text-xs uppercase tracking-wide mt-0.5">Donanım ve Seri No Düzenle</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDeviceModal(false)} className="w-10 h-10 bg-white text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center shadow-sm transition-all focus:outline-none">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            {!isAdmin && (
                                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200 flex items-start gap-3 shadow-sm mb-2">
                                    <Info className="shrink-0 mt-0.5" size={18} />
                                    <p className="text-sm font-bold leading-relaxed">Cihaz donanım bilgilerini/seri numarasını sadece Admin yetkisine sahip teknisyenler güncelleyebilir.</p>
                                </div>
                            )}
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1 block">Cihaz Modeli</label>
                                    <input 
                                        type="text" 
                                        value={editForm.device} 
                                        onChange={e => setEditForm({...editForm, device: e.target.value})} 
                                        disabled={!isAdmin}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[20px] text-sm font-bold text-gray-900 focus:bg-white focus:border-apple-blue focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-70" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1 block">Seri Numarası (S/N veya IMEI)</label>
                                    <input 
                                        type="text" 
                                        value={editForm.serial} 
                                        onChange={e => setEditForm({...editForm, serial: e.target.value.toUpperCase()})} 
                                        disabled={!isAdmin}
                                        placeholder="Seri numarası bulunamadı..."
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[20px] text-sm font-bold font-mono text-gray-900 focus:bg-white focus:border-apple-blue focus:ring-4 focus:ring-blue-500/10 outline-none transition-all disabled:opacity-70" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1 block">IMEI 1</label>
                                        <input 
                                            type="text" 
                                            value={editForm.imei1} 
                                            onChange={e => setEditForm({...editForm, imei1: e.target.value.replace(/\D/g, '')})} 
                                            disabled={!isAdmin}
                                            maxLength="15"
                                            placeholder="35..."
                                            className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-[16px] text-xs font-bold font-mono text-gray-900 focus:bg-white focus:border-apple-blue outline-none transition-all disabled:opacity-70" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1 block">IMEI 2</label>
                                        <input 
                                            type="text" 
                                            value={editForm.imei2} 
                                            onChange={e => setEditForm({...editForm, imei2: e.target.value.replace(/\D/g, '')})} 
                                            disabled={!isAdmin}
                                            maxLength="15"
                                            placeholder="35..."
                                            className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-[16px] text-xs font-bold font-mono text-gray-900 focus:bg-white focus:border-apple-blue outline-none transition-all disabled:opacity-70" 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest ml-1 block">Müşteri Şikayeti / Arıza Notu</label>
                                    <textarea 
                                        rows={3} 
                                        value={editForm.issue} 
                                        onChange={e => setEditForm({...editForm, issue: e.target.value})} 
                                        disabled={!isAdmin}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[20px] text-sm font-medium text-gray-900 focus:bg-white focus:border-apple-blue focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none disabled:opacity-70 custom-scrollbar" 
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {isAdmin && (
                            <div className="p-6 bg-gray-50/80 border-t border-gray-100 flex justify-end gap-3 rounded-b-[32px]">
                                <button onClick={() => setShowDeviceModal(false)} className="px-6 py-4 bg-white text-gray-600 font-bold text-sm rounded-[16px] hover:bg-gray-100 border border-gray-200 transition-colors shadow-sm">İptal</button>
                                <button onClick={handleSaveDevice} className="px-8 py-4 bg-gray-900 text-white font-bold text-sm rounded-[16px] hover:bg-black shadow-xl hover:shadow-black/20 transition-all flex items-center gap-2 active:scale-95">
                                    <Save size={18} /> Güncelle
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Print Modals */}
            {showAcceptancePrint && (
                <ServiceFormPrint 
                    formData={{
                        ...repair,
                        customerName: repair.customer,
                        customerPhone: repair.customerPhone,
                        customerAddress: repair.customerAddress,
                        customerEmail: repair.customerEmail,
                        customerTC: repair.tcNo,
                        serialNumber: repair.serial || repair.serialNumber,
                        deviceModel: repair.device,
                        issueDescription: repair.issue,
                        productGroup: repair.productGroup || repair.device?.split(' ')[0] || '',
                        warrantyStatus: repair.warrantyStatus || 'Standart',
                        repairType: repair.repairType || repair.serviceType || 'repair',
                        estimatedCost: repair.quoteAmount || 0,
                        visualCondition: repair.visualCondition || [],
                        findMyOff: repair.findMyOff,
                        backupTaken: repair.backupTaken,
                        technicianNote: repair.technicianNote,
                        storeId: repair.storeId,
                        customerSignature: repair.customerSignature
                    }}
                    repairId={repair.id}
                    onClose={() => setShowAcceptancePrint(false)}
                />
            )}

            {showDeliveryPrint && (
                <DeliveryFormPrint 
                    repair={repair}
                    signature={repair.deliverySignature}
                    onClose={() => setShowDeliveryPrint(false)}
                />
            )}

            {showNotificationModal && (
                <CustomerNotificationModal
                    repair={repair}
                    onClose={() => setShowNotificationModal(false)}
                    onActionComplete={() => {
                        setShowNotificationModal(false);
                        onClose();
                    }}
                />
            )}
        </div>
    );
};

export default RepairHistoryModal;
