import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';

const GlobalDialogs = () => {
    const [dialog, setDialog] = useState(null);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        const handleDialog = (e) => {
            setDialog(e.detail);
            setInputValue('');
        };
        window.addEventListener('global-dialog', handleDialog);
        return () => window.removeEventListener('global-dialog', handleDialog);
    }, []);

    if (!dialog) return null;

    const handleClose = (result) => {
        if (dialog.resolve) dialog.resolve(result);
        setDialog(null);
    };

    // Strip HTML from message for a clean, single-line text
    const cleanMessage = (dialog.message || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

    const getIcon = () => {
        if (dialog.type === 'confirm') return <AlertTriangle size={14} className="text-amber-400" />;
        if (dialog.alertType === 'error') return <XCircle size={14} className="text-rose-400" />;
        if (dialog.alertType === 'success') return <CheckCircle2 size={14} className="text-emerald-400" />;
        return <Info size={14} className="text-blue-400" />;
    };

    return (
        <div className="fixed inset-0 z-[99999] pointer-events-none flex justify-center pt-5">
            {/* Overlay for confirm/prompt to block interaction but keep it transparent */}
            {(dialog.type === 'confirm' || dialog.type === 'prompt') && (
                <div className="fixed inset-0 pointer-events-auto bg-black/5 backdrop-blur-[1px]" onClick={() => handleClose(false)}></div>
            )}
            
            <div 
                className="relative pointer-events-auto flex items-center gap-3 px-4 py-2 bg-gray-900/95 backdrop-blur-md text-gray-50 rounded-full shadow-2xl border border-gray-800 animate-in slide-in-from-top-5 fade-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2">
                    {getIcon()}
                    <span className="text-[11px] font-medium tracking-wide max-w-[300px] truncate" title={cleanMessage}>
                        {cleanMessage}
                    </span>
                </div>

                {dialog.type === 'prompt' && (
                    <input 
                        type="text" 
                        autoFocus
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleClose(inputValue)}
                        className="bg-gray-800 border border-gray-700 text-white text-[11px] px-2 py-1 rounded outline-none focus:border-blue-500 w-32"
                        placeholder="..."
                    />
                )}

                <div className="flex items-center gap-1.5 ml-1 border-l border-gray-700 pl-3">
                    {dialog.type === 'alert' ? (
                        <button 
                            onClick={() => handleClose(true)} 
                            className="text-[10px] font-bold px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
                        >
                            Tamam
                        </button>
                    ) : dialog.type === 'prompt' ? (
                        <>
                            <button onClick={() => handleClose(false)} className="text-[10px] font-semibold px-2.5 py-1 text-gray-400 hover:text-white transition-colors">İptal</button>
                            <button onClick={() => handleClose(inputValue)} className="text-[10px] font-bold px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors">Kaydet</button>
                        </>
                    ) : (
                        // Confirm
                        <>
                            <button onClick={() => handleClose(false)} className="text-[10px] font-semibold px-2.5 py-1 text-gray-400 hover:text-white transition-colors">İptal</button>
                            <button onClick={() => handleClose(true)} className="text-[10px] font-bold px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors">Evet</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalDialogs;
