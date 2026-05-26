import { useAppContext } from '../context/AppContext';
import html2pdf from 'html2pdf.js';
import { Mail, Loader2, Printer, CheckCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Swal from 'sweetalert2';

const ServiceFormPrint = ({ formData, repairId, onClose }) => {
    const componentRef = useRef();
    const { emailSettings, companyProfile, API_URL, serviceTerms } = useAppContext();
    const [sendingEmail, setSendingEmail] = useState(false);

    // Güvenli yazdırma fonksiyonu
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Servis_Formu_${repairId}`,
        onAfterPrint: () => onClose() // Yazdırma bitince modalı kapat
    });

    const handleSendEmail = async () => {
        if (!emailSettings?.user || !emailSettings?.pass) {
            Swal.fire({
                title: 'E-posta Ayarları Eksik!',
                text: 'E-posta ayarları yapılmamış. Lütfen ayarlardan e-posta bilgilerinizi giriniz.',
                icon: 'warning',
                confirmButtonColor: '#007aff',
                returnFocus: false
            });
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 saniye sonra iptal et

        try {
            setSendingEmail(true);
            // 1. PDF Oluştur
            const element = componentRef.current;
            const opt = {
                margin: 0,
                filename: `Servis_Formu_${repairId}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const htmlString = element.outerHTML;
            const pdfBase64 = await html2pdf().set(opt).from(htmlString).outputPdf('datauristring');

            // 2. Backend'e Gönder
            const res = await fetch(`${API_URL}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    to: formData.customerEmail,
                    subject: `Servis Kaydı Oluşturuldu - Takip No: ${repairId}`,
                    body: `Sayın ${formData.customerName},\n\nCihazınız servisimize kabul edilmiştir. Servis formunuz PDF formatında ektedir.\n\nTakip Numaranız: ${repairId}\nCihaz Durumu: Beklemede\n\nİyi günler dileriz.`,
                    auth: {
                        user: emailSettings.user,
                        pass: emailSettings.pass,
                        host: emailSettings.host,
                        port: emailSettings.port
                    },
                    pdfData: pdfBase64,
                    pdfName: `Servis_Formu_${repairId}.pdf`
                })
            });

            clearTimeout(timeoutId);
            const result = await res.json();
            if (result.success) {
                await Swal.fire({
                    title: 'Başarılı!',
                    text: 'E-posta ve servis formu başarıyla müşteriye gönderildi.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    returnFocus: false
                });
                onClose();
            } else {
                throw new Error(result.message || 'Sunucu hatası');
            }

        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Email send error:', error);
            const isTimeout = error.name === 'AbortError';
            await Swal.fire({
                title: isTimeout ? 'Zaman Aşımı' : 'Gönderilemedi',
                text: isTimeout ? 'E-posta gönderimi çok uzun sürdü. Lütfen internetinizi kontrol edip tekrar deneyin.' : error.message,
                icon: 'error',
                confirmButtonColor: '#007aff',
                returnFocus: false
            });
        } finally {
            setSendingEmail(false);
        }
    };

    const REPAIR_TYPE_LABELS = {
        'carry-in': 'Bizzat Teslim (Mağaza İçi)',
        'returnbefore': 'Değiştirmeden Önce İade',
        'mail-in': 'Bütün Birim Posta (Apple Merkezi)',
        'approval': 'Müşteri Onayı Bekleyen (Teklifli)',
        'service': 'Onarım Olmayan Servis',
        'direct-return': 'İşlemsiz İade'
    };

    const currentDate = new Date().toLocaleDateString('tr-TR');

    return (
        <div className="modal-overlay">
            <div className="modal-content w-full max-w-4xl flex flex-col max-h-[90vh] overflow-y-auto">
                
                {/* Ön İzleme Alanı */}
                <div ref={componentRef} className="print-container bg-white text-gray-900 font-sans">
                    
                    {/* TEK SAYFA SERVİS KABUL FORMU */}
                    <div className="print-page bg-white">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-[0.5px] border-gray-300 pb-2 mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded font-semibold text-xl">
                                    {companyProfile?.name?.[0] || 'T'}
                                </div>
                                <div>
                                    <h1 className="text-base font-bold tracking-tight text-black leading-none">{companyProfile?.name || 'TROY'}</h1>
                                    <p className="text-[7px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">Yetkili Servis Sağlayıcısı</p>
                                    <p className="text-[7.5px] text-gray-500 max-w-[350px] leading-none mt-0.5">
                                        {companyProfile?.title || 'ARTIBİLGİ TEKNOLOJİ BİLİŞİM VE DIŞ TİC. A.Ş.'} | {companyProfile?.address || 'Bağdat Caddesi No:123, 34728 Kadıköy / İstanbul'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="border-[0.5px] border-gray-300 p-0.5 bg-white">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(window.location.origin + '?track=' + repairId)}&bgcolor=ffffff&color=000000&margin=1`} 
                                        alt="Sorgulama QR" 
                                        className="w-10 h-10"
                                    />
                                </div>
                                <div className="text-right">
                                    <span className="inline-block bg-black text-white px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider leading-none">Servis Kabul Formu</span>
                                    <h2 className="text-lg font-mono font-bold text-black tracking-tight mt-0.5">#{repairId}</h2>
                                    <p className="text-[7px] text-gray-500 uppercase mt-0.5">Kabul: <span className="font-bold text-black">{currentDate}</span></p>
                                </div>
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
                                    <span className="font-semibold text-gray-900">{formData.customerName}</span>
                                </div>
                                <div className="border-r-[0.5px] border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">TELEFON</span>
                                    <span className="font-semibold text-gray-900">{formData.customerPhone}</span>
                                </div>
                                <div className="border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">E-POSTA ADRESİ</span>
                                    <span className="font-semibold text-gray-900 truncate block lowercase">{formData.customerEmail || '-'}</span>
                                </div>

                                {/* Satır 2 */}
                                <div className="col-span-1 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">T.C. KİMLİK / V.K.N.</span>
                                    <span className="font-semibold text-gray-900">{formData.customerTC || '-'}</span>
                                </div>
                                <div className="col-span-3 border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">ADRES</span>
                                    <span className="text-gray-700 leading-none block truncate">{formData.customerAddress || 'Belirtilmedi'}</span>
                                </div>

                                {/* Satır 3 */}
                                <div className="col-span-1 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">CİHAZ MODELİ</span>
                                    <span className="font-semibold text-blue-600">{formData.deviceModel}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">CİHAZ TÜRÜ</span>
                                    <span className="font-semibold text-gray-900 uppercase">{formData.productGroup || '-'}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">SERİ NUMARASI</span>
                                    <span className="font-mono font-semibold text-gray-900 uppercase">{formData.serialNumber}</span>
                                </div>
                                <div className="col-span-1 border-b-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">GARANTİ DURUMU</span>
                                    <span className="font-semibold text-gray-900 uppercase">{formData.warrantyStatus}</span>
                                </div>

                                {/* Satır 4 */}
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">IMEI 1</span>
                                    <span className="font-mono text-gray-900">{formData.imei1 || '-'}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">IMEI 2</span>
                                    <span className="font-mono text-gray-900">{formData.imei2 || '-'}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">BUL (FMI)</span>
                                    <span className={`inline-block px-1.5 py-0.2 rounded text-[7.5px] font-bold text-white leading-none ${formData.findMyOff ? 'bg-green-600' : 'bg-red-600'}`}>
                                        {formData.findMyOff ? 'KAPALI' : 'AÇIK'}
                                    </span>
                                </div>
                                <div className="col-span-1 p-1.5">
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">SERVİS YÖNTEMİ</span>
                                    <span className="font-semibold text-blue-600 truncate block">
                                        {REPAIR_TYPE_LABELS[formData.repairType] || '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Arıza ve Gözlemler */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-2">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-700">
                                Şikayet ve Fiziksel Durum Analizi
                            </div>
                            <div className="p-2 text-[9.5px] space-y-1.5">
                                <div>
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">MÜŞTERİ BEYANI / BİLDİRİLEN ARIZA</span>
                                    <p className="text-gray-800 leading-normal bg-[#fbfbfd] p-1.5 border-[0.5px] border-gray-200 rounded italic text-[9px]">
                                        "{formData.issueDescription || 'Cihazın bildirilen bir arızası bulunmamaktadır.'}"
                                    </p>
                                </div>

                                {formData.notes && formData.notes.toUpperCase().includes('DOA RAPORU:') && (
                                    <div className="p-1.5 bg-red-50 border-[0.5px] border-red-200 rounded">
                                        <span className="block text-[6.5px] font-black text-red-700 uppercase tracking-wider mb-0.5">YETKİLİ SERVİS DOA RAPORU</span>
                                        <p className="text-red-900 leading-normal font-bold italic text-[9px]">
                                            "{formData.notes.replace(/DOA RAPORU:/i, '').trim()}"
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">FİZİKSEL DURUM VE AKSESUARLAR</span>
                                    <div className="flex flex-wrap gap-1">
                                        {formData.visualCondition && formData.visualCondition.length > 0 ? (
                                            formData.visualCondition.map(item => (
                                                <span key={item} className="px-1.5 py-0.2 bg-gray-100 border border-gray-200 rounded text-[7px] font-semibold text-gray-700 uppercase leading-tight">
                                                    {item}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[8.5px] text-gray-400 italic">Kusurlu fiziksel durum veya aksesuar bildirilmedi.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Finansal Bilgiler */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-2">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-700">
                                Mali Durum ve Tahmini Onarım Bedeli
                            </div>
                            <div className="p-2">
                                {formData.estimatedCost > 0 ? (
                                    <div className="flex justify-between items-center bg-gray-50 p-1.5 border-[0.5px] border-gray-200 rounded">
                                        <div className="max-w-[70%]">
                                            <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">TAHMİNİ HİZMET VE ONARIM BEDELİ (KDV DAHİL)</span>
                                            <p className="text-[7.5px] text-gray-500 leading-tight">
                                                Müşteri, yukarıda belirtilen arızanın giderilmesi için öngörülen tutarı onaylamıştır. Bu tutar %20 KDV dahil son fiyattır.
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">TOPLAM ONAYLANAN TUTAR</span>
                                            <span className="text-base font-bold text-black">{parseFloat(formData.estimatedCost).toLocaleString('tr-TR')} ₺</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center bg-green-50/50 p-1.5 border-[0.5px] border-green-200 rounded text-green-800">
                                        <div>
                                            <span className="block text-[6.5px] font-bold text-green-600 uppercase tracking-wider">GARANTİ KAPSAMI İŞLEM</span>
                                            <p className="text-[7.5px] text-green-700/80 leading-tight">
                                                Cihazınız garanti kapsamında veya Apple kalite programları kapsamında incelenecektir. Ön değerlendirmede servis ücreti çıkmamıştır.
                                            </p>
                                        </div>
                                        <span className="text-[8px] font-bold uppercase bg-green-600 text-white px-2 py-0.5 rounded leading-none shadow-sm">ÜCRETSİZ İŞLEM</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hizmet Sözleşmesi ve Şartlar (Üç Sütunlu Mikro Düzen) */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-2">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gray-700">
                                {serviceTerms?.termsTitle || 'TROY TEKNİK SERVİS GENEL HİZMET SÖZLEŞMESİ'}
                            </div>
                            <div className="p-2">
                                <div className="columns-3 gap-3 text-[5.8px] text-gray-500 text-justify leading-tight font-medium whitespace-pre-line">
                                    {serviceTerms?.termsContent || `1. GENEL HÜKÜMLER: Cihazın teslim alınması onarımın kabul edildiği anlamına gelmez. Ön inceleme sonrası nihai servis kaydı oluşturulur. Cihazla birlikte verilmeyen aksesuarların kaybından servis sorumlu tutulamaz.
2. VERİ GÜVENLİĞİ VE YEDEKLER: Servis işlemleri esnasında veri silinmesi veya kalıcı kaybı riski mevcuttur. Cihaz içindeki verilerin yedeklenmesi tamamen müşterinin sorumluluğundadır. Servisimiz veri kaybından sorumlu değildir.
3. FİZİKSEL ANALİZ VE RİSKLER: Sıvı temasına maruz kalmış veya darbe almış cihazlarda, söküm esnasında ortaya çıkabilecek ek arızalar (cihazın tamamen kapanması vb.) müşterinin bilgisi dahilindedir ve sorumluluk müşteriye aittir.
4. KABUL VE TESLİMAT SÜRESİ: Yasal azami onarım süresi 20 iş günüdür. Tedarik süreçlerine bağlı gecikmeler eklenebilir. Tamamlanan veya iade edilen cihazlar 90 gün içinde teslim alınmalıdır; aksi halde sorumluluk kabul edilmez.
5. PARÇA VE İŞÇİLİK GARANTİSİ: Değiştirilen tüm yedek parçalar ve işçilikler 90 gün servis garantisi altındadır. Sıvı teması, kırılma ve yetkisiz müdahaleler garanti kapsamı dışındadır.
6. MÜLKİYET VE İMHA: Apple servis politikaları gereği cihazdan sökülen arızalı orijinal parçalar üreticiye (Apple) geri gönderilir veya imha edilir. Çıkan parçanın müşteriye iadesi mümkün değildir.`}
                                </div>
                            </div>
                        </div>

                        {/* KVKK / Onay Metni */}
                        <div className="bg-[#f5f5f7] p-1.5 border-[0.5px] border-gray-300 rounded mb-2 text-[7.5px] text-gray-800 leading-tight">
                            <p className="font-bold flex items-center gap-1">
                                <CheckCircle size={8} className="text-green-600 flex-shrink-0" />
                                {serviceTerms?.approvalText || "Müşteri olarak, yukarıdaki sözleşme metnini, teknik riskleri okudum, anladım ve cihazımı bu şartlar altında teslim ediyorum."}
                            </p>
                            <p className="text-gray-400 mt-0.5 text-[6.5px] leading-tight font-medium">
                                {serviceTerms?.kvkkText || "Kişisel verileriniz KVKK kapsamında işlenmektedir. Aydınlatma metnini ve verilerimin işlenmesini onaylıyorum."}
                            </p>
                        </div>

                        {/* İmza Alanı */}
                        <div className="mt-auto grid grid-cols-2 gap-3 border-t-[0.5px] border-gray-300 pt-2">
                            <div className="border-[0.5px] border-gray-300 rounded p-1.5 bg-gray-50 flex flex-col justify-between h-[65px]">
                                <div>
                                    <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">TESLİM ALAN UZMAN</span>
                                    <span className="text-[9px] font-semibold text-gray-900 block mt-0.5">{formData.createdBy || 'Servis Yetkilisi'}</span>
                                    <span className="text-[7px] text-gray-400 block leading-tight">Teknik Servis Uzmanı</span>
                                </div>
                                <span className="text-[6.5px] text-gray-400 font-mono self-end">Troy Servis Yetkilisi</span>
                            </div>

                            <div className="border-[0.5px] border-gray-300 rounded p-1.5 bg-gray-50 flex justify-between items-center h-[65px]">
                                <div className="flex-1 flex flex-col justify-between h-full">
                                    <div>
                                        <span className="block text-[6.5px] font-bold text-gray-400 uppercase tracking-wider">MÜŞTERİ ONAYI / DİJİTAL İMZA</span>
                                        <span className="text-[9px] font-semibold text-gray-900 block mt-0.5 truncate max-w-[150px]">{formData.customerName}</span>
                                    </div>
                                    <span className="text-[6.5px] text-gray-400 leading-none">Dijital onay sistemde saklanmaktadır.</span>
                                </div>
                                <div className="w-[65px] h-full flex items-center justify-center bg-white border border-gray-200 rounded overflow-hidden">
                                    {formData.customerSignature ? (
                                        <img src={formData.customerSignature} alt="Müşteri İmzası" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                    ) : (
                                        <span className="text-[6.5px] text-gray-300 italic text-center p-1">İmza Yok</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Eylemleri */}
                <div className="p-4 bg-[#1d1d1f] flex justify-between items-center no-print rounded-b-xl border-t border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                            <span className="font-mono text-[10px]">A4</span>
                        </div>
                        <div className="text-white/40 text-[8px] font-mono uppercase tracking-wider leading-tight opacity-50">
                            APPLECARE SINGLE PAGE<br />
                            WO-ID: {repairId}
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-white/40 hover:text-white rounded text-xs font-bold transition-all hover:bg-white/5"
                        >
                            İptal
                        </button>

                        <button
                            onClick={handleSendEmail}
                            disabled={sendingEmail}
                            className="px-4 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white rounded text-xs font-semibold transition-all flex items-center gap-1.5 border border-blue-500/20 disabled:opacity-50"
                        >
                            {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                            {sendingEmail ? 'GÖNDERİLİYOR...' : 'E-POSTA GÖNDER'}
                        </button>

                        <button
                            onClick={handlePrint}
                            className="px-6 py-2 bg-white text-black hover:bg-gray-100 rounded text-xs font-semibold shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all flex items-center gap-1.5"
                        >
                            <Printer size={14} />
                            FORMU YAZDIR
                        </button>
                    </div>
                </div>
            </div>

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
                        height: 296mm !important;
                        padding: 10mm 12mm !important;
                        page-break-after: avoid !important;
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
        </div>
    );
};

export default ServiceFormPrint;
