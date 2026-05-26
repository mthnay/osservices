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
                    
                    {/* SAYFA 1: SERVİS KABUL FORMU */}
                    <div className="print-page bg-white">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-[0.5px] border-gray-300 pb-3 mb-3">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded font-semibold text-2xl">
                                    {companyProfile?.name?.[0] || 'T'}
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-black leading-none">{companyProfile?.name || 'TROY'}</h1>
                                    <p className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mt-1">Yetkili Servis Sağlayıcısı</p>
                                    <p className="text-[8px] text-gray-500 max-w-[320px] leading-tight mt-0.5">
                                        {companyProfile?.title || 'ARTIBİLGİ TEKNOLOJİ BİLİŞİM VE DIŞ TİC. A.Ş.'} | {companyProfile?.address || 'Bağdat Caddesi No:123, 34728 Kadıköy / İstanbul'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="border-[0.5px] border-gray-300 p-0.5 bg-white">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + '?track=' + repairId)}&bgcolor=ffffff&color=000000&margin=1`} 
                                        alt="Sorgulama QR" 
                                        className="w-12 h-12"
                                    />
                                </div>
                                <div className="text-right">
                                    <span className="inline-block bg-black text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider leading-none">Servis Kabul Formu</span>
                                    <h2 className="text-2xl font-mono font-bold text-black tracking-tight mt-0.5">#{repairId}</h2>
                                    <p className="text-[8px] text-gray-500 uppercase mt-0.5">Kabul Tarihi: <span className="font-bold text-black">{currentDate}</span></p>
                                </div>
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
                                    <span className="font-semibold text-gray-900">{formData.customerName}</span>
                                </div>
                                <div className="border-r-[0.5px] border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">TELEFON NUMARASI</span>
                                    <span className="font-semibold text-gray-900">{formData.customerPhone}</span>
                                </div>
                                <div className="border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">E-POSTA ADRESİ</span>
                                    <span className="font-semibold text-gray-900 truncate block lowercase">{formData.customerEmail || '-'}</span>
                                </div>

                                {/* Satır 2 */}
                                <div className="col-span-1 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">T.C. KİMLİK / V.K.N.</span>
                                    <span className="font-semibold text-gray-900">{formData.customerTC || '-'}</span>
                                </div>
                                <div className="col-span-3 border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">ADRES</span>
                                    <span className="text-gray-700 leading-tight block truncate">{formData.customerAddress || 'Belirtilmedi'}</span>
                                </div>

                                {/* Satır 3 */}
                                <div className="col-span-1 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">CİHAZ MODELİ</span>
                                    <span className="font-semibold text-blue-600">{formData.deviceModel}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">CİHAZ TÜBÜ</span>
                                    <span className="font-semibold text-gray-900 uppercase">{formData.productGroup || '-'}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">SERİ NUMARASI</span>
                                    <span className="font-mono font-semibold text-gray-900 uppercase">{formData.serialNumber}</span>
                                </div>
                                <div className="col-span-1 border-b-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">GARANTİ DURUMU</span>
                                    <span className="font-semibold text-gray-900 uppercase">{formData.warrantyStatus}</span>
                                </div>

                                {/* Satır 4 */}
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">IMEI 1</span>
                                    <span className="font-mono text-gray-900">{formData.imei1 || '-'}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">IMEI 2</span>
                                    <span className="font-mono text-gray-900">{formData.imei2 || '-'}</span>
                                </div>
                                <div className="col-span-1 border-r-[0.5px] border-gray-300 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">BUL (FMI) DURUMU</span>
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold text-white ${formData.findMyOff ? 'bg-green-600' : 'bg-red-600'}`}>
                                        {formData.findMyOff ? 'KAPALI' : 'AÇIK'}
                                    </span>
                                </div>
                                <div className="col-span-1 p-2">
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">SERVİS YÖNTEMİ</span>
                                    <span className="font-semibold text-blue-600 truncate block">
                                        {REPAIR_TYPE_LABELS[formData.repairType] || '-'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Arıza ve Gözlemler */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-3">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider text-gray-700">
                                Şikayet ve Fiziksel Durum Analizi
                            </div>
                            <div className="p-3 text-[10px] space-y-2">
                                <div>
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">MÜŞTERİ BEYANI / BİLDİRİLEN ARIZA</span>
                                    <p className="text-gray-800 leading-relaxed bg-[#fbfbfd] p-2 border-[0.5px] border-gray-200 rounded italic text-[9.5px]">
                                        "{formData.issueDescription || 'Cihazın bildirilen bir arızası bulunmamaktadır.'}"
                                    </p>
                                </div>

                                {formData.notes && formData.notes.toUpperCase().includes('DOA RAPORU:') && (
                                    <div className="p-2 bg-red-50 border-[0.5px] border-red-200 rounded">
                                        <span className="block text-[7px] font-black text-red-700 uppercase tracking-wider mb-0.5">YETKİLİ SERVİS DOA RAPORU</span>
                                        <p className="text-red-900 leading-relaxed font-bold italic text-[9.5px]">
                                            "{formData.notes.replace(/DOA RAPORU:/i, '').trim()}"
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-1">FİZİKSEL DURUM VE YANINDA GELEN AKSESUARLAR</span>
                                    <div className="flex flex-wrap gap-1">
                                        {formData.visualCondition && formData.visualCondition.length > 0 ? (
                                            formData.visualCondition.map(item => (
                                                <span key={item} className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[7.5px] font-semibold text-gray-700 uppercase">
                                                    {item}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[9px] text-gray-400 italic">Kusurlu fiziksel durum veya aksesuar bildirilmedi.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Finansal Bilgiler */}
                        <div className="border-[0.5px] border-gray-300 rounded overflow-hidden mb-3">
                            <div className="bg-[#f5f5f7] border-b-[0.5px] border-gray-300 px-3 py-1 text-[8.5px] font-bold uppercase tracking-wider text-gray-700">
                                Mali Durum ve Tahmini Onarım Bedeli
                            </div>
                            <div className="p-3">
                                {formData.estimatedCost > 0 ? (
                                    <div className="flex justify-between items-center bg-gray-50 p-2 border-[0.5px] border-gray-200 rounded">
                                        <div className="max-w-[70%]">
                                            <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">TAHMİNİ HİZMET VE ONARIM BEDELİ (KDV DAHİL)</span>
                                            <p className="text-[8px] text-gray-500 leading-tight">
                                                Müşteri, yukarıda belirtilen arızanın giderilmesi için öngörülen tutarı onaylamıştır. Bu tutar %20 KDV dahil son fiyattır.
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">TOPLAM ONAYLANAN TUTAR</span>
                                            <span className="text-lg font-bold text-black">{parseFloat(formData.estimatedCost).toLocaleString('tr-TR')} ₺</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center bg-green-50/50 p-2 border-[0.5px] border-green-200 rounded text-green-800">
                                        <div>
                                            <span className="block text-[7px] font-bold text-green-600 uppercase tracking-wider">GARANTİ KAPSAMI İŞLEM</span>
                                            <p className="text-[8px] text-green-700/80 leading-tight">
                                                Cihazınız garanti kapsamında veya Apple kalite programları kapsamında incelenecektir. Ön değerlendirmede servis ücreti çıkmamıştır.
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold uppercase bg-green-600 text-white px-2 py-0.5 rounded shadow-sm">ÜCRETSİZ İŞLEM</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* İmza Alanı */}
                        <div className="mt-auto grid grid-cols-2 gap-4 border-t-[0.5px] border-gray-300 pt-3">
                            <div className="border-[0.5px] border-gray-300 rounded p-2 bg-gray-50 flex flex-col justify-between h-[75px]">
                                <div>
                                    <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">TESLİM ALAN UZMAN</span>
                                    <span className="text-[9.5px] font-semibold text-gray-900 block mt-0.5">{formData.createdBy || 'Servis Yetkilisi'}</span>
                                    <span className="text-[7.5px] text-gray-400 block leading-tight">Teknik Servis Uzmanı</span>
                                </div>
                                <span className="text-[7px] text-gray-400 font-mono self-end">Troy Servis Yetkilisi</span>
                            </div>

                            <div className="border-[0.5px] border-gray-300 rounded p-2 bg-gray-50 flex justify-between items-center h-[75px]">
                                <div className="flex-1 flex flex-col justify-between h-full">
                                    <div>
                                        <span className="block text-[7px] font-bold text-gray-400 uppercase tracking-wider">MÜŞTERİ ONAYI / DİJİTAL İMZA</span>
                                        <span className="text-[9.5px] font-semibold text-gray-900 block mt-0.5 truncate max-w-[150px]">{formData.customerName}</span>
                                    </div>
                                    <span className="text-[7px] text-gray-400 leading-none">Dijital onay sistemde saklanmaktadır.</span>
                                </div>
                                <div className="w-[75px] h-full flex items-center justify-center bg-white border border-gray-200 rounded overflow-hidden">
                                    {formData.customerSignature ? (
                                        <img src={formData.customerSignature} alt="Müşteri İmzası" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                                    ) : (
                                        <span className="text-[7px] text-gray-300 italic text-center p-1">İmza Yok</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAYFA 2: SÖZLEŞME VE ŞARTLAR */}
                    <div className="print-page bg-white">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b-[0.5px] border-gray-300 pb-2 mb-3">
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-1 bg-black rounded-full"></div>
                                <div>
                                    <h2 className="text-sm font-bold text-black uppercase tracking-tight">Teknik Servis Genel Hizmet Sözleşmesi</h2>
                                    <p className="text-[7px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Cihaz teslimi öncesi lütfen tüm koşulları dikkatlice okuyunuz.</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-mono font-bold text-black">#{repairId}</div>
                                <div className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">SÖZLEŞME NO</div>
                            </div>
                        </div>

                        {/* Sözleşme Metni */}
                        <div className="columns-2 gap-4 text-[7px] text-gray-600 text-justify leading-relaxed font-medium mb-3">
                            <div className="break-inside-avoid">
                                <h3 className="font-bold text-black mb-1 uppercase text-[8px] flex items-center gap-1">
                                    <div className="w-1 h-1 bg-black rounded-full"></div> 
                                    {serviceTerms?.termsTitle || 'TROY TEKNİK SERVİS GENEL HİZMET SÖZLEŞMESİ'}
                                </h3>
                                <div className="whitespace-pre-line opacity-95 text-[6.8px] leading-tight">
                                    {serviceTerms?.termsContent || `1. GENEL HÜKÜMLER: Cihazın teslim alınması onarımın kabul edildiği anlamına gelmez. Teknik servis ön incelemesi sonrasında nihai servis kaydı oluşturulur. Cihazla birlikte teslim edilmeyen aksesuar, koruyucu cam, kılıf, şarj aleti, SIM kart vb. yan ürünlerin kaybından veya hasarından servisimiz sorumlu tutulamaz.
2. VERİ GÜVENLİĞİ VE YEDEKLER: Servis işlemleri (anakart onarımı, batarya/ekran değişimleri veya yazılım güncellemeleri) esnasında veri silinmesi veya kalıcı olarak kaybolması riski mevcuttur. Cihaz içerisindeki tüm verilerin yedeklenmesi tamamen müşterinin sorumluluğundadır. Servisimiz veri kaybından dolayı hiçbir şekilde sorumlu tutulamaz.
3. FİZİKSEL ANALİZ VE YAN ETKİ RİSKLERİ: Sıvı temasına maruz kalmış, ağır darbe almış, bükülmüş veya daha önce yetkisiz müdahale görmüş cihazlarda, onarım veya söküm işlemleri sırasında ortaya çıkabilecek ek arızalar (cihazın tamamen kapanması, ekranın gitmesi, şebeke kaybı vb.) müşterinin bilgisi dahilindedir ve bu durumdaki tüm riskler müşteriye aittir.
4. KABUL VE TESLİMAT SÜRESİ: Yasal azami onarım süresi 20 iş günüdür. Üretici parça tedarik süreçlerine bağlı gecikmeler bu süreye ilave edilebilir. Onarımı tamamlanan veya iade edilen cihazlar 90 gün içinde teslim alınmalıdır; teslim alınmayan cihazlar için sorumluluk kabul edilmez.
5. PARÇA VE İŞÇİLİK GARANTİSİ: Değiştirilen tüm orijinal yedek parçalar ve uygulanan işçilikler teslim tarihinden itibaren 90 gün süreyle servisimiz garantisi altındadır. Sıvı teması, kırılma, kullanıcı kaynaklı fiziksel hasarlar ve yetkisiz müdahaleler garanti kapsamı dışındadır.
6. MÜLKİYET VE İMHA: Apple servis politikaları gereği cihazdan sökülen arızalı orijinal parçalar üreticiye (Apple) geri gönderilir veya imha edilmek üzere geri dönüşüme verilir. Çıkan parçanın müşteriye iadesi mümkün değildir.`}
                                </div>
                            </div>
                        </div>

                        {/* KVKK / Onay Metni */}
                        <div className="bg-[#f5f5f7] p-2.5 border-[0.5px] border-gray-300 rounded mb-4 text-[8px] text-gray-800 leading-tight">
                            <p className="font-bold flex items-center gap-1 text-[8.5px]">
                                <CheckCircle size={10} className="text-green-600 flex-shrink-0" />
                                {serviceTerms?.approvalText || "Müşteri olarak, yukarıdaki sözleşme metnini, teknik riskleri okudum, anladım ve cihazımı bu şartlar altında teslim ediyorum."}
                            </p>
                            <p className="text-gray-400 mt-1 text-[7px] leading-tight font-medium">
                                {serviceTerms?.kvkkText || "Kişisel verileriniz KVKK kapsamında işlenmektedir. Aydınlatma metnini ve verilerimin işlenmesini onaylıyorum."}
                            </p>
                        </div>

                        {/* İmza Alanı Sayfa 2 */}
                        <div className="mt-auto grid grid-cols-2 gap-6 pt-3 border-t-[0.5px] border-gray-300 px-4">
                            <div className="text-center">
                                <span className="block text-[7.5px] font-bold text-gray-400 uppercase tracking-wider mb-2">İŞLETME KAŞE / SERVİS ONAYI</span>
                                <div className="w-14 h-14 bg-gray-50 border border-gray-200 flex items-center justify-center rounded font-bold mx-auto mb-1 text-xl text-gray-300 opacity-60">
                                    {companyProfile?.name?.[0] || 'T'}
                                </div>
                                <span className="text-[8.5px] font-bold text-gray-700 tracking-tight block">{companyProfile?.name || 'TROY'} YETKİLİ SERVİS</span>
                            </div>
                            <div className="text-center flex flex-col items-center">
                                <span className="block text-[7.5px] font-bold text-gray-400 uppercase tracking-wider mb-2">MÜŞTERİ ISLAK İMZA</span>
                                <div className="h-14 w-full flex items-center justify-center relative bg-gray-50 border border-dashed border-gray-200 rounded">
                                    {formData.customerSignature ? (
                                        <img src={formData.customerSignature} alt="Müşteri İmzası" className="h-[120%] object-contain mix-blend-multiply scale-110 transform -rotate-1" />
                                    ) : (
                                        <div className="h-px w-[60%] bg-gray-300 mt-6"></div>
                                    )}
                                </div>
                                <span className="text-[9.5px] font-bold text-gray-900 uppercase mt-1 block">{formData.customerName}</span>
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
                            APPLECARE INSPIRED FORM<br />
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
        </div>
    );
};

export default ServiceFormPrint;
