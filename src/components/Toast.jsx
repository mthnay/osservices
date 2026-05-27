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
        success: <CheckCircle className="text-emerald-400 shrink-0" size={14} />,
        error: <XCircle className="text-rose-400 shrink-0" size={14} />,
        info: <Info className="text-blue-400 shrink-0" size={14} />,
        warning: <AlertCircle className="text-amber-400 shrink-0" size={14} />
    };

    return (
        <div 
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-3 py-1.5 bg-gray-900/95 backdrop-blur-md text-gray-50 rounded-full shadow-lg shadow-black/10 border border-gray-800 animate-in slide-in-from-top-5 fade-in duration-300 pointer-events-auto"
            onClick={() => onClose && onClose()}
        >
            {icons[type] || icons.info}
            <span className="text-[11px] font-semibold tracking-wide whitespace-nowrap mr-1">{message}</span>
        </div>
    );
};

export default Toast;
