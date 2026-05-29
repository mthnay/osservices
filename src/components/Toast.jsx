import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    // Sadece basit ve güvenilir bir timeout.
    useEffect(() => {
        if (!duration) return;
        const timer = setTimeout(() => {
            if (onClose) onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="text-emerald-500 shrink-0" size={20} />,
        error: <XCircle className="text-rose-500 shrink-0" size={20} />,
        info: <Info className="text-blue-500 shrink-0" size={20} />,
        warning: <AlertCircle className="text-amber-500 shrink-0" size={20} />
    };

    return (
        <div 
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 bg-white/85 backdrop-blur-xl text-gray-800 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 animate-in slide-in-from-top-5 fade-in duration-300 pointer-events-auto cursor-pointer hover:bg-white/95 transition-all"
            onClick={() => onClose && onClose()}
        >
            {icons[type] || icons.info}
            <span className="text-[14px] font-semibold tracking-tight whitespace-nowrap mr-1">{message}</span>
        </div>
    );
};

export default Toast;
