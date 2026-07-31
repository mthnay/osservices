import React from 'react';
import { Sparkles, Check, ArrowRight, Info, AlertCircle, Wrench } from 'lucide-react';

const AISuggestionCard = ({ diagnosis, onApply, onClose }) => {
    if (!diagnosis) return null;

    return (
        <div className="mt-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 shadow-xl">
                {/* AI Badge */}
                <div className="absolute top-0 right-0 p-4">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-200">
                        <Sparkles size={12} className="text-white animate-pulse" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Apple Intelligence Suggestion</span>
                    </div>
                </div>

                <div className="p-6 pt-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Side: Analysis */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <AlertCircle size={14} /> Olası Nedenler
                                </h4>
                                <ul className="space-y-2">
                                    {diagnosis.likelyCauses?.map((cause, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 font-medium">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                                            {cause}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Info size={14} /> Çözüm Adımları
                                </h4>
                                <ul className="space-y-2">
                                    {diagnosis.steps?.map((step, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 font-medium">
                                            <span className="text-indigo-500 font-bold text-[10px] w-4">{i + 1}.</span>
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Right Side: Recommended Parts & Tech Note */}
                        <div className="space-y-4">
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-blue-50 shadow-sm">
                                <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Wrench size={14} /> Önerilen Parçalar
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {diagnosis.suggestedParts?.map((part, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-100 flex items-center gap-1">
                                            <Check size={10} /> {part}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-900 rounded-xl p-4 shadow-lg">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Taslak Teknisyen Notu</h4>
                                <p className="text-sm text-gray-200 leading-relaxed italic">
                                    "{diagnosis.techNote}"
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-6 pt-6 border-t border-blue-100/50 flex items-center justify-between">
                        <p className="text-[10px] text-gray-400 font-medium italic">
                            * Bu analiz yapay zeka tarafından oluşturulmuştur. Lütfen nihai kararı teknik inceleme sonrası veriniz.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={onClose}
                                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                Yoksay
                            </button>
                            <button 
                                onClick={() => onApply(diagnosis)}
                                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-105 active:scale-95 transition-all"
                            >
                                Öneriyi Uygula <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AISuggestionCard;
