import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, CheckCircle } from 'lucide-react';
import MyPhoneIcon from './LocalIcons';
import { useAppContext } from '../context/AppContext';
import { getArcOutcome } from '../utils/arcOutcome';
import { QUOTE_DECISION_LABELS, QUOTE_REJECTED, formatQuoteAmount } from '../utils/quoteFlow';

const DeliveryFormPrint = ({ repair, signature, onClose }) => {
    const componentRef = useRef();
    // Hizmet sözleşmesi ve kurumsal kimlik, servis kabul formuyla aynı
    // kaynaktan (Ayarlar) okunur; iki belge asla farklı metin göstermez.
    const { serviceTerms, companyProfile } = useAppContext();

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Teslimat_Formu_${repair?.id}`,
        onAfterPrint: () => onClose()
    });

    if (!repair) return null;

    const REPAIR_TYPE_LABELS = {
        'carry-in': 'Bizzat Teslim (Mağaza İçi)',
        'returnbefore': 'Değiştirmeden Önce İade',
        'mail-in': 'Bütün Birim Posta (Apple Merkezi)',
        'approval': 'Müşteri Onayı Bekleyen (Teklifli)',
        'service': 'Onarım Olmayan Servis',
        'direct-return': 'İşlemsiz İade'
    };

    const isReturned = repair.status?.includes('İade') || repair.repairClosingNote?.includes('İŞLEMSİZ İADE');
    const currentDate = new Date().toLocaleDateString('tr-TR');

    // Bütün Birim Posta akışında Onarım Merkezi sonucu müşteriye bu formda bildirilir
    const arc = repair.arcOutcome?.code ? repair.arcOutcome : null;
    const arcMeta = arc ? getArcOutcome(arc.code) : null;

    // Teklif verilip karara bağlandıysa müşteri formunda da yer alır
    const quote = repair.quote?.decision ? repair.quote : null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-md shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">

                {/* Ön İzleme Alanı */}
                <div ref={componentRef} className="print-container bg-white text-gray-900 font-sans">

                    {/* TEK SAYFA TESLİMAT VE İŞLEM DETAYLARI */}
                    <div className="print-page bg-white">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-[0.5px] border-gray-300 pb-2 mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded font-semibold text-xl">
                                    {companyProfile?.name?.[0] || 'T'}
                                </div>
                                <div>
                                    <h1 className="text-base font-bold tracking-tight text-black leading-none">{companyProfile?.name || 'TROY'}</h1>
                                    <p className="text-[7px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
                                        {isReturned ? 'Cihaz İade ve Teslimat Formu' : 'Onarım Tamamlama ve Teslimat Formu'}
                                    </p>
                                    <p className="text-[7.5px] text-gray-500 max-w-[350px] leading-none mt-0.5">
                                        {companyProfile?.title || 'ARTIBİLGİ TEKNOLOJİ BİLİŞİM VE DIŞ TİC. A.Ş.'} | {companyProfile?.address || 'Bağdat Caddesi No:123, 34728 Kadıköy / İstanbul'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block ${isReturned ? 'bg-orange-600' : 'bg-green-600'} text-white px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider leading-none shadow-sm`}>
                                    {isReturned ? 'İşlemsiz İade' : 'Onarım Tamamlandı'}
                                </span>
                                <h2 className="text-lg font-mono font-bold text-black tracking-tight mt-0.5">#{repair.id}-OUT</h2>
                                <p className="text-[7px] text-gray-500 uppercase mt-0.5">Teslim: <span className="font-bold text-black">{currentDate}</span></p>
                            </div>
                        </div>

                        {/* Bilgi Grid */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-2">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-700">
                                Müşteri ve Ürün Bilgileri
                            </div>
                            <div className="grid grid-cols-4 text-[9.5px]">
                                {/* Satır 1 */}
                                <div className="col-span-2 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">MÜŞTERİ ADI SOYADI</span>
                                    <span className="font-semibold text-gray-900">{repair.customer}</span>
                                </div>
                                <div className="border-r-[0.5px] border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">TELEFON</span>
                                    <span className="font-semibold text-gray-900">{repair.customerPhone}</span>
                                </div>
                                <div className="border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">E-POSTA</span>
                                    <span className="font-semibold text-gray-900 truncate block lowercase">{repair.customerEmail || '-'}</span>
                                </div>

                                {/* Satır 2 */}
                                <div className="col-span-1 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">T.C. KİMLİK / V.K.N.</span>
                                    <span className="font-semibold text-gray-900">{repair.tcNo || '-'}</span>
                                </div>
                                <div className="col-span-3 border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">ADRES</span>
                                    <span className="text-gray-700 leading-none block truncate">{repair.customerAddress || '-'}</span>
                                </div>

                                {/* Satır 3 */}
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">CİHAZ MODELİ</span>
                                    <span className="font-semibold text-blue-600">{repair.device}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">SERİ NUMARASI</span>
                                    <span className="font-mono font-semibold text-gray-900 uppercase truncate block">{repair.serialNumber || repair.serial || 'Belirtilmedi'}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">GARANTİ DURUMU</span>
                                    <span className="font-semibold text-gray-700 uppercase">{repair.warrantyStatus || 'Standart'}</span>
                                </div>
                                <div className="col-span-1 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">SERVİS YÖNTEMİ</span>
                                    <span className="font-semibold text-blue-600 truncate block">
                                        {REPAIR_TYPE_LABELS[repair.repairType] || '-'}
                                    </span>
                                </div>

                                {/* Satır 4 (IMEI Bilgileri) */}
                                {(repair.imei1 || repair.imei2) && (
                                    <>
                                        <div className="col-span-2 border-r-[0.5px] border-t-[0.5px] border-gray-300 p-1.5">
                                            <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">IMEI 1</span>
                                            <span className="font-mono text-gray-900">{repair.imei1 || '-'}</span>
                                        </div>
                                        <div className="col-span-2 border-t-[0.5px] border-gray-300 p-1.5">
                                            <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">IMEI 2</span>
                                            <span className="font-mono text-gray-900">{repair.imei2 || '-'}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Onarım Teklifi ve Müşteri Kararı */}
                        {quote?.decision && (
                            <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-2">
                                <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-700">
                                    Onarım Teklifi ve Müşteri Kararı
                                </div>
                                <div className="p-2 text-[9.5px] space-y-1.5">
                                    {quote.items?.length > 0 && (
                                        <table className="w-full text-left border-collapse text-[9px]">
                                            <thead>
                                                <tr className="border-b border-gray-200 text-gray-400 text-[7px] uppercase tracking-wider font-bold">
                                                    <th className="pb-0.5">KALEM</th>
                                                    <th className="pb-0.5 text-right">TUTAR</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {quote.items.map((item, i) => (
                                                    <tr key={i} className="text-gray-800">
                                                        <td className="py-1 font-medium">{item.name}</td>
                                                        <td className="py-1 text-right font-mono">{formatQuoteAmount(item.price)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    <div className="flex items-center justify-between border-t-[0.5px] border-gray-300 pt-1">
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500">Teklif Tutarı</span>
                                        <span className="font-bold text-gray-900 text-[11px]">{formatQuoteAmount(quote.amount ?? repair.quoteAmount)}</span>
                                    </div>

                                    <div className={`p-1.5 rounded border text-[9px] ${quote.decision === QUOTE_REJECTED
                                        ? 'bg-red-50 border-red-200 text-red-900'
                                        : 'bg-green-50/50 border-green-200 text-gray-900'}`}>
                                        <span className="font-bold">{QUOTE_DECISION_LABELS[quote.decision]}</span>
                                        {quote.rejectionReason && <span> — {quote.rejectionReason}</span>}
                                        {quote.decidedAt && (
                                            <span className="block text-[8px] text-gray-500 mt-0.5">Karar tarihi: {quote.decidedAt}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Onarım Merkezi Sonucu — müşteriye yönelik bildirim */}
                        {arc && (
                            <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-2">
                                <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-700">
                                    Apple Onarım Merkezi İşlem Sonucu
                                </div>
                                <div className="p-2 text-[9.5px] space-y-1.5">
                                    <div>
                                        <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">YAPILAN İŞLEM</span>
                                        <p className="font-semibold text-gray-900">{arc.label || arcMeta?.label}</p>
                                        {arcMeta?.customerText && (
                                            <p className="text-gray-700 leading-normal mt-0.5 text-[9px]">{arcMeta.customerText}</p>
                                        )}
                                    </div>

                                    {/* Cihaz kimliği değiştiyse müşteri teslim aldığı cihazı formda görür */}
                                    {arc.newSerial && (
                                        <div>
                                            <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">TESLİM EDİLEN CİHAZ KİMLİĞİ</span>
                                            <div className="grid grid-cols-3 gap-1.5 bg-[#fbfbfd] border-[0.5px] border-gray-200 rounded p-1.5">
                                                <div>
                                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase">Seri No</span>
                                                    <span className="font-mono font-semibold text-gray-900 uppercase">{arc.newSerial}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase">IMEI 1</span>
                                                    <span className="font-mono text-gray-900">{arc.newImei1 || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase">IMEI 2</span>
                                                    <span className="font-mono text-gray-900">{arc.newImei2 || '-'}</span>
                                                </div>
                                            </div>
                                            {arc.previousSerial && (
                                                <p className="text-[8px] text-gray-500 mt-0.5">
                                                    Kabulde teslim alınan cihazın seri numarası: <span className="font-mono">{arc.previousSerial}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {arc.replacedParts?.length > 0 && (
                                        <div>
                                            <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">MERKEZDE DEĞİŞEN PARÇALAR</span>
                                            <ul className="bg-[#fbfbfd] border-[0.5px] border-gray-200 rounded p-1.5 space-y-0.5">
                                                {arc.replacedParts.map((p, i) => (
                                                    <li key={i} className="flex items-center justify-between gap-2 text-[9px]">
                                                        <span className="text-gray-800 font-medium">{p.description}</span>
                                                        {p.partNumber && <span className="font-mono text-gray-500 uppercase">{p.partNumber}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {arc.report && (
                                        <div>
                                            <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">SERVİS SONUÇ RAPORU</span>
                                            <p className="p-1.5 bg-[#fbfbfd] rounded border-[0.5px] border-gray-200 text-gray-800 text-[9px] leading-normal whitespace-pre-wrap">
                                                {arc.report}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Yapılan Teknik İşlemler Paneli */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-2">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-700">
                                Uygulanan Teknik İşlemler ve Notlar
                            </div>
                            <div className="p-2 text-[9.5px] space-y-1.5">
                                {repair.tests && (
                                    <div>
                                        <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">TANI TESTLERİ & GÖZLEMLER</span>
                                        <p className="text-gray-800 leading-normal bg-[#fbfbfd] p-1.5 border-[0.5px] border-gray-200 rounded italic text-[9px]">
                                            "{repair.tests}"
                                        </p>
                                    </div>
                                )}

                                {repair.diagnosisNotes && (
                                    <div>
                                        <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                            {repair.diagnosisNotes.startsWith('DOA RAPORU:') ? 'RESMİ ARIZA RAPORU (DOA)' : 'TANI VE İNCELEME NOTU'}
                                        </span>
                                        <p className={`p-1.5 rounded border italic text-[9px] leading-normal ${repair.diagnosisNotes.startsWith('DOA RAPORU:') ? 'bg-red-50 text-red-900 border-red-200 font-bold' : 'bg-[#fbfbfd] text-gray-800 border-gray-200'}`}>
                                            "{repair.diagnosisNotes.replace('DOA RAPORU: ', '')}"
                                        </p>
                                    </div>
                                )}

                                {repair.repairClosingNote && (
                                    <div>
                                        <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">ONARIM TAMAMLAMA NOTU</span>
                                        <p className="p-1.5 bg-green-50/50 rounded border border-green-200 text-gray-900 font-semibold text-[9px] leading-normal italic">
                                            "{repair.repairClosingNote.replace(/\n\n\[İşlem Süresi: .*\]$/, '')}"
                                        </p>
                                    </div>
                                )}

                                {!repair.tests && !repair.diagnosisNotes && !repair.repairClosingNote && (
                                    <p className="text-[8.5px] text-gray-400 italic p-0.5">
                                        Cihazın bildirilen arızası giderilmiş, gerekli testler yapılarak standartlara uygun şekilde teslim edilmiştir.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Orijinal Parça Değişim Tablosu */}
                        {repair.parts && repair.parts.length > 0 && !isReturned && (
                            <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-2">
                                <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-700">
                                    Değişimi Yapılan Orijinal Parçalar
                                </div>
                                <div className="p-1.5">
                                    <table className="w-full text-left border-collapse text-[8.5px]">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-gray-400 text-[7px] uppercase tracking-wider font-bold">
                                                <th className="pb-0.5 w-6">#</th>
                                                <th className="pb-0.5">PARÇA TANIMI</th>
                                                <th className="pb-0.5">PARÇA NO (P/N)</th>
                                                {/* Bütün birim kayıtlarında seri numaraları cihaz bazlıdır */}
                                                <th className="pb-0.5">
                                                    {repair.parts.every(p => p.isWholeUnit) ? 'GELEN CİHAZ SERİ' : 'YENİ SERİ NO'}
                                                </th>
                                                <th className="pb-0.5">
                                                    {repair.parts.every(p => p.isWholeUnit) ? 'ARIZALI CİHAZ SERİ' : 'ESKİ SERİ NO'}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {repair.parts.map((part, index) => (
                                                <tr key={index} className="text-gray-800">
                                                    <td className="py-1 font-bold">{index + 1}</td>
                                                    <td className="py-1 uppercase font-semibold">{part.description}</td>
                                                    <td className="py-1 font-mono text-[8px] text-gray-500">{part.partNumber || 'N/A'}</td>
                                                    <td className="py-1 font-mono text-[8px] text-blue-600 font-semibold">
                                                        {(part.isWholeUnit ? part.replacementDeviceSerial : part.kgbSerial) || '-'}
                                                    </td>
                                                    <td className="py-1 font-mono text-[8px] text-gray-400">
                                                        {(part.isWholeUnit ? part.faultyDeviceSerial : part.kbbSerial) || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Finansal Detaylar */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-2">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-700">
                                Finansal Özet
                            </div>
                            <div className="p-2">
                                {(repair.quoteAmount || repair.cost) > 0 ? (
                                    <div className="flex justify-between items-center bg-gray-50 p-1.5 border-[0.5px] border-gray-200 rounded">
                                        <div>
                                            <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">TAHSİL EDİLEN TOPLAM TUTAR</span>
                                            <p className="text-[7.5px] text-gray-500 leading-tight">
                                                Onarım bedeli müşteri tarafından ödenmiş ve tahsilat kaydı yapılmıştır.
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-block text-[7.5px] font-bold bg-green-600 text-white px-1.5 py-0.2 rounded leading-none mr-2">ÖDEME ALINDI</span>
                                            <span className="text-base font-bold text-black">{parseFloat(repair.quoteAmount || repair.cost).toLocaleString('tr-TR')} ₺</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center bg-green-50/50 p-1.5 border-[0.5px] border-green-200 rounded text-green-800">
                                        <div>
                                            <span className="block text-[6.5px] font-bold text-green-600 uppercase tracking-wider">ÜCRETSİZ SERVİS İŞLEMİ</span>
                                            <p className="text-[7.5px] text-green-700/80 leading-tight">
                                                Garanti kapsamı veya Apple kalite programı dahilinde işlem yapıldığı için servis ücreti tahsil edilmemiştir.
                                            </p>
                                        </div>
                                        <span className="text-[8px] font-bold uppercase bg-green-600 text-white px-2 py-0.5 rounded leading-none shadow-sm">₺ 0,00</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Garanti ve Bilgilendirme (Üç Sütunlu Mikro Düzen) */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-2">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-700">
                                Onarım Sonrası Garanti ve Memnuniyet Bilgilendirmesi
                            </div>
                            <div className="p-2">
                                <div className="columns-3 gap-3 text-[5.8px] text-gray-500 text-justify leading-tight font-medium">
                                    <div>
                                        <h4 className="font-bold text-black mb-0.5 uppercase text-[6.5px]">1. İŞLEM & PARÇA GARANTİSİ</h4>
                                        <p>Uygulanan onarım işlemi ve değişen yedek parçalar, teslim tarihinden itibaren 90 gün servisimiz garantisi altındadır. Fiziksel hasar, sıvı teması ve yetkisiz müdahale durumunda garanti geçersiz kalır.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-black mb-0.5 uppercase text-[6.5px]">2. ARIZA TEKRARI DURUMU</h4>
                                        <p>Onarılan arızanın garanti süresi içinde tekrarlaması durumunda, kontrol yapılması için servis formunuzla başvurmanız gerekir. Farklı parçadan kaynaklanan arızalar ek ücrete tabidir.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-black mb-0.5 uppercase text-[6.5px]">3. IP SERTİFİKASI & İADE</h4>
                                        <p>Donanım müdahaleleri sonrası cihazın fabrika çıkışındaki su direnci garanti edilemez. Apple servis prosedürleri gereğince cihazdan sökülen arızalı eski parçalar üreticiye gönderilir, iade edilmez.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hizmet Sözleşmesi (Ayarlar > Servis Metinleri) — kabul formuyla aynı metin */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-2">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-700">
                                {serviceTerms?.termsTitle || 'GENEL HİZMET SÖZLEŞMESİ'}
                            </div>
                            <div className="p-2">
                                <div className="columns-3 gap-3 text-[5.8px] text-gray-500 text-justify leading-tight font-medium whitespace-pre-line">
                                    {serviceTerms?.termsContent || 'Hizmet sözleşmesi metni Ayarlar > Servis Metinleri ekranından tanımlanmamıştır.'}
                                </div>
                            </div>
                        </div>

                        {/* Memnuniyet / Google Review & Teslim Onayı */}
                        <div className="bg-[#f5f5f7] p-1.5 border-[0.5px] border-gray-300 rounded mb-2 text-[7.5px] text-gray-800 leading-tight">
                            <div className="flex justify-between items-center">
                                <p className="font-bold flex items-center gap-1">
                                    <CheckCircle size={8} className="text-green-600 flex-shrink-0" />
                                    Cihazımı çalışır ve hasarsız vaziyette, yapılan onarımı, garanti şartlarını ve yukarıdaki hizmet sözleşmesini kabul ederek teslim aldım.
                                </p>
                                <p className="text-[7px] text-gray-400 font-semibold italic ml-2">
                                    Bizi Google'da değerlendirmek için: <span className="text-blue-600 font-mono not-italic">google.com/maps/troy-servis</span> (★★★★★)
                                </p>
                            </div>
                            {serviceTerms?.kvkkText && (
                                <p className="text-gray-400 mt-0.5 text-[6.5px] leading-tight font-medium">
                                    {serviceTerms.kvkkText}
                                </p>
                            )}
                        </div>

                        {/* İmza Alanı */}
                        <div className="mt-auto grid grid-cols-2 gap-3 border-t-[0.5px] border-gray-300 pt-2">
                            <div className="border-[0.5px] border-gray-300 rounded p-1.5 bg-gray-50 flex flex-col justify-between h-[65px]">
                                <div>
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">TESLİM EDEN SERVİS YETKİLİSİ</span>
                                    <span className="text-[9px] font-semibold text-gray-900 block mt-0.5">TROY TEKNİK SERVİS</span>
                                    <span className="text-[7px] text-gray-400 block leading-tight">Mersis No: 06123456789</span>
                                </div>
                                <span className="text-[6.5px] text-gray-400 font-mono self-end">Troy Teknik Servis</span>
                            </div>

                            <div className="border-[0.5px] border-gray-300 rounded p-1.5 bg-gray-50 flex justify-between items-center h-[65px]">
                                <div className="flex-1 flex flex-col justify-between h-full">
                                    <div>
                                        <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">TESLİM ALAN MÜŞTERİ / İMZA</span>
                                        <span className="text-[9px] font-semibold text-gray-900 block mt-0.5 truncate max-w-[150px]">{repair.customer}</span>
                                    </div>
                                    <span className="text-[6.5px] text-gray-400 leading-none">Cihazını çalışır durumda teslim almıştır.</span>
                                </div>
                                <div className="w-[65px] h-full flex items-center justify-center bg-white border border-gray-200 rounded overflow-hidden">
                                    {signature ? (
                                        <img src={signature} alt="Müşteri İmzası" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                    ) : (
                                        <span className="text-[6.5px] text-gray-300 italic text-center p-1">Onaylandı</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-[#1d1d1f] flex justify-between items-center rounded-b-xl no-print border-t border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                            <span className="font-mono text-[10px]">A4</span>
                        </div>
                        <div className="text-white/40 text-[8px] font-mono uppercase tracking-wider leading-tight opacity-50">
                            APPLECARE SINGLE PAGE<br />
                            WO-ID: {repair.id}-OUT
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-white/40 hover:text-white rounded text-xs font-bold transition-all hover:bg-white/5">Kapat</button>
                        <button onClick={handlePrint} className="px-6 py-2 bg-white text-black hover:bg-gray-100 rounded text-xs font-semibold shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all flex items-center gap-1.5">
                            <Printer size={14} /> BELGELERİ YAZDIR
                        </button>
                    </div>
                </div>
            </div >

            <style>{`
                .print-page {
                    width: 100%;
                    max-width: 210mm;
                    margin: 0 auto;
                    background: white;
                    padding: 10mm 12mm;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }
                
                @media screen {
                    .print-container {
                        padding: 20px;
                        background-color: #f5f5f7;
                    }
                    .print-page {
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                        border-radius: 4px;
                        margin-bottom: 20px;
                        min-height: 296mm;
                    }
                }

                @media print {
                    @page { 
                        margin: 0; 
                        size: A4; 
                    }
                    body { 
                        background: white; 
                        -webkit-print-color-adjust: exact !important; 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                    }
                    .print-container { 
                        width: 100% !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        border: none !important; 
                        box-shadow: none !important; 
                    }
                    .print-page {
                        width: 210mm !important;
                        /* Sabit yükseklik, sözleşme metni uzadığında içeriği kırpıyordu.
                           min-height ile tek sayfa görünümü korunur, taşarsa ikinci
                           sayfaya akar. */
                        min-height: 296mm !important;
                        padding: 10mm 12mm !important;
                        page-break-after: avoid !important;
                        page-break-inside: auto !important;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    .no-print { 
                        display: none !important; 
                    }
                }

                .print-container {
                    font-smoothing: antialiased;
                    -webkit-font-smoothing: antialiased;
                }
            `}</style>
        </div >
    );
};

export default DeliveryFormPrint;
