import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
    Truck, Package, ArrowRight, CheckCircle,
    Calendar, MapPin, ExternalLink, Box, AlertCircle, Wrench, Clock, Plus, Trash2, FileText, Pencil, DollarSign, X,
    MessageCircle, MoreHorizontal, Mail, Map, Download, Camera, Printer, Settings, BarChart
} from 'lucide-react';
import MyPhoneIcon from './LocalIcons';
import CustomerNotificationModal from './CustomerNotificationModal';
import { useAppContext } from '../context/AppContext';

const AppleLogisticsModal = ({ repairId, onClose }) => {
    const { updateRepair, repairs, showToast } = useAppContext();
    const [repair, setRepair] = useState(null);
    const [shipmentCode, setShipmentCode] = useState('');
    const [gsxNo, setGsxNo] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [arcResult, setArcResult] = useState('');
    const [arcParts, setArcParts] = useState([]);
    const [activeTimeline, setActiveTimeline] = useState(2); // Mock: 2. adımda (Apple Merkezi'nde)
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef(null);
    const { uploadMedia } = useAppContext();

    useEffect(() => {
        const found = repairs.find(r => r.id === repairId);
        if (found) {
            setRepair(found);
            
            // Sadece ilk açılışta veya ID değiştiğinde yerel state'i senkronize et
            // Bu sayede global repairs güncellendiğinde (örneğin timer) kullanıcının yazdıkları silinmez
            if (!repair || repair.id !== found.id) {
                setShipmentCode(found.shipmentCode || '');
                setGsxNo(found.appleRepairId || '');
                setArcResult(found.diagnosisNotes?.startsWith('ARC SONUCU:') ? found.diagnosisNotes.replace('ARC SONUCU: ', '') : '');
                setArcParts(found.parts || []);
            }
        }
    }, [repairId, repairs, repair]);

    const handleStartTracking = () => {
        if (!shipmentCode) {
            alert('Lütfen UPS Takip Numarasını giriniz.');
            return;
        }

        // Durumu güncelle ve takip numarasını kaydet
        updateRepair(repairId, {
            status: "Apple'a Gönderildi",
            shipmentCode: shipmentCode,
            historyNote: `UPS Takip No girildi: ${shipmentCode}. Cihaz Apple Onarım Merkezi'ne gönderildi.`
        });

        alert('Takip numarası kaydedildi ve cihaz durumu güncellendi.');
    };

    const handleReceiveFromARC = () => {
        if (!arcResult) {
            alert('Lütfen Apple Merkezi onarım sonucunu (pencerenin alt kısmındaki alan) giriniz.');
            // Opsiyonel: Textarea'ya scroll yapabiliriz
            const el = document.querySelector('textarea');
            if (el) el.focus();
            return;
        }

        const isReturn = repair.status === 'İade Bekleniyor' || repair.repairType === 'direct-return';

        updateRepair(repairId, {
            status: isReturn ? 'İade Hazır' : 'Cihaz Hazır',
            diagnosisNotes: `ARC SONUCU: ${arcResult}`,
            parts: arcParts,
            appleRepairId: gsxNo,
            historyNote: `Cihaz Apple Onarım Merkezi'nden geldi. Sonuç: ${arcResult}. Değişen Parça Sayısı: ${arcParts.length}`
        });

        alert(`Cihaz başarıyla teslim alındı ve "${isReturn ? 'İade Hazır' : 'Hazır'}" durumuna çekildi.`);
        onClose();
    };

    const handleSaveGSX = () => {
        updateRepair(repairId, {
            appleRepairId: gsxNo,
            historyNote: `Apple Onarım No (GSX) güncellendi: ${gsxNo}`
        });
        setIsEditing(false);
        alert('Onarım numarası güncellendi.');
    };

    const handleSaveDraft = () => {
        updateRepair(repairId, {
            shipmentCode: shipmentCode,
            appleRepairId: gsxNo,
            diagnosisNotes: arcResult ? `ARC GÜNCEL DURUM: ${arcResult}` : repair.diagnosisNotes,
            parts: arcParts,
            historyNote: 'Apple servis süreci güncellendi (Taslak).'
        });
        alert('İlerleme kaydedildi.');
    };

    const handleQuoteReceived = async () => {
        const { value: amount } = await Swal.fire({
            title: 'Teklif Alındı',
            input: 'number',
            inputLabel: 'Müşteriye iletilecek teklif tutarı (TL)',
            inputPlaceholder: '0.00',
            showCancelButton: true,
            confirmButtonColor: '#9333ea',
            cancelButtonText: 'Vazgeç',
            confirmButtonText: 'Kaydet'
        });

        if (amount) {
            updateRepair(repairId, {
                status: 'Müşteri Onayı Bekliyor',
                quoteAmount: amount,
                historyNote: `Apple ARC'den teklif geldi: ${amount} TL. Müşteri onayı bekleniyor.`
            });
            showToast('Kayıt "Onay Bekliyor" durumuna çekildi.', 'info');
        }
    };

    const handleQuoteResolution = (isApproved) => {
        if (isApproved) {
            updateRepair(repairId, {
                status: "Apple'a Gönderildi",
                historyNote: 'Müşteri teklifi onayladı. Onarım süreci Apple ARC kanalında devam ediyor.'
            });
            showToast('Onay kaydedildi. Süreç devam ediyor.', 'success');
        } else {
            updateRepair(repairId, {
                status: 'İade Bekleniyor',
                historyNote: 'Müşteri teklifi reddetti. Apple ARC\'den iade istendi.'
            });
            showToast('Red kaydedildi. Cihaz Apple merkezinden iade bekleniyor durumuna alındı.', 'info');
        }
    };

    const addArcPart = () => {
        setArcParts([...arcParts, { partNumber: '', description: '', kbbSerial: '', kgbSerial: '' }]);
    };

    const removeArcPart = (index) => {
        setArcParts(arcParts.filter((_, i) => i !== index));
    };

    const updateArcPart = (index, field, value) => {
        setArcParts(prev => {
            const newParts = [...prev];
            newParts[index] = { ...newParts[index], [field]: value };
            return newParts;
        });
    };

    const handleAddPhoto = () => fileInputRef.current?.click();

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const data = await uploadMedia(file);
            if (data && data.url) {
                // Determine if it's "before shipping" or "after receiving"
                const isAfter = repair.status.includes('Hazır') || repair.status.includes('Teslim');
                const field = isAfter ? 'afterImages' : 'beforeImages';
                const currentList = repair[field] || [];
                
                await updateRepair(repairId, {
                    [field]: [...currentList, data.url]
                });
                showToast('Lojistik fotoğrafı kaydedildi.', 'success');
            }
        } catch (error) {
            console.error(error);
            showToast('Yükleme hatası.', 'error');
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const removePhoto = async (index, category) => {
        const newList = [...(repair[category] || [])];
        newList.splice(index, 1);
        await updateRepair(repairId, { [category]: newList });
    };

    if (!repair) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content w-full max-w-4xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gray-50/50 px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0 backdrop-blur-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center text-apple-blue shadow-lg shadow-blue-100 ring-2 ring-white">
                            <Truck size={24} className="fill-current" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 text-xl tracking-tight">Lojistik ve ARC Süreç Yönetimi</h3>
                            <p className="text-sm font-medium text-gray-400 mt-1 flex items-center gap-2">
                                <span>Kayıt:</span>
                                <span className="text-gray-900 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">#{repair.id}</span>
                                <span className="text-gray-400">|</span>
                                <span>Cihaz:</span>
                                <span className="text-gray-900 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">{repair.device}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white rounded-full hover:bg-gray-100 border border-gray-200 transition-all shadow-sm">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {/* Üst Bilgi Kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-md border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Truck size={16} className="text-blue-500" />
                                <span className="text-xs font-bold uppercase text-gray-500 tracking-wide">Gönderi Kodu (UPS)</span>
                            </div>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                                    placeholder="UPS Takip No"
                                    value={shipmentCode}
                                    onChange={(e) => setShipmentCode(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleStartTracking}
                                        className="flex-1 bg-blue-600 text-white py-2 rounded-md text-xs font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                                    >
                                        Takibi Başlat
                                    </button>
                                    <button className="w-9 h-9 flex items-center justify-center bg-white text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-all">
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-md border border-gray-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Wrench size={16} className="text-purple-500" />
                                    <span className="text-xs font-bold uppercase text-gray-500 tracking-wide">GSX Onarım No</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {isEditing ? (
                                        <div className="flex-1 flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all"
                                                value={gsxNo}
                                                onChange={(e) => setGsxNo(e.target.value)}
                                                autoFocus
                                            />
                                            <button onClick={handleSaveGSX} className="bg-purple-600 text-white px-3 rounded-md text-xs font-bold">Kaydet</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setIsEditing(true)}>
                                            <span className="text-xl font-mono font-bold text-gray-900 tracking-tight leading-none">
                                                {gsxNo || 'Girilmedi'}
                                            </span>
                                            <div className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 opacity-0 group-hover:opacity-100 transition-all">
                                                <Pencil size={12} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {!isEditing && gsxNo && (
                                <div className="mt-4 flex items-center gap-2 bg-purple-50 px-2 py-1 rounded-md border border-purple-100 w-fit">
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-tight">{repair.status}</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-5 rounded-md border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar size={16} className="text-emerald-500" />
                                <span className="text-xs font-bold uppercase text-gray-500 tracking-wide">Tahmini Teslim</span>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-xl font-bold text-gray-900 tracking-tight leading-none">30 Ocak 2024</h3>
                                <div className="space-y-1.5">
                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full w-[60%] rounded-full transition-all duration-1000" />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Lojistik Aşaması: %60</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Kayıt ve Cihaz Detayları Paneli */}
                    <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-gray-500" />
                                <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wide">Kayıt Detayları</h3>
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                Son Güncelleme: {repair.updatedAt || 'Yeni'}
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Müşteri Profili</span>
                                    <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-md border border-gray-200">
                                        <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-apple-blue font-bold text-lg shrink-0">
                                            {repair.customer?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{repair.customer}</p>
                                            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                <MyPhoneIcon size={12} className="text-gray-400" /> {repair.customerPhone}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cihaz Bilgisi</span>
                                    <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                        <p className="text-sm font-bold text-gray-900 mb-1">{repair.device}</p>
                                        <p className="text-xs font-mono text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200 inline-block">
                                            SN: {repair.serial || repair.serialNumber || 'Bilinmiyor'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Arıza Açıklaması</span>
                                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 border-l-4 border-l-orange-400">
                                        <p className="text-sm text-gray-700 leading-relaxed italic">
                                            "{repair.issue || repair.issueDescription || 'Belirtilmedi'}"
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Teknik Tanı & Notlar</span>
                                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 border-l-4 border-l-blue-400">
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                            {repair.diagnosisNotes || 'Henüz bir teknik not girilmemiş.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Apple Merkezi Dönüş Bölümü */}
                    {(repair.status === "Apple'a Gönderildi" || repair.status === "İade Bekleniyor" || repair.status === "Müşteri Onayı Bekliyor" || repair.status === "Cihaz Hazır" || repair.status === "İade Hazır") && (
                        <div className="p-6 bg-white rounded-md border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle size={16} className="text-green-500" />
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">ARC Kargo Kabul & Sonuç Girişi</h4>
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Onarım Merkezi Geri Bildirimi</label>
                                <textarea
                                    className="w-full p-4 rounded-md border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none text-sm font-medium min-h-[100px] transition-all"
                                    placeholder="Apple Onarım Merkezi'nden iletilen onarım sonucunu veya yapılan işlemleri buraya yazınız..."
                                    value={arcResult}
                                    onChange={e => setArcResult(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="mb-2">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Box size={14} className="text-gray-400" />
                                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ARC'de Değişen Parçalar</h5>
                                    </div>
                                    <button
                                        onClick={addArcPart}
                                        className="text-[10px] bg-white text-gray-700 px-3 py-1.5 rounded-md font-bold border border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 transition-all"
                                    >
                                        <Plus size={14} /> Parça Ekle
                                    </button>
                                </div>
                                
                                {arcParts.length === 0 ? (
                                    <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-200 rounded-md text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                        Henüz parça eklenmedi
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {arcParts.map((part, index) => (
                                            <div key={index} className="bg-white p-4 rounded-md border border-gray-200 relative group">
                                                <button
                                                    onClick={() => removeArcPart(index)}
                                                    className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                
                                                <div className="grid grid-cols-2 gap-4 pr-8 mb-3">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Parça No</p>
                                                        <input
                                                            type="text"
                                                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono font-bold outline-none focus:border-blue-300 focus:bg-white"
                                                            value={part.partNumber}
                                                            onChange={e => updateArcPart(index, 'partNumber', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Tanım</p>
                                                        <input
                                                            type="text"
                                                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-bold outline-none focus:border-blue-300 focus:bg-white"
                                                            value={part.description || part.name || part.itemName || ''}
                                                            onChange={e => updateArcPart(index, 'description', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">KBB (Arızalı)</p>
                                                        <input
                                                            type="text"
                                                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono font-bold outline-none focus:border-blue-300 focus:bg-white"
                                                            value={part.kbbSerial || ''}
                                                            onChange={e => updateArcPart(index, 'kbbSerial', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">KGB (Yeni)</p>
                                                        <input
                                                            type="text"
                                                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono font-bold outline-none focus:border-blue-300 focus:bg-white"
                                                            value={part.kgbSerial || ''}
                                                            onChange={e => updateArcPart(index, 'kgbSerial', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Lojistik Görsel Belgeleme */}
                    <div className="p-6 bg-white rounded-md border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Camera size={16} className="text-gray-500" />
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Lojistik Görsel Arşivi</h4>
                            </div>
                            <button 
                                onClick={handleAddPhoto}
                                disabled={uploading}
                                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 transition-all disabled:opacity-50"
                            >
                                {uploading ? <Clock size={14} className="animate-spin" /> : <Plus size={14} />}
                                Görsel Ekle
                            </button>
                        </div>

                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Gönderim Fotoğrafları */}
                            {repair.beforeImages?.map((url, idx) => (
                                <div key={`before-${idx}`} className="relative group aspect-video rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                                    <img src={url} className="w-full h-full object-cover" alt="Pre-shipment" />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-[8px] text-white font-semibold uppercase tracking-tight text-center">Kargo Gönderme</p>
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => window.open(url, '_blank')} className="p-1.5 bg-white/20 backdrop-blur-sm rounded-md text-white hover:bg-white/40"><ExternalLink size={12} /></button>
                                        <button onClick={() => removePhoto(idx, 'beforeImages')} className="p-1.5 bg-red-500/80 rounded-md text-white hover:bg-red-500"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            ))}
                            {/* Dönüş Fotoğrafları */}
                            {repair.afterImages?.map((url, idx) => (
                                <div key={`after-${idx}`} className="relative group aspect-video rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                                    <img src={url} className="w-full h-full object-cover" alt="Post-arrival" />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-[8px] text-white font-semibold uppercase tracking-tight text-center">Apple'dan Gelen</p>
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => window.open(url, '_blank')} className="p-1.5 bg-white/20 backdrop-blur-sm rounded-md text-white hover:bg-white/40"><ExternalLink size={12} /></button>
                                        <button onClick={() => removePhoto(idx, 'afterImages')} className="p-1.5 bg-red-500/80 rounded-md text-white hover:bg-red-500"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            ))}
                            {(!repair.beforeImages?.length && !repair.afterImages?.length) && (
                                <div className="col-span-full py-8 text-center bg-gray-50 rounded-md border border-dashed border-gray-200">
                                    <Camera size={24} className="mx-auto text-gray-300 mb-2" />
                                    <p className="text-[11px] font-medium text-gray-400">Henüz lojistik görseli eklenmemiş.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50/50 px-8 py-5 border-t border-gray-100 flex items-center justify-between flex-shrink-0 backdrop-blur-lg z-10">
                    <div>
                        <button
                            onClick={() => setShowNotificationModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-apple-blue border border-gray-200 hover:border-blue-200 rounded-md text-xs font-bold transition-all shadow-sm"
                        >
                            <Mail size={16} /> Durum Bildir
                        </button>
                    </div>
                    <div className="flex gap-2">
                        {repair.status === 'Müşteri Onayı Bekliyor' ? (
                            <>
                                <button
                                    onClick={() => handleQuoteResolution(true)}
                                    className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-2"
                                >
                                    <CheckCircle size={14} /> Onaylandı (Devam)
                                </button>
                                <button
                                    onClick={() => handleQuoteResolution(false)}
                                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
                                >
                                    <X size={14} /> Reddedildi (İade)
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={handleQuoteReceived}
                                className="px-4 py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-md text-xs font-bold hover:bg-orange-100 transition-colors flex items-center gap-2"
                            >
                                <DollarSign size={14} /> Teklif Geldi
                            </button>
                        )}
                        <button
                            onClick={handleSaveDraft}
                            className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-md text-xs font-bold transition-colors"
                        >
                            Taslak Kaydet
                        </button>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`px-4 py-2 border rounded-md text-xs font-bold transition-colors ${isEditing ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'}`}
                        >
                            {isEditing ? 'Düzenlemeyi Kapat' : 'Kayıt Düzenle'}
                        </button>
                        
                        {(repair.status === "Apple'a Gönderildi" || repair.status === "İade Bekleniyor" || repair.status === "Müşteri Onayı Bekliyor" || repair.status === "Cihaz Hazır" || repair.status === "İade Hazır") && (
                            <button
                                onClick={handleReceiveFromARC}
                                className="px-5 py-2 bg-gray-900 hover:bg-black text-white rounded-md text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
                            >
                                <CheckCircle size={14} />
                                Mağazaya Al
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification Modal */}
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

export default AppleLogisticsModal;
