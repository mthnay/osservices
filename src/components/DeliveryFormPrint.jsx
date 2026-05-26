import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, CheckCircle, User } from 'lucide-react';
import MyPhoneIcon from './LocalIcons';

const DeliveryFormPrint = ({ repair, signature, onClose }) => {
    const componentRef = useRef();

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

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-md shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">

                {/* Ön İzleme Alanı */}
                <div ref={componentRef} className="print-container bg-white text-gray-900 font-sans">

                    {/* SAYFA 1: TESLİMAT VE İŞLEM DETAYLARI */}
                    <div className="print-page bg-white">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-[0.5px] border-gray-300 pb-3 mb-3">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded font-semibold text-2xl">T</div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-black leading-none">TROY SERVİS</h1>
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                                        {isReturned ? 'Cihaz İade ve Teslimat Formu' : 'Onarım Tamamlama ve Teslimat Formu'}
                                    </p>
                                    <p className="text-[8px] text-gray-500 max-w-[320px] leading-tight mt-0.5">
                                        ARTIBİLGİ TEKNOLOJİ BİLİŞİM VE DIŞ TİC. A.Ş. | Bağdat Caddesi No:123, 34728 Kadıköy / İstanbul
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block ${isReturned ? 'bg-orange-600' : 'bg-green-600'} text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider leading-none shadow-sm`}>
                                    {isReturned ? 'İşlemsiz İade' : 'Onarım Tamamlandı'}
                                </span>
                                <h2 className="text-2xl font-mono font-bold text-black tracking-tight mt-0.5">#{repair.id}-OUT</h2>
                                <p className="text-[8px] text-gray-500 uppercase mt-0.5">Teslim Tarihi: <span className="font-bold text-black">{currentDate}</span></p>
                            </div>
                        </div>

                        {/* Bilgi Grid */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-3">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider text-gray-700">
                                Müşteri ve Ürün Bilgileri
                            </div>
                            <div className="grid grid-cols-4 text-[10px]">
                                {/* Satır 1 */}
                                <div className="col-span-2 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">MÜŞTERİ ADI SOYADI</span>
                                    <span className="font-semibold text-gray-900">{repair.customer}</span>
                                </div>
                                <div className="border-r-[0.5px] border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">TELEFON NUMARASI</span>
                                    <span className="font-semibold text-gray-900">{repair.customerPhone}</span>
                                </div>
                                <div className="border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">E-POSTA ADRESİ</span>
                                    <span className="font-semibold text-gray-900 truncate block lowercase">{repair.customerEmail || '-'}</span>
                                </div>

                                {/* Satır 2 */}
                                <div className="col-span-1 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">T.C. KİMLİK / V.K.N.</span>
                                    <span className="font-semibold text-gray-900">{repair.tcNo || '-'}</span>
                                </div>
                                <div className="col-span-3 border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">ADRES</span>
                                    <span className="text-gray-700 leading-tight block truncate">{repair.customerAddress || '-'}</span>
                                </div>

                                {/* Satır 3 */}
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">CİHAZ MODELİ</span>
                                    <span className="font-semibold text-blue-600">{repair.device}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">SERİ NUMARASI</span>
                                    <span className="font-mono font-semibold text-gray-900 uppercase truncate block">{repair.serialNumber || repair.serial || 'Belirtilmedi'}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">GARANTİ DURUMU</span>
                                    <span className="font-semibold text-gray-700 uppercase">{repair.warrantyStatus || 'Standart'}</span>
                                </div>
                                <div className="col-span-1 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">SERVİS YÖNTEMİ</span>
                                    <span className="font-semibold text-blue-600 truncate block">
                                        {REPAIR_TYPE_LABELS[repair.repairType] || '-'}
                                    </span>
                                </div>

                                {/* Satır 4 (IMEI ve Ekstra Bilgiler) */}
                                {(repair.imei1 || repair.imei2) && (
                                    <>
                                        <div className="col-span-2 border-r-[0.5px] border-t-[0.5px] border-gray-300 p-2">
                                            <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">IMEI 1</span>
                                            <span className="font-mono text-gray-900">{repair.imei1 || '-'}</span>
                                        </div>
                                        <div className="col-span-2 border-t-[0.5px] border-gray-300 p-2">
                                            <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">IMEI 2</span>
                                            <span className="font-mono text-gray-900">{repair.imei2 || '-'}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Yapılan Teknik İşlemler Paneli */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-3">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider text-gray-700">
                                Uygulanan Teknik İşlemler ve Notlar
                            </div>
                            <div className="p-3 text-[10px] space-y-2">
                                {repair.tests && (
                                    <div>
                                        <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">TANI TESTLERİ & GÖZLEMLER</span>
                                        <p className="text-gray-800 leading-normal bg-[#fbfbfd] p-2 border-[0.5px] border-gray-200 rounded italic text-[9px]">
                                            "{repair.tests}"
                                        </p>
                                    </div>
                                )}

                                {repair.diagnosisNotes && (
                                    <div>
                                        <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                            {repair.diagnosisNotes.startsWith('DOA RAPORU:') ? 'RESMİ ARIZA RAPORU (DOA)' : 'TANI VE İNCELEME NOTU'}
                                        </span>
                                        <p className={`p-2 rounded border italic text-[9px] leading-normal ${repair.diagnosisNotes.startsWith('DOA RAPORU:') ? 'bg-red-50 text-red-900 border-red-200 font-bold' : 'bg-[#fbfbfd] text-gray-800 border-gray-200'}`}>
                                            "{repair.diagnosisNotes.replace('DOA RAPORU: ', '')}"
                                        </p>
                                    </div>
                                )}

                                {repair.repairClosingNote && (
                                    <div>
                                        <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">ONARIM TAMAMLAMA NOTU</span>
                                        <p className="p-2 bg-green-50/50 rounded border border-green-200 text-gray-900 font-semibold text-[9.5px] leading-normal italic">
                                            "{repair.repairClosingNote.replace(/\n\n\[İşlem Süresi: .*\]$/, '')}"
                                        </p>
                                    </div>
                                )}

                                {!repair.tests && !repair.diagnosisNotes && !repair.repairClosingNote && (
                                    <p className="text-[9px] text-gray-400 italic p-1">
                                        Cihazın bildirilen arızası giderilmiş, gerekli testler yapılarak standartlara uygun şekilde teslim edilmiştir.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Orijinal Parça Değişim Tablosu */}
                        {repair.parts && repair.parts.length > 0 && !isReturned && (
                            <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-3">
                                <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider text-gray-700">
                                    Değişimi Yapılan Orijinal Parçalar
                                </div>
                                <div className="p-2">
                                    <table className="w-full text-left border-collapse text-[9px]">
                                        <thead>
                                            <tr className="border-b border-gray-200 text-gray-400 text-[7.5px] uppercase tracking-wider font-bold">
                                                <th className="pb-1 w-8">#</th>
                                                <th className="pb-1">PARÇA TANIMI</th>
                                                <th className="pb-1">PARÇA NO (P/N)</th>
                                                <th className="pb-1">YENİ SERİ NUMARASI</th>
                                                <th className="pb-1">ESKİ SERİ NUMARASI</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {repair.parts.map((part, index) => (
                                                <tr key={index} className="text-gray-800">
                                                    <td className="py-1.5 font-bold">{index + 1}</td>
                                                    <td className="py-1.5 uppercase font-semibold">{part.description}</td>
                                                    <td className="py-1.5 font-mono text-[8.5px] text-gray-500">{part.partNumber || 'N/A'}</td>
                                                    <td className="py-1.5 font-mono text-[8.5px] text-blue-600 font-semibold">{part.kgbSerial || '-'}</td>
                                                    <td className="py-1.5 font-mono text-[8.5px] text-gray-400">{part.kbbSerial || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Finansal Detaylar */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-3">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider text-gray-700">
                                Finansal Özet
                            </div>
                            <div className="p-3">
                                {(repair.quoteAmount || repair.cost) > 0 ? (
                                    <div className="flex justify-between items-center bg-gray-50 p-2 border-[0.5px] border-gray-200 rounded">
                                        <div>
                                            <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">TAHSİL EDİLEN TOPLAM TUTAR</span>
                                            <p className="text-[8px] text-gray-500 leading-tight">
                                                Onarım bedeli müşteri tarafından ödenmiş ve tahsilat kaydı yapılmıştır.
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-block text-[8px] font-bold bg-green-600 text-white px-2 py-0.5 rounded leading-none mr-2">ÖDEME ALINDI</span>
                                            <span className="text-lg font-bold text-black">{parseFloat(repair.quoteAmount || repair.cost).toLocaleString('tr-TR')} ₺</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center bg-green-50/50 p-2 border-[0.5px] border-green-200 rounded text-green-800">
                                        <div>
                                            <span className="block text-[7px] font-bold text-green-600 uppercase tracking-wider">ÜCRETSİZ SERVİS İŞLEMİ</span>
                                            <p className="text-[8px] text-green-700/80 leading-tight">
                                                Garanti kapsamı veya Apple kalite programı dahilinde işlem yapıldığı için herhangi bir servis ücreti tahsil edilmemiştir.
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold uppercase bg-green-600 text-white px-2 py-0.5 rounded shadow-sm">₺ 0,00</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* İmza Alanı */}
                        <div className="mt-auto grid grid-cols-2 gap-4 border-t-[0.5px] border-gray-300 pt-3">
                            <div className="border-[0.5px] border-gray-300 rounded p-2 bg-gray-50 flex flex-col justify-between h-[75px]">
                                <div>
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">TESLİM EDEN SERVİS YETKİLİSİ</span>
                                    <span className="text-[9.5px] font-semibold text-gray-900 block mt-0.5">TROY TEKNİK SERVİS</span>
                                    <span className="text-[7.5px] text-gray-400 block leading-tight">Mersis No: 06123456789</span>
                                </div>
                                <span className="text-[7px] text-gray-400 font-mono self-end">Troy Teknik Servis</span>
                            </div>

                            <div className="border-[0.5px] border-gray-300 rounded p-2 bg-gray-50 flex justify-between items-center h-[75px]">
                                <div className="flex-1 flex flex-col justify-between h-full">
                                    <div>
                                        <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">TESLİM ALAN MÜŞTERİ / İMZA</span>
                                        <span className="text-[9.5px] font-semibold text-gray-900 block mt-0.5 truncate max-w-[150px]">{repair.customer}</span>
                                    </div>
                                    <span className="text-[7px] text-gray-400 leading-none">Cihazını çalışır durumda teslim almıştır.</span>
                                </div>
                                <div className="w-[75px] h-full flex items-center justify-center bg-white border border-gray-200 rounded overflow-hidden">
                                    {signature ? (
                                        <img src={signature} alt="Müşteri İmzası" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                    ) : (
                                        <span className="text-[7px] text-gray-300 italic text-center p-1">Onaylandı</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAYFA 2: GARANTİ VE BİLGİLENDİRME */}
                    <div className="print-page bg-white text-gray-900">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b-[0.5px] border-gray-300">
                            <div className="h-4 w-1 bg-green-500 rounded-full"></div>
                            <div>
                                <h2 className="text-sm font-bold text-black uppercase tracking-tight">Onarım Sonrası Garanti ve Bilgilendirme</h2>
                                <p className="text-[7px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Lütfen bu belgeyi garanti süresince özenle saklayınız.</p>
                            </div>
                        </div>

                        {/* Garanti Şartları Sütunları */}
                        <div className="columns-2 gap-4 text-[7px] text-gray-600 text-justify leading-relaxed font-medium mb-3">
                            <section className="break-inside-avoid mb-2">
                                <h3 className="font-bold text-black mb-0.5 uppercase text-[8px] flex items-center gap-1">
                                    <div className="w-1 h-1 bg-green-500 rounded-full"></div> 1. İŞLEM VE PARÇA GARANTİSİ
                                </h3>
                                <p className="opacity-95">Cihazınıza uygulanan bu onarım işlemi ve değişen tüm orijinal yedek parçalar, teslim tarihinden itibaren 90 (doksan) gün boyunca Troy Teknik Servis garantisi altındadır. Garanti kapsamında işlem yapılabilmesi için cihazın darbe almamış, sıvı temasına maruz kalmamış ve Troy dışındaki bir birim/şahıs tarafından açılmamış olması şarttır.</p>
                            </section>

                            <section className="break-inside-avoid mb-2">
                                <h3 className="font-bold text-black mb-0.5 uppercase text-[8px] flex items-center gap-1">
                                    <div className="w-1 h-1 bg-green-500 rounded-full"></div> 2. ARIZA TEKRARI DURUMU
                                </h3>
                                <p className="opacity-95">Onarılan arızanın garanti süresi içinde tekrarlaması durumunda, cihazın öncelikli olarak kontrol edilmesi için servis formunuzla birlikte merkezimize başvurmanız gerekmektedir. Kontrollerde arızanın farklı bir parçadan kaynaklandığı tespit edilirse ek ücret çıkarılabilir.</p>
                            </section>

                            <section className="break-inside-avoid mb-2">
                                <h3 className="font-bold text-black mb-0.5 uppercase text-[8px] flex items-center gap-1">
                                    <div className="w-1 h-1 bg-green-500 rounded-full"></div> 3. IP SERTİFİKASI
                                </h3>
                                <p className="opacity-95">Ekranda veya kasada yapılan donanım müdahaleleri sonrası cihazın fabrika çıkışındaki su ve toz direnci (IP67/IP68) garanti edilemez. Onarım sırasında sızdırmazlık bantları yenilense dahi cihazın sıvıya maruz bırakılmaması önerilir.</p>
                            </section>

                            <section className="break-inside-avoid mb-2">
                                <h3 className="font-bold text-black mb-0.5 uppercase text-[8px] flex items-center gap-1">
                                    <div className="w-1 h-1 bg-green-500 rounded-full"></div> 4. YEDEK PARÇA İADESİ
                                </h3>
                                <p className="opacity-95">Apple servis kuralları gereğince, onarım sırasında cihazdan çıkarılan 'bozuk/hasarlı' tüm parçalar bertaraf edilmek üzere geri dönüşüme gönderilir. Çıkan parçaların müşteriye iadesi yapılmamaktadır.</p>
                            </section>
                        </div>

                        {/* Memnuniyet ve Google Review */}
                        <div className="p-3 bg-[#f5f5f7] rounded border-[0.5px] border-gray-300 flex flex-col items-center text-center mb-4">
                            <h4 className="text-[11px] font-bold text-black uppercase tracking-tight mb-1">Memnuniyetiniz Bizim İçin Değerli</h4>
                            <p className="text-[8px] text-gray-500 mb-2 max-w-md font-medium leading-tight">
                                Deneyiminizi iyileştirmek için çalışıyoruz. Aldığınız hizmeti değerlendirmek için aşağıdaki kanaldan bizlere ulaşabilirsiniz.
                            </p>
                            <div className="flex gap-2 mb-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="text-amber-400 text-xs">★</div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded border border-gray-200">
                                <span className="text-[7.5px] font-bold text-gray-400 uppercase tracking-wider">Bizi Google'da Değerlendirin:</span>
                                <span className="text-[8px] font-bold text-blue-600 font-mono">google.com/maps/troy-servis</span>
                            </div>
                        </div>

                        {/* Onay Bildirimi */}
                        <div className="bg-[#f5f5f7] p-2 border-[0.5px] border-gray-300 rounded mb-4 flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center text-green-500 border border-gray-200">
                                <CheckCircle size={14} />
                            </div>
                            <p className="text-[8.5px] font-bold text-gray-900 leading-tight">
                                Cihazımı çalışır ve hasarsız vaziyette, yapılan onarımı ve garanti şartlarını kabul ederek teslim aldım.
                            </p>
                        </div>

                        {/* İmza Alanı Sayfa 2 */}
                        <div className="mt-auto grid grid-cols-2 gap-6 pt-3 border-t-[0.5px] border-gray-300 px-4">
                            <div className="text-center">
                                <span className="block text-[7.5px] font-bold text-gray-400 uppercase tracking-wider mb-2">SERVİS YETKİ ONAYI</span>
                                <div className="w-14 h-14 bg-gray-50 border border-gray-200 flex items-center justify-center rounded font-bold mx-auto mb-1 text-xl text-gray-300 opacity-60">T</div>
                                <span className="text-[8.5px] font-bold text-gray-700 tracking-tight block">TROY TEKNİK SERVİS</span>
                            </div>
                            <div className="text-center flex flex-col items-center">
                                <span className="block text-[7.5px] font-bold text-gray-400 uppercase tracking-wider mb-2">MÜŞTERİ ONAYI (İMZA)</span>
                                <div className="h-14 w-full flex items-center justify-center relative bg-gray-50 border border-dashed border-gray-200 rounded">
                                    {signature ? (
                                        <img src={signature} alt="Müşteri İmzası" className="h-[120%] object-contain mix-blend-multiply scale-110 transform -rotate-1" />
                                    ) : (
                                        <div className="h-px w-[60%] bg-gray-300 mt-6"></div>
                                    )}
                                </div>
                                <span className="text-[9.5px] font-bold text-gray-900 uppercase mt-1 block">{repair.customer}</span>
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
                            APPLECARE INSPIRED FORM<br />
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
                    padding: 12mm;
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
                        height: 296mm !important;
                        padding: 12mm !important;
                        page-break-after: always !important;
                        page-break-inside: avoid !important;
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
