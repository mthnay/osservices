import React, { useState, useRef, useMemo } from 'react';
import { 
    CheckCircle, User, Package, Printer, X, PenTool, FileText, Calendar, 
    MapPin, Eye, ArrowRight, ShieldCheck, Search, Download, ChevronRight, 
    Activity, Clock, RotateCcw, Box, UserCheck, Shield
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import RepairHistoryModal from './RepairHistoryModal';
import DeliveryFormPrint from './DeliveryFormPrint';
import DeviceImage from './DeviceImage';

const StatusBadge = ({ status }) => {
    const config = {
        'Cihaz Hazır': 'bg-[#e6f4ea] text-[#1e7e34] border-[#1e7e34]/10',
        'Tamamlandı': 'bg-[#e6f4ea] text-[#1e7e34] border-[#1e7e34]/10',
        'İade Hazır': 'bg-[#f5f5f7] text-[#1d1d1f] border-gray-200',
    };
    const style = config[status] || 'bg-gray-100 text-gray-600 border-gray-200';
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${style} uppercase tracking-tight whitespace-nowrap`}>
            {status}
        </span>
    );
};

const ReadyForPickup = () => {
    const { repairs, updateRepair, API_URL } = useAppContext();
    const [selectedRepair, setSelectedRepair] = useState(null);
    const [selectedDetailRepair, setSelectedDetailRepair] = useState(null);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [showExportForm, setShowExportForm] = useState(false);
    const [signature, setSignature] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const canvasRef = useRef(null);

    const readyRepairs = useMemo(() => {
        return repairs.filter(r => {
            const isReady = r.status === 'Tamamlandı' || r.status === 'Cihaz Hazır' || r.status === 'İade Hazır';
            if (!isReady) return false;
            
            const searchLower = searchTerm.toLowerCase();
            return r.id.toLowerCase().includes(searchLower) || 
                   (r.customer && r.customer.toLowerCase().includes(searchLower)) ||
                   (r.serial && r.serial.toLowerCase().includes(searchLower));
        });
    }, [repairs, searchTerm]);

    const handleOpenDelivery = (repair) => {
        setSelectedRepair(repair);
        setShowDeliveryModal(true);
    };

    // eslint-disable-next-line no-unused-vars
    const startSignature = (e) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
    };

    const drawSignature = (e) => {
        if (e.buttons !== 1) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignature(null);
    };

    const handleDeliveryConfirm = () => {
        const canvas = canvasRef.current;
        const sigData = canvas.toDataURL();
        setSignature(sigData);
        setShowDeliveryModal(false);
        setShowExportForm(true);
        const isReturned = selectedRepair.status === 'İade Hazır';
        const finalStatus = isReturned ? 'İade Edildi' : 'Teslim Edildi';
        const finalNote = isReturned 
            ? 'Cihaz müşteriye işlemsiz olarak iade edildi ve teslimat imzası alındı.'
            : 'Cihaz müşteriye başarıyla teslim edildi ve teslimat imzası alındı.';

        updateRepair(selectedRepair.id, {
            status: finalStatus,
            deliverySignature: sigData,
            historyNote: finalNote
        });
    };

    return (
        <div className="page-shell space-y-6 animate-fade-in">
            {/* GSX Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <nav className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        <span>Onarım Yönetimi</span>
                        <ChevronRight size={10} />
                        <span className="text-[#0071e3]">Teslime Hazır</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-[#1d1d1f] tracking-tight">Teslimat & Randevu Masası</h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0071e3] transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Müşteri veya seri no..." 
                            className="pl-10 pr-4 py-2.5 bg-[#f5f5f7] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0071e3]/10 focus:border-[#0071e3] transition-all outline-none w-64 text-sm font-medium text-[#1d1d1f]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-400 transition-all">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-50 text-green-600">
                        <UserCheck size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bekleyen Teslimat</p>
                        <p className="text-xl font-bold text-[#1d1d1f]">{readyRepairs.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                        <Shield size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">QC Onaylı</p>
                        <p className="text-xl font-bold text-[#1d1d1f]">{readyRepairs.filter(r => r.status !== 'İade Hazır').length}</p>
                    </div>
                </div>
            </div>

            {/* Service Queue Table */}
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                <div className="page-scroll overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-[#f5f5f7] border-b border-gray-200">
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kayıt No</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cihaz & Müşteri Bilgisi</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Onarım Türü</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Durum</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Teslimat</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {readyRepairs.map(repair => (
                                <tr key={repair.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedDetailRepair(repair)}>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-[#1d1d1f]">#{repair.id}</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">{repair.date?.split(' ')[0]}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
                                                <DeviceImage image={repair.image} productGroup={repair.productGroup} device={repair.device} apiUrl={API_URL} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-[#1d1d1f] truncate">{repair.device}</p>
                                                <p className="text-[10px] text-gray-500 font-medium truncate">{repair.customer}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-gray-600">{repair.productGroup}</span>
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{repair.serviceType === 'exchange' ? 'Değişim' : 'Parça Onarımı'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <StatusBadge status={repair.status} />
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleOpenDelivery(repair); }}
                                            className="px-4 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[10px] font-bold rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2 ml-auto"
                                        >
                                            TESLİM ET <ArrowRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {readyRepairs.length === 0 && (
                        <div className="py-24 text-center">
                            <Box className="mx-auto text-gray-200 mb-4" size={56} />
                            <h3 className="text-lg font-bold text-gray-900">Bekleyen Teslimat Yok</h3>
                            <p className="text-sm text-gray-500">Müşteri tarafından alınmayı bekleyen bir cihaz bulunmuyor.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {selectedDetailRepair && <RepairHistoryModal repair={selectedDetailRepair} onClose={() => setSelectedDetailRepair(null)} />}
            
            {showDeliveryModal && (
                <div className="fixed inset-0 z-[110] bg-[#1d1d1f]/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-scale-up">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[#1d1d1f]">Cihaz Teslim Onayı</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">E-İmza & Teslimat Formu</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDeliveryModal(false)} className="p-2 text-gray-400 hover:text-[#1d1d1f]">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="p-5 bg-[#f5f5f7] rounded-2xl flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <Package size={24} className="text-[#1d1d1f]" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedRepair?.id}</p>
                                    <p className="text-sm font-bold text-[#1d1d1f]">{selectedRepair?.device}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-[#1d1d1f] flex items-center gap-2">
                                        <PenTool size={18} className="text-[#0071e3]" /> Müşteri İmzası
                                    </label>
                                    <button onClick={clearSignature} className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors">TEMİZLE</button>
                                </div>
                                <canvas
                                    ref={canvasRef}
                                    width={500}
                                    height={200}
                                    onMouseDown={startSignature}
                                    onMouseMove={drawSignature}
                                    className="bg-[#fbfbfd] border-2 border-dashed border-gray-200 rounded-2xl cursor-crosshair w-full shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50 flex gap-4">
                            <button onClick={() => setShowDeliveryModal(false)} className="flex-1 py-4 text-gray-400 font-bold">İptal</button>
                            <button onClick={handleDeliveryConfirm} className="flex-[2] py-4 bg-[#0071e3] text-white font-bold rounded-2xl shadow-xl shadow-[#0071e3]/20 flex items-center justify-center gap-2">
                                <CheckCircle size={20} /> TESLİMATI TAMAMLA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showExportForm && <DeliveryFormPrint repair={selectedRepair} signature={signature} onClose={() => setShowExportForm(false)} />}
        </div>
    );
};

export default ReadyForPickup;
