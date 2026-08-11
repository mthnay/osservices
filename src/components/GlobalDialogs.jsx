import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';

const GlobalDialogs = () => {
    const [dialog, setDialog] = useState(null);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        const handleDialog = (e) => {
            setDialog(e.detail);
            // Düzenleme akışlarında mevcut değer öntanımlı gelsin
            setInputValue(e.detail?.defaultValue ?? '');
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
        if (dialog.type === 'confirm') return <AlertTriangle size={18} className="text-amber-400" />;
        if (dialog.alertType === 'error') return <XCircle size={18} className="text-rose-400" />;
        if (dialog.alertType === 'success') return <CheckCircle2 size={18} className="text-emerald-400" />;
        return <Info size={18} className="text-blue-400" />;
    };

    return (
        <div className="fixed inset-0 z-[99999] pointer-events-none flex justify-center items-start pt-5">
            {/* Overlay for confirm/prompt to block interaction but keep it transparent */}
            {(dialog.type === 'confirm' || dialog.type === 'prompt') && (
                <div className="fixed inset-0 pointer-events-auto bg-black/5 backdrop-blur-[1px]" onClick={() => handleClose(false)}></div>
            )}
            
            <div 
                className="relative pointer-events-auto flex items-center gap-4 px-6 py-3 bg-white/85 backdrop-blur-xl text-gray-800 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/50 animate-in slide-in-from-top-5 fade-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3">
                    {getIcon()}
                    <span className="text-[15px] font-semibold tracking-tight max-w-[500px] truncate" title={cleanMessage}>
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
                        className="bg-gray-50 border border-gray-200 text-gray-800 text-[14px] px-3 py-1.5 rounded-lg outline-none focus:border-blue-500 w-64"
                        placeholder="..."
                    />
                )}

                <div className="flex items-center gap-2 ml-2 border-l border-gray-200 pl-4">
                    {dialog.type === 'alert' ? (
                        <button 
                            onClick={() => handleClose(true)} 
                            className="text-[13px] font-bold px-5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full transition-colors"
                        >
                            Tamam
                        </button>
                    ) : dialog.type === 'prompt' ? (
                        <>
                            <button onClick={() => handleClose(false)} className="text-[13px] font-semibold px-4 py-2 text-gray-500 hover:text-gray-800 transition-colors">İptal</button>
                            <button onClick={() => handleClose(inputValue)} className="text-[13px] font-bold px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors">Kaydet</button>
                        </>
                    ) : (
                        // Confirm
                        <>
                            <button onClick={() => handleClose(false)} className="text-[13px] font-semibold px-4 py-2 text-gray-500 hover:text-gray-800 transition-colors">İptal</button>
                            <button onClick={() => handleClose(true)} className="text-[13px] font-bold px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors">Evet</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GlobalDialogs;
