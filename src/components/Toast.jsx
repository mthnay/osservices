import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, Check } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const bgColors = {
        success: 'bg-white/95 border-emerald-100 text-emerald-950 shadow-emerald-100/10',
        error: 'bg-white/95 border-rose-100 text-rose-950 shadow-rose-100/10',
        info: 'bg-white/95 border-blue-100 text-blue-950 shadow-blue-100/10',
        warning: 'bg-white/95 border-amber-100 text-amber-950 shadow-amber-100/10'
    };

    const icons = {
        success: <CheckCircle className="text-emerald-500 shrink-0" size={16} />,
        error: <XCircle className="text-rose-500 shrink-0" size={16} />,
        info: <Info className="text-blue-500 shrink-0" size={16} />,
        warning: <AlertCircle className="text-amber-500 shrink-0" size={16} />
    };

    return (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3.5 py-2 pl-4 pr-2 rounded-full border shadow-xl bg-white/95 backdrop-blur-md animate-in slide-in-from-right-8 fade-in duration-300 max-w-[290px] w-auto ${bgColors[type]}`}>
            <style>{`
                @keyframes circular-countdown {
                    from {
                        stroke-dashoffset: 82;
                    }
                    to {
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
            
            {icons[type]}
            
            <div className="flex-1 min-w-0 pr-1">
                <p className="font-bold text-[11px] text-gray-700 leading-tight line-clamp-2">{message}</p>
            </div>
            
            <button
                onClick={onClose}
                className="relative flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors shrink-0 focus:outline-none"
            >
                {/* Circular timer track and filling progress */}
                <svg className="absolute inset-0 w-7 h-7 -rotate-90" viewBox="0 0 28 28">
                    <circle
                        cx="14"
                        cy="14"
                        r="13"
                        className="stroke-blue-100 fill-none"
                        strokeWidth="1.8"
                    />
                    <circle
                        cx="14"
                        cy="14"
                        r="13"
                        className="stroke-blue-500 fill-none"
                        strokeWidth="1.8"
                        strokeDasharray="82"
                        style={{
                            animation: `circular-countdown ${duration}ms linear forwards`
                        }}
                    />
                </svg>
                <Check size={11} className="relative z-10 stroke-[3]" />
            </button>
        </div>
    );
};

export default Toast;
