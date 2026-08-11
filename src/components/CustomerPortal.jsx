import React, { useState, useEffect } from 'react';
import { Apple, CheckCircle, Clock, XCircle, ChevronRight, AlertTriangle } from 'lucide-react';
import MyPhoneIcon from './LocalIcons';
import { appConfirm } from '../utils/alert';
import DeviceImage from './DeviceImage';

const CustomerPortal = ({ trackId }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [repair, setRepair] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [feedback, setFeedback] = useState({ score: 0, comment: '' });
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 
                    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                     ? 'http://localhost:5001/api' 
                     : '/api');

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`${API_URL}/public/repairs/${trackId}`);
                if (!res.ok) {
                    throw new Error('Kayıt bulunamadı. Lütfen takip numaranızı kontrol edin.');
                }
                const data = await res.json();
                setRepair(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trackId]);

    const handleQuote = async (action) => {
        if (!(await appConfirm(`Teklifi ${action === 'accept' ? 'onaylamak' : 'reddetmek'} istediğinize emin misiniz? Bu işlem geri alınamaz.`))) return;
        
        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/public/repairs/${trackId}/quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (res.ok) {
                setRepair(prev => ({ 
                    ...prev, 
                    status: data.status,
                    history: [...prev.history, { status: data.status, date: new Date().toLocaleString('tr-TR'), note: action === 'accept' ? 'Online Onay' : 'Online İptal' }]
                }));
            } else {
                alert(data.message);
            }
        // eslint-disable-next-line no-unused-vars
        } catch (err) {
            alert('İşlem başarısız oldu. Lütfen daha sonra tekrar deneyin.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleFeedback = async () => {
        if (feedback.score === 0) {
            alert('Lütfen bir puan seçiniz.');
            return;
        }
        
        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/public/repairs/${trackId}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedback)
            });
            if (res.ok) {
                setFeedbackSubmitted(true);
            } else {
                const data = await res.json();
                alert(data.message);
            }
        // eslint-disable-next-line no-unused-vars
        } catch (err) {
            alert('İşlem başarısız oldu.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <Apple size={48} className="text-gray-400 mb-4" />
                    <p className="text-gray-500 font-medium">Cihaz durumu sorgulanıyor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-lg text-center">
                    <XCircle size={64} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">Bulunamadı</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    const { status, device, issue, history, quoteAmount, diagnosisNotes } = repair;
    const isPendingApproval = status === 'Müşteri Onayı Bekliyor';

    // Status styling mapping
    const getStatusStyle = (s) => {
        if(s.includes('Beklemede')) return "bg-yellow-100 text-yellow-800 border-yellow-200";
        if(s.includes('İşlemde')) return "bg-blue-100 text-blue-800 border-blue-200";
        if(s.includes('Onayı')) return "bg-orange-100 text-orange-800 border-orange-200";
        if(s.includes('Hazır')) return "bg-green-100 text-green-800 border-green-200";
        if(s.includes('Teslim')) return "bg-gray-100 text-gray-800 border-gray-200";
        return "bg-purple-100 text-purple-800 border-purple-200";
    };

    return (
        <div className="min-h-screen bg-[#f5f5f7] font-sans pb-12">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Apple size={24} className="text-black" />
                        <span className="font-semibold text-lg tracking-tight">Onarım Takip Merkezi</span>
                    </div>
                    <span className="text-xs font-medium bg-gray-100 px-3 py-1.5 rounded-full text-gray-600 tracking-wide">
                        {trackId}
                    </span>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 mt-8 space-y-6">
                
                {/* Device Info Card */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                    <div className="flex items-start gap-6">
                        <div className="w-16 h-16 bg-gray-50 rounded-md overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-100">
                            <DeviceImage
                                image={repair.image}
                                productGroup={repair.productGroup}
                                device={repair.device}
                                apiUrl={API_URL}
                                className="w-full h-full object-cover"
                                alt={repair.device}
                            />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">{device}</h1>
                            <p className="text-gray-500 mb-4">{issue || repair.issueDescription || "Belirtilmedi"}</p>
                            <div className="inline-flex items-center gap-2">
                                <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${getStatusStyle(status)}`}>
                                    {status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quote Action Card (If pending) */}
                {isPendingApproval && (
                    <div className="bg-white rounded-[2rem] p-8 shadow-lg border-2 border-orange-100 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -z-10 opacity-50"></div>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="text-orange-500" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Teklif Onayınız Bekleniyor</h2>
                        </div>
                        
                        <div className="bg-gray-50 rounded-md p-4 mb-6 text-sm text-gray-700 leading-relaxed border border-gray-100">
                            <p className="mb-3 font-semibold text-gray-900 border-b border-gray-200 pb-2 flex items-center justify-between">
                                <span>Teknisyen Notu:</span>
                                {repair.quotationDetails?.date && <span className="text-xs text-gray-400 font-normal">{repair.quotationDetails.date}</span>}
                            </p>
                            <p className="mb-4">{diagnosisNotes || "Cihazınızın incelemesi tamamlanmış olup onarım için fiyat çıkartılmıştır."}</p>
                            
                            {repair.quotationDetails?.items && repair.quotationDetails.items.length > 0 && (
                                <div className="mt-4 border-t border-gray-200 pt-4">
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-3 tracking-widest">Teklif Detayı</h4>
                                    <div className="space-y-2">
                                        {repair.quotationDetails.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                                <span className="font-medium text-gray-800">{item.name}</span>
                                                <span className="font-mono text-gray-600 font-bold">{Number(item.price).toLocaleString('tr-TR')} ₺</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div>
                                <p className="text-sm text-gray-500 font-medium mb-1">Onarım Tutarı</p>
                                <p className="text-4xl font-bold text-gray-900">
                                    {Number(quoteAmount).toLocaleString('tr-TR')} <span className="text-2xl text-gray-500">TL</span>
                                </p>
                            </div>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button 
                                    onClick={() => handleQuote('reject')}
                                    disabled={actionLoading}
                                    className="flex-1 sm:flex-none px-6 py-3 rounded-full font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Reddet
                                </button>
                                <button 
                                    onClick={() => handleQuote('accept')}
                                    disabled={actionLoading}
                                    className="flex-1 sm:flex-none px-8 py-3 rounded-full font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                                >
                                    Onayla
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Timeline */}
                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-8">İşlem Geçmişi</h2>
                    
                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                        
                        {history && history.map((item, index) => {
                            const isLast = index === history.length - 1;
                            // eslint-disable-next-line no-unused-vars
                            const isFirst = index === 0;
                            
                            return (
                                <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                        {isLast ? <CheckCircle size={18} /> : <Clock size={18} />}
                                    </div>
                                    
                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-md bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-bold text-gray-900 text-sm">{item.status}</h3>
                                            <span className="text-xs font-medium text-gray-500">{item.date}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {item.note}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        
                    </div>
                </div>

                {/* Feedback Section (If Delivered) */}
                {(status === 'Teslim Edildi' || status === 'Tamamlandı') && !repair.feedback?.score && !feedbackSubmitted && (
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-200 animate-in zoom-in-95 duration-500">
                        <h2 className="text-2xl font-bold mb-2">Hizmetimizi Değerlendirin</h2>
                        <p className="text-blue-100 mb-8 opacity-90 font-medium">Size daha iyi hizmet verebilmemiz için deneyiminizi paylaşır mısınız?</p>
                        
                        <div className="flex flex-col items-center gap-6">
                            <div className="flex gap-4">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button 
                                        key={star} 
                                        onClick={() => setFeedback({ ...feedback, score: star })}
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${feedback.score >= star ? 'bg-white text-blue-600 scale-110 shadow-lg' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}
                                    >
                                        <Apple size={32} className={feedback.score >= star ? 'fill-current' : ''} />
                                    </button>
                                ))}
                            </div>
                            
                            <textarea 
                                placeholder="Görüş ve önerileriniz (Opsiyonel)"
                                className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-white/40 outline-none focus:bg-white/20 transition-all resize-none min-h-[100px] font-medium"
                                value={feedback.comment}
                                onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                            />
                            
                            <button 
                                onClick={handleFeedback}
                                disabled={actionLoading}
                                className="w-full bg-white text-blue-600 py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {actionLoading ? 'Gönderiliyor...' : 'Değerlendirmeyi Gönder'}
                            </button>
                        </div>
                    </div>
                )}

                {(repair.feedback?.score || feedbackSubmitted) && (
                    <div className="bg-white rounded-[2rem] p-8 text-center shadow-sm border border-gray-100 animate-in fade-in duration-500">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Geribildiriminiz İçin Teşekkürler!</h3>
                        <p className="text-gray-500">Görüşleriniz hizmet kalitemizi artırmak için kullanılacaktır.</p>
                    </div>
                )}

                <div className="text-center mt-8 text-sm text-gray-400 pb-8">
                    Troy Apple Yetkili Servis Sağlayıcısı
                </div>
            </div>
        </div>
    );
};

export default CustomerPortal;
