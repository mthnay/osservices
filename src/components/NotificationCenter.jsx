import React, { useState, useRef, useEffect } from 'react';
import { Bell, AlertCircle, Clock, ChevronRight, X, Info, ClipboardList } from 'lucide-react';
import MyPhoneIcon from './LocalIcons';
import { useAppContext } from '../context/AppContext';

const NotificationCenter = ({ onSelectRepair, onGoToAnnouncements }) => {
    const { alerts, clearAllAlerts } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (alert) => {
        if (alert.type === 'announcement' || alert.type === 'task') {
            if (onGoToAnnouncements) {
                onGoToAnnouncements();
                setIsOpen(false);
            }
        } else if (onSelectRepair && alert.repair) {
            onSelectRepair(alert.repair);
            setIsOpen(false);
        }
    };

    const criticalCount = alerts.filter(a => a.type === 'critical').length;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notification Bell */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-md transition-all duration-300 ${
                    isOpen 
                    ? 'bg-gray-900 text-white shadow-lg' 
                    : 'bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 shadow-sm border border-gray-100'
                }`}
            >
                <Bell size={20} />
                {alerts.length > 0 && (
                    <span className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-semibold rounded-full border-2 border-white shadow-md ${
                        criticalCount > 0 ? 'bg-red-500 text-white animate-bounce' : 'bg-orange-500 text-white'
                    }`}>
                        {alerts.length}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gray-100 z-50 overflow-hidden animate-scale-up origin-top-right">
                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center text-gray-900">
                        <div>
                            <h3 className="font-semibold text-lg">Bildirimler</h3>
                            <p className="text-[10px] text-gray-400 font-bold text-xs uppercase tracking-wide">Akıllı Otomasyon Merkezi</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* List */}
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {alerts.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {alerts.map((alert, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => handleSelect(alert)}
                                        className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex gap-4">
                                            <div className={`mt-1 p-2 rounded-md shrink-0 ${
                                                alert.type === 'critical' ? 'bg-red-50 text-red-500' :
                                                alert.type === 'warning' ? 'bg-orange-50 text-orange-500' :
                                                alert.type === 'announcement' ? 'bg-indigo-50 text-indigo-500' :
                                                alert.type === 'task' ? 'bg-amber-50 text-amber-600' :
                                                'bg-blue-50 text-blue-500'
                                            }`}>
                                                {alert.type === 'critical' ? <AlertCircle size={18} /> : 
                                                 alert.type === 'warning' ? <Clock size={18} /> :
                                                 alert.type === 'announcement' ? <Bell size={18} /> :
                                                 alert.type === 'task' ? <ClipboardList size={18} /> :
                                                 <Info size={18} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {alert.type === 'announcement' ? (
                                                    <>
                                                        <div className="flex justify-between items-start mb-0.5">
                                                            <h4 className="font-bold text-gray-900 text-sm truncate">
                                                                📢 {alert.title}
                                                            </h4>
                                                            <span className="text-[9px] font-semibold text-gray-400">Duyuru</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium leading-relaxed italic mb-2">
                                                            {alert.message}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                                Yazan: {alert.author}
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/50 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                Duyurulara Git <ChevronRight size={10} className="inline ml-1" />
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : alert.type === 'task' ? (
                                                    <>
                                                        <div className="flex justify-between items-start mb-0.5">
                                                            <h4 className="font-bold text-gray-900 text-sm truncate">
                                                                📋 {alert.title}
                                                            </h4>
                                                            <span className="text-[9px] font-semibold text-gray-400">Yeni Görev</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium leading-relaxed italic mb-2">
                                                            {alert.message}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                                Son Tarih: {alert.dueDate ? new Date(alert.dueDate).toLocaleDateString() : 'Belirtilmedi'}
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100/50 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                                                Görevlere Git <ChevronRight size={10} className="inline ml-1" />
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-between items-start mb-0.5">
                                                            <h4 className="font-bold text-gray-900 text-sm truncate">
                                                                {alert.repair?.device}
                                                            </h4>
                                                            <span className="text-[9px] font-semibold text-gray-400">#{alert.repair?.id}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium leading-relaxed italic mb-2">
                                                            {alert.message}
                                                        </p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                                <MyPhoneIcon size={10} /> {alert.repair?.customer}
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100/50 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                Detaya Git <ChevronRight size={10} className="inline ml-1" />
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Bell className="text-gray-200" size={32} />
                                </div>
                                <h4 className="font-bold text-gray-900">Her Şey Yolunda</h4>
                                <p className="text-sm text-gray-400 mt-1">Geciken veya bekleyen kritik bir işlem bulunamadı.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {alerts.length > 0 && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    clearAllAlerts();
                                    setIsOpen(false);
                                }}
                                className="text-xs font-semibold text-blue-600 text-[10px] uppercase tracking-wide hover:text-blue-800 transition-colors"
                            >
                                Tümünü Temizle
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
