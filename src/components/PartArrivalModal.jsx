import React, { useState, useEffect } from 'react';
import { X, Save, Box, ArrowRight, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const PartArrivalModal = ({ repairId, onClose }) => {
    const { repairs, updateRepair, showToast } = useAppContext();
    const [repair, setRepair] = useState(null);
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const found = repairs.find(r => r.id === repairId);
        if (found) {
            setRepair(found);
            const orderParts = (found.parts || []).map(p => ({
                ...p,
                tempKgb: p.kgbSerial || ''
            }));
            setParts(orderParts);
        }
    }, [repairId, repairs]);

    const handleUpdatePart = (index, value) => {
        const newParts = [...parts];
        newParts[index].tempKgb = value.toUpperCase().replace(/\s/g, '');
        setParts(newParts);
    };

    const handleSave = async () => {
        const incomplete = parts.find(p => p.needsOrder && !p.tempKgb.trim());
        if (incomplete) {
            showToast(`${incomplete.description} için seri no girilmedi.`, 'warning');
            return;
        }

        setLoading(true);
        try {
            const finalParts = parts.map(p => ({
                ...p,
                kgbSerial: p.tempKgb,
                needsOrder: false
            }));

            await updateRepair(repairId, {
                parts: finalParts,
                status: 'Onarımda',
                historyNote: 'Parçalar ulaştı, seri numaraları tanımlandı.'
            });

            showToast('Kaydedildi.', 'success');
            onClose();
        // eslint-disable-next-line no-unused-vars
        } catch (error) {
            showToast('Hata oluştu.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!repair) return null;
    const pendingParts = parts.filter(p => p.needsOrder);

    return (
        <div className="modal-overlay">
            <div className="modal-content w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-500">
                
                {/* Header - Premium */}
                <div className="p-8 bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-between shadow-2xl shadow-indigo-500/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Box size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest leading-none mb-1">KGB Seri Girişi</h2>
                            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest opacity-70">Gelen Yedek Parça Tanımlama</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-95"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/30">
                    {pendingParts.map((part, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm transition-all hover:shadow-xl hover:shadow-indigo-500/5 group">
                            <div className="flex justify-between items-start mb-4 px-1">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Parça Tanımı</span>
                                    <h3 className="text-sm font-bold text-gray-900 leading-tight">{part.description}</h3>
                                </div>
                                <span className="text-[9px] bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl font-bold border border-indigo-100 uppercase tracking-tighter">
                                    {part.partNumber}
                                </span>
                            </div>
                            
                            <div className="relative group/input">
                                <input 
                                    type="text"
                                    className="w-full h-14 pl-12 pr-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-sm font-bold font-mono text-indigo-900 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all uppercase placeholder:text-gray-300"
                                    placeholder="Yeni Seri No Okutun"
                                    value={part.tempKgb}
                                    onChange={(e) => handleUpdatePart(parts.findIndex(p => p === part), e.target.value)}
                                    autoFocus={idx === 0}
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-indigo-500 transition-colors">
                                    <ArrowRight size={18} />
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {pendingParts.length === 0 && (
                        <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200">
                            <AlertCircle size={32} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-sm font-bold text-gray-400">Bekleyen parça girişi bulunamadı.</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-gray-100 bg-white flex gap-4">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-4 text-[11px] font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-2xl transition-all uppercase tracking-widest"
                    >
                        Vazgeç
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={loading} 
                        className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest shadow-2xl shadow-gray-400/50 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-gray-400 group"
                    >
                        {loading ? (
                            <Clock size={18} className="animate-spin" />
                        ) : (
                            <Save size={18} className="group-hover:scale-110 transition-transform" />
                        )}
                        KAYDET VE DEVAM ET
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PartArrivalModal;
