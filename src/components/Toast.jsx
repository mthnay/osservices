import React, { useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, Check } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                if (onCloseRef.current) {
                    onCloseRef.current();
                }
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration]);

    const bgColors = {
        success: 'bg-white/90 border-emerald-100/70 text-emerald-950 shadow-emerald-500/5',
        error: 'bg-white/90 border-rose-100/70 text-rose-950 shadow-rose-500/5',
        info: 'bg-white/90 border-blue-100/70 text-blue-950 shadow-blue-500/5',
        warning: 'bg-white/90 border-amber-100/70 text-amber-950 shadow-amber-500/5'
    };

    const icons = {
        success: <CheckCircle className="text-emerald-500 shrink-0" size={13} />,
        error: <XCircle className="text-rose-500 shrink-0" size={13} />,
        info: <Info className="text-blue-500 shrink-0" size={13} />,
        warning: <AlertCircle className="text-amber-500 shrink-0" size={13} />
    };

    const themeColors = {
        success: {
            strokeTrack: 'stroke-emerald-50/60',
            strokeFill: 'stroke-emerald-500',
            btnBg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
        },
        error: {
            strokeTrack: 'stroke-rose-50/60',
            strokeFill: 'stroke-rose-500',
            btnBg: 'bg-rose-50 hover:bg-rose-100 text-rose-600'
        },
        info: {
            strokeTrack: 'stroke-blue-50/60',
            strokeFill: 'stroke-blue-500',
            btnBg: 'bg-blue-50 hover:bg-blue-100 text-blue-600'
        },
        warning: {
            strokeTrack: 'stroke-amber-50/60',
            strokeFill: 'stroke-amber-500',
            btnBg: 'bg-amber-50 hover:bg-amber-100 text-amber-600'
        }
    };

    return (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-2 py-1 pl-3 pr-1 rounded-full border shadow-md backdrop-blur-md animate-in slide-in-from-right-8 fade-in duration-300 max-w-[240px] w-auto ${bgColors[type]}`}>
            <style>{`
                @keyframes circular-countdown {
                    from {
                        stroke-dashoffset: 57;
                    }
                    to {
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
            
            {icons[type]}
            
            <div className="flex-1 min-w-0 pr-1">
                <p className="font-extrabold text-[10.5px] text-gray-700 leading-tight truncate">{message}</p>
            </div>
            
            <button
                onClick={() => onCloseRef.current?.()}
                className={`relative flex items-center justify-center w-5 h-5 rounded-full transition-colors shrink-0 focus:outline-none cursor-pointer ${themeColors[type].btnBg}`}
            >
                {/* Circular timer track and filling progress */}
                <svg className="absolute inset-0 w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                    <circle
                        cx="10"
                        cy="10"
                        r="9"
                        className={`fill-none ${themeColors[type].strokeTrack}`}
                        strokeWidth="1.5"
                    />
                    <circle
                        cx="10"
                        cy="10"
                        r="9"
                        className={`fill-none ${themeColors[type].strokeFill}`}
                        strokeWidth="1.5"
                        strokeDasharray="57"
                        style={{
                            animation: `circular-countdown ${duration}ms linear forwards`
                        }}
                    />
                </svg>
                <Check size={8} className="relative z-10 stroke-[3.5]" />
            </button>
        </div>
    );
};

export default Toast;
