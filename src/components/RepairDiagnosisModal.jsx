import React, { useEffect, useId, useRef } from 'react';
import { X, Wrench } from 'lucide-react';
import RepairDiagnosisPanel from './RepairDiagnosisPanel';

/**
 * Teşhis akışının tek başına diyalog olarak kullanılan hâli.
 * Servis inceleme ekranı içinden açıldığında bunun yerine RepairDiagnosisPanel
 * doğrudan sayfa içine gömülür (bkz. RepairHistoryModal).
 */
const RepairDiagnosisModal = ({ repair, onClose, onSave }) => {
    const uid = useId();
    const dialogRef = useRef(null);

    // Odak yalnızca açılışta alınır; [onClose] bağımlılığı olsaydı üst bileşenin
    // her render'ında odak diyaloğa geri çekilip form girişi kesilirdi.
    useEffect(() => { dialogRef.current?.focus(); }, []);

    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') closeRef.current?.();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    if (!repair) return null;

    return (
        <div className="modal-overlay">
            <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${uid}-title`}
                className="modal-content w-full max-w-4xl flex flex-col max-h-[92vh] outline-none"
            >
                <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#1d1d1f] text-white flex items-center justify-center shrink-0">
                            <Wrench size={20} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                            <h2 id={`${uid}-title`} className="text-[17px] font-semibold text-[#1d1d1f] truncate">
                                Teknik İnceleme & Teşhis
                            </h2>
                            <p className="text-[12px] text-gray-500 truncate">
                                {repair.device} · {repair.customer}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-[#f5f5f7] flex items-center justify-center shrink-0 transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#0071e3]/25"
                    >
                        <X size={18} aria-hidden="true" />
                        <span className="sr-only">Teşhis ekranını kapat</span>
                    </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar bg-[#f5f5f7]">
                    <RepairDiagnosisPanel repair={repair} onSave={onSave} onCancel={onClose} />
                </div>
            </div>
        </div>
    );
};

export default RepairDiagnosisModal;
