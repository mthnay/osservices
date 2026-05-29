/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import Toast from '../components/Toast';
import { hasPermission, ROLES, setGlobalRoles } from '../utils/permissions';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {

    const API_URL = import.meta.env.VITE_API_URL ||
        (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:5001/api'
            : '/api');

    const apiFetch = async (url, options = {}) => {
        // Çıkış yapılıyorsa veya token yoksa (ve login/public değilse) istekleri durdur veya sessizce geç
        if (window.isLoggingOut) {
            return new Response(JSON.stringify([]), { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = sessionStorage.getItem('token');
        
        // Token yoksa ve korumalı bir route ise sunucuya gitmeden durdur (çıkış aşamasında olabiliriz)
        if (!token && !url.includes('/login') && !url.includes('/forgot-password') && !url.includes('/track')) {
            return new Response(JSON.stringify([]), { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const headers = {
            ...options.headers,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        const timeoutMs = options.timeout || 15000;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const fetchOptions = { ...options, headers, signal: controller.signal };
            const res = await fetch(url, fetchOptions);
            clearTimeout(id);
            
            if (res.status === 401 && !url.includes('/login') && !url.includes('/forgot-password')) {
                const currentToken = sessionStorage.getItem('token');
                if (currentToken && !window.isLoggingOut) {
                    sessionStorage.clear();
                    setCurrentUser(null);
                    window.location.href = '/';
                    // Hata fırlatmak yerine sadece durdurabiliriz veya yönlendirme yeterli
                    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
                }
            }
            return res;
        } catch (error) {
            clearTimeout(id);
            if (window.isLoggingOut) {
                return new Response(JSON.stringify([]), { status: 200 });
            }
            if (error.name === 'AbortError') {
                throw new Error('Sunucuya bağlanılamadı veya istek zaman aşımına uğradı. Lütfen internetinizi kontrol edin.');
            }
            throw error;
        }
    };

    const [servicePoints, setServicePoints] = useState([]);
    const [users, setUsers] = useState([]);
    const [deviceModels, setDeviceModels] = useState([]);
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = sessionStorage.getItem('currentUser');
            if (saved && saved !== 'undefined' && saved !== 'null') {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error("Local storage parse error:", e);
            sessionStorage.removeItem('currentUser');
        }
        return null;
    });

    const [emailSettings, setEmailSettings] = useState({
        host: '',
        port: '',
        incomingHost: '',
        incomingPort: '',
        user: '',
        pass: ''
    });

    const [companyProfile, setCompanyProfile] = useState({
        name: "TROY",
        title: "ARTIBİLGİ TEKNOLOJİ BİLİŞİM VE DIŞ TİC. A.Ş.",
        address: "Bağdat Caddesi No:123, 34728 Kadıköy / İstanbul",
        phone: "0216 123 45 67",
        mersis: "0085034123400018",
        dealerCode: "TR-APR-0042"
    });

    const [notificationSettings, setNotificationSettings] = useState({
        requireDamageDescription: false,
        includeDiagnosisInEmail: false
    });

    const [notificationTemplates, setNotificationTemplates] = useState({
        email: {
            status_update: {
                id: 'status_update',
                title: 'Durum Güncellemesi',
                subject: 'Servis Kaydınız Hakkında Bilgilendirme - #{serviceNo}',
                body: 'Sayın {customerName},\n\n{device} cihazınızın servis durumu "{status}" olarak güncellenmiştir.\n\nServis No: #{serviceNo}\nAçıklama: {damageReason}\n\nDetaylı bilgi için müşteri portalımızı ziyaret edebilir veya bizimle iletişime geçebilirsiniz.\n\nİyi günler dileriz,\nTroy Servis Ekibi'
            },
            repair_requote: {
                id: 'repair_requote',
                title: 'Fiyat Teklifi / Onay Bekliyor',
                subject: 'Servis İşlemi İçin Onayınız Bekleniyor - #{serviceNo}',
                body: 'Sayın {customerName},\n\n{device} cihazınızın arıza tespiti tamamlanmıştır.\n\nServis No: #{serviceNo}\nTahmini Onarım Bedeli: {cost} ₺\nTespit Edilen Durum: {damageReason}\n\nİşleme devam edilebilmesi için fiyat teklifini onaylamanız gerekmektedir. Ek detaylar müşteri portalında yer almaktadır.\n\nTeşekkür ederiz,\nTroy Servis Ekibi'
            },
            ready_pickup: {
                id: 'ready_pickup',
                title: 'Teslime Hazır',
                subject: 'Cihazınız Teslim Alınmaya Hazır - #{serviceNo}',
                body: 'Sayın {customerName},\n\n{device} cihazınızın servis işlemleri başarıyla tamamlanmış olup, cihazınız teslime hazırdır.\n\nServis No: #{serviceNo}\nÖdenecek Tutar: {cost} ₺\nYapılan İşlem/Açıklama: {damageReason}\n\nMüsait olduğunuzda servis noktamızdan cihazınızı teslim alabilirsiniz.\n\nİyi günler dileriz,\nTroy Servis Ekibi'
            },
            general_info: {
                id: 'general_info',
                title: 'Genel Bilgilendirme',
                subject: 'Servis Kaydınız ile İlgili Bilgilendirme - #{serviceNo}',
                body: 'Sayın {customerName},\n\n#{serviceNo} kayıt numaralı {device} cihazınız ile ilgili teknik servis ekibimizin bilgilendirmesi aşağıda yer almaktadır:\n\n{damageReason}\n\nİyi günler dileriz,\nTroy Servis Ekibi'
            }
        },
        sms: {
            status_update: 'Sayın {customerName}, {device} cihazinizin durumu "{status}" olarak guncellenmistir. ({damageReason}) Servis No: #{serviceNo}. Bilgi icin: troyservis.com B001',
            repair_requote: 'Sayın {customerName}, #{serviceNo} nolu cihaziniza ait onarim bedeli {cost} TL olarak belirlenmistir. ({damageReason}) Onay icin lutfen donus yapiniz. B001',
            ready_pickup: 'Sayın {customerName}, #{serviceNo} nolu {device} cihazinizin islemleri tamamlanmis olup teslime hazirdir. ({damageReason}) B001',
            general_info: 'Sayın {customerName}, #{serviceNo} nolu {device} cihaziniz ile ilgili bilgilendirme: {damageReason}. B001'
        },
        whatsapp: {
            status_update: '🛡️ *TROY TEKNİK SERVİS* 📱\n\nMerhaba *{customerName}*,\n\n*{device}* cihazınızın onarım süreci güncellendi:\n📍 Durum: *{status}*\n🔢 Servis No: #{serviceNo}\n📝 Açıklama: *{damageReason}*\n\nCanlı takip için: troy.onlar/track?id={serviceNo}',
            repair_requote: '⚠️ *ONAYINIZ BEKLENİYOR* ⚠️\n\nMerhaba *{customerName}*,\n\n#{serviceNo} nolu cihazınız için onarım teklifi hazırlandı:\n💰 Tutar: *{cost} TL*\n📝 Tanı: *{damageReason}*\n\nİşleme devam etmek için lütfen portal üzerinden onay veriniz.',
            ready_pickup: '✅ *CİHAZINIZ HAZIR* ✅\n\nMerhaba *{customerName}*,\n\n#{serviceNo} nolu *{device}* cihazınızın işlemleri tamamlandı! Mesai saatleri içinde teslim alabilirsiniz.\n📝 Ek Bilgi: *{damageReason}*\n\nBekliyoruz! 👋',
            general_info: 'ℹ️ *GENEL BİLGİLENDİRME* ℹ️\n\nMerhaba *{customerName}*,\n\n#{serviceNo} nolu *{device}* cihazınız ile ilgili ekibimizin notu:\n\n📝 *{damageReason}*\n\nİyi günler dileriz.'
        }
    });

    const [selectedStoreId, setSelectedStoreId] = useState(() => {
        try {
            const saved = sessionStorage.getItem('currentUser');
            if (saved && saved !== 'undefined' && saved !== 'null') {
                const user = JSON.parse(saved);
                // SuperAdmin ve Yönetici için varsayılan olarak Tüm Mağazalar (0)
                const role = user.role?.toLowerCase();
                if (role === 'superadmin' || role === 'admin' || role === 'yonetici') {
                    return 0;
                }
                return (user.storeId !== undefined && user.storeId !== null) ? Number(user.storeId) : 0;
            }
        } catch (e) {
            console.error("Store init error:", e);
        }
        return 0;
    });
    const [repairs, setRepairs] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [earnings, setEarnings] = useState([]);
    const [clearedAlertIds, setClearedAlertIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [roles, setRoles] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [serviceTerms, setServiceTerms] = useState({
        termsTitle: 'OSS - OPERATING SYSTEM SOFTWARE GENEL HİZMET SÖZLEŞMESİ',
        termsContent: `Bu Hüküm ve Koşullar OSS - Operating System Software tarafından ürününüz için sağlanacak servis hakkındaki kuralları belirler.

1. OSS - Operating System Software ürününüz için belirtilen servisi verir ve karşılığında Çalışma iznindeki ücretleri ve ilgili vergileri tahsil eder. OSS - Operating System Software, Apple Store ziyaretiniz sırasında verilen servisi müşteri başına bir (1) ürünle sınırlayabilir. Verilen hizmet Apple garantisi, uzatılmış hizmet sözleşmesi veya tüketici kanununun garanti hükümleri kapsamına giriyorsa, ilgili koşullar veya yürürlükteki yasa hükümleri uygulanır. OSS - Operating System Software verilerinizin sizin için önemli olabileceğini bilir. Servis sırasında verilerin kaybolma olasılığı her zaman vardır ve bazı durumlarda bu veriler kurtarılamayabilir, silinebilir veya yeniden biçimlendirilebilir. Bu nedenle, servise vermeden önce ürününüzdeki tüm verileri, yazılımı ve/veya programları yedeklemek ve bu tür verilerin ürününüzden silinip silinmeyeceğine karar vermek yalnızca sizin sorumluluğunuzdadır. OSS - Operating System Software, sağladığı hizmetlerden dolayı verilerin, yazılımın ya da programların kaybolması, kurtarılması veya bozulmasından sorumlu değildir veya ürününüz ya da diğer ekipmandaki kullanım kaybıyla ilgili sorumluluk kabul etmez. Ürününüzün yasa dışı dosyalar veya veriler içermediğini beyan edersiniz. Aygıtınızın servis verilmek üzere harici bir servis sağlayıcıya bir kargo firması aracılığıyla gönderilebileceğini kabul edersiniz. Bu nedenle, servis için göndermeden önce aygıtınızı yedeklemeniz ve silmeniz önerilir.�m kaybıyla ilgili sorumluluk kabul etmez. Ürününüzün yasa illegal dosyalar veya veriler içermediğini beyan edersiniz. Aygıtınızın servis verilmek üzere harici bir servis sağlayıcıya bir kargo firması aracılığıyla gönderilebileceğini kabul edersiniz. Bu nedenle, servis için göndermeden önce aygıtınızı yedeklemeniz ve silmeniz önerilir.

2. Servis ihtiyacı üründeki orijinal olmayan parçalar, yanlış ya da hatalı kullanım ya da dış sebeplerden dolayı oluştuysa, OSS - Operating System Software ürünü servise almadan size geri iade etme hakkını saklı tutar ve sizi ilgili tanılama ücretinden sorumlu tutabilir. OSS - Operating System Software, yetkisiz değişikliklerden veya Apple ya da bir AASP tarafından gerçekleştirilmemiş onarımlardan veya değişimlerden dolayı onarım sırasında üründe meydana gelen hasardan sorumlu tutulamaz. Hasar oluşması durumunda, ürün garanti veya AppleCare servis planı kapsamında olsa bile Apple servisin tamamlanması için ek masraflar konusunda sizin onayınızı isteyecektir. Onay vermeyi reddetmeniz durumunda, Apple ürününüzü hasarlı durumda, onarılmadan, hiçbir sorumluluğu olmaksızın iade edebilir.

3. OSS - Operating System Software, servisin bir parçası olarak, Apple ürününüzün sistem yazılımının önceki sürümlerine geri dönmesini önleyen sistem yazılımı güncellemeleri yükleyebilir. Apple ürününüze yüklenmiş üçüncü taraf uygulamaları, sistem yazılımı güncellemesi sonrasında Apple ürününüzle uyumlu olmayabilir veya çalışmayabilir.

4. Servis için bir önceki tanıda belirtilmeyen bir işçilik türü ve/veya parça gerektiğine karar verilirse, OSS - Operating System Software, gözden geçirilmiş servis ücreti için sizin onayınızı isteyebilir. OSS - Operating System Software'nın servis ücretini gözden geçirmesini kabul etmezseniz Apple ürününüzü iade edebilir ve sizi ilgili teşhisin ücretinden sorumlu tutabilir.

5. Apple, yasaların izin verdiği ölçüde, değişimi yapılan eski parçayı ya da ürünü kendi mülkiyetine alacak ve değişimi yapılan yeni parçanızın mülkiyetinizde olacaktır. Apple'ın yasal olarak değişimi yapılan parçayı gösterme ya da iade etme yükümlülüğü olduğunda Apple bu yükümlülüğünü yerine getirecektir.

6. Türkiye'de geçerli olan Tüketicinin Korunması Hakkında Kanun’a uymanın yanı sıra, Apple servisin yapıldığı tarihten itibaren aşağıdaki yetkinlikle ve ustalıkla uygulanacaktır ve (2) Apple tarafından aksi konularda 90 günlük bir garanti sağlamaktadır: (1) Servis süreci belirtilmediği sürece, ürününüzü onarmak için kullanılan parçalarda hiçbir malzeme ve ustalık hatası bulunmayacaktır. Apple ayrıca geçerli kanunlar çerçevesinde, Apple'ın Apple markalı taşınabilir takılan pillerde servis tarihinden itibaren bir (1) yıl süreyle malzeme Mac bilgisayarlara yönelik pil değiştirme servisinin bir parçası olarak ve işçilik hatası olmayacağını garanti eder. Sözü edilen garanti açık sınırlı bir garantidir ve ihlal edilmesi halinde Apple ya (i) servisi yeniden sağlayacaktır, (ii) parçayı tamir edecek veya değiştirecektir ya da (iii) sağlanan servisin bedelini iade edecektir. Bu garantiden yararlanabilmek için ürününüzü servisin sağlandığı yere geri götürmeniz gerekir. BU GARANTİ VE ONA BAĞLI ÇARELER, SÖZLÜ VEYA YAZILI, YA DA AÇIK VEYA ZIMNİ TÜM DİĞER GARANTİLERİN, ÇARELERİN VE ŞARTLARIN HARİCİNDEDİR VE ONLARIN YERİNE GEÇER. APPLE, SINIRLAMA OLMAKSIZIN, TİCARİ ELVERİŞLİLİK VE BİR AMACA UYGUNLUK GARANTİLERİ DAHİL OLMAK ÜZERE HERHANGİ VE TÜM ZIMNİ GARANTİLERİ ÖZELLİKLE REDDEDER. APPLE'IN YASALAR UYARINCA REDDEDEMEDİĞİ TÜM ZIMNİ GARANTİLER, AÇIK SINIRLI GARANTİNİN SÜRESİYLE SINIRLI OLACAKTIR. BAZI ÜLKELER, EYALETLER VE VİLAYETLER ZIMNİ GARANTİLERE (YA DA ŞARTLARA) SÜRE SINIRLAMASI GETİRMEYE İZİN VERMEMEKTEDİR. BU DURUMDA YUKARIDA BELİRTİLEN SINIRLAMA SİZİN İÇİN GEÇERLİ OLMAYABİLİR.

7. OSS - Operating System Software, APPLE VE BAĞLI ŞİRKETLERİ, ÇALIŞANLARI VE TEMSİLCİLERİ, YÜRÜRLÜKTEKİ YASALARIN İZİN VERDİĞİ AZAMİ ÖLÇÜDE, SAĞLANAN HİZMETLERDEN KAYNAKLANAN ÖZEL, DOLAYLI, ARIZA, BAĞLI ZARAR ZİYAN; YA DA BAŞKA BİR YASAL KURAM ALTINDA GELİR KAYBI, (SÖZLEŞME ÜZERİNDEKİ KARIN KAYBI DA DAHİL OLMAK ÜZERE) GERÇEK YA DO ÖNGÖRÜLEN KARIN KAYBI, PARA KULLANIMININ KAYBI, ÖNGÖRÜLEN TASARRUFUN KAYBI; İŞ KAYBI; FIRSAT KAYBI; İYİ NİYET KAYBI; İTİBAR KAYBI, VERİLERİN KAYBI, ZARAR GÖRMESİ YA DA BOZULMASI; YENİDEN PROGRAMLAMA YA DA ÜRÜNÜNÜZDE SAKLANAN YA DA KULLANILAN PROGRAM YA DA VERİLERİN ESKİ HALİNE GETİRİLMESİ VE ÜRÜNÜNÜZDE SAKLANAN VERİLERİN GİZLİLİĞİNİ KORUYAMAMAKTAN KAYNAKLANAN MALİYETLERİN HİÇBİRİ İÇİN, HİÇBİR DURUMDA SORUMLU OLMAYACAKTIR. BU SINIRLAMA ÖLÜM YA DA KİŞİSEL YARALANMA; BİLEREK İHMAL YA DA AĞIR KUSURDAN KAYNAKLI ZARARLAR İLE İLGİLİ HAK TALEPLERİ İÇİN GEÇERLİ OLMAYACAKTIR. APPLE (i) ÜRÜNÜNÜZÜ YAZILIM PROGRAMLARINI VEYA VERİLERİ RİSKE ETMEDEN VEYA KAYBETMEDEN ONARABİLECEĞİNİ VEYA DEĞİŞTİREBİLECEĞİNİ VE (ii) VERİLERİN GİZLİLİĞİNİ KORUYABİLECEĞİNİ ÖZEL OLARAK GARANTİ VEYA TAAHHÜT ETMEMEKTE VEYA BUNUN SÖZÜNÜ VERMEMEKTEDİR. HERHANGİ BİR ÜRÜNÜN APPLE KORUMASI ALTINDAYKEN ZARAR GÖRMESİ YA DA KAYBOLMASI HALİNDE APPLE'IN SORUMLULUĞU ETKİLENEN ÜRÜNÜN ONARIMI YA DA DEĞİŞİMİYLE SINIRLI OLACAKTIR. AKSİ DURUMDA, APPLE'IN TÜM ZARARLAR İÇİN SORUMLULUĞU APPLE'IN BU HÜKÜMLER UYARINCA SAĞLADIĞI SERVİS İÇİN ALDIĞI ÖDEMELERİ HİÇBİR ŞEKİLDE GEÇEMEYECEKTİR. BURADA BELİRTİLEN ÇARELER, BU HÜKÜM VE KOŞULLAR ALTINDA APPLE'IN HERHANGİ BİR İHLAL İÇİN ELDE EDEBİLECEĞİNİZ TEK VE YEGANE ÇARE OLACAKTIR.

8. OSS - Operating System Software ürününüze sağlanan servisin tamamlandığına dair sizi bilgilendirdikten sonra doksan (90) gün içinde ürünü almaya gelmemeniz ve ödemeniz gereken ücretleri ödememeniz halinde Apple ürününüzü terk edilmiş sayacaktır ve yürürlükteki yasalar uyarınca ürününüzü elden çıkarma hakkına sahiptir.

9. Sağlanan hizmet veri aktarımı ya da yazılım kurulumu içeriyorsa, verileri aktarmaya yetkiniz olduğunu ve yazılım lisansının koşullarını kabul ettiğinizi, Apple'a veriyi aktarması ve sizin adınıza bu tür koşulları kabul etmesi için yetki verdiğinizi kabul etmiş sayılırsınız.

10. Bu Hüküm ve Koşullar, (kanunlar ihtilafı kuralları hariç olmak üzere) Türkiye Cumhuriyeti yasalarına tabidir.

11. Yalnızca bu Hüküm ve Koşullar OSS - Operating System Software ürününüz için sağladığı hizmetin kurallarını belirler.

12. Apple'ın bu Hüküm ve Koşullardaki hizmet ve destek yükümlülüklerini yerine getirmek için sizin kişisel bilgilerinizi toplaması, işlemesi ve kullanması gerektiğini kabul eder ve anlarsınız. Apple, bilgilerinizi www.apple.com/tr/privacy sayfasında bulabileceğiniz Apple'ın Gizlilik Politikasına uygun olarak koruyacaktır.`,
        approvalText: "Müşteri olarak, yukarıdaki sözleşme metnini, teknik riskleri okudum, anladım ve cihazımı bu şartlar altında teslim ediyorum.",
        kvkkText: "Kişisel verileriniz KVKK kapsamında işlenmektedir. Aydınlatma metnini ve verilerimin işlenmesini onaylıyorum."
    });

    // SLA Helper
    const checkSLA = (repair) => {
        if (!repair.date || repair.status === 'Teslim Edildi' || repair.status === 'Cihaz Hazır' || repair.status === 'Tamamlandı') return null;
        const parseDateString = (dateStr) => {
            try {
                const [datePart, timePart] = dateStr.split(' ');
                const [day, month, year] = datePart.split('.');
                const isoDate = `${year}-${month}-${day}T${timePart || '00:00:00'}`;
                return new Date(isoDate);
            // eslint-disable-next-line no-unused-vars
            } catch (e) { return new Date(); }
        };
        const startDate = parseDateString(repair.date);
        const now = new Date();
        const diffHours = (now - startDate) / (1000 * 60 * 60);
        if (repair.status === 'Beklemede') {
            if (diffHours > 48) return { type: 'critical', message: '48 Saati Geçti (Kritik Gecikme)', hours: diffHours };
            if (diffHours > 24) return { type: 'warning', message: '24 Saati Geçti (Gecikme Başladı)', hours: diffHours };
        }
        if (repair.status === 'Müşteri Onayı Bekliyor' && diffHours > 72) {
            return { type: 'info', message: 'Müşteri 3 Gündür Karar Vermedi', hours: diffHours };
        }
        return null;
    };

    const [announcements, setAnnouncements] = useState([]);
    const [tasks, setTasks] = useState([]);

    const fetchStoreUpdates = async () => {
        if (!currentUser) return;
        try {
            let queryParams = '';
            if (!hasPermission(currentUser, 'view_all_stores') && currentUser.storeId) {
                queryParams = `?storeId=${currentUser.storeId}`;
            }
            
            const [annRes, taskRes] = await Promise.all([
                apiFetch(`${API_URL}/store-announcements${queryParams}`),
                apiFetch(`${API_URL}/store-tasks${queryParams}`)
            ]);

            if (annRes.ok) {
                const data = await annRes.json();
                const fetchedList = Array.isArray(data) ? data : [];
                
                setAnnouncements(prevList => {
                    // Eğer önceki liste varsa ve yeni bir duyuru eklenmişse (ve yazarı ben değilsem) Toast göster
                    if (prevList && prevList.length > 0 && fetchedList.length > prevList.length) {
                        const oldIds = prevList.map(item => item._id);
                        const newItems = fetchedList.filter(item => !oldIds.includes(item._id));
                        
                        newItems.forEach(newItem => {
                            if (newItem.author !== currentUser.name) {
                                showToast(`Yeni Duyuru: ${newItem.title}`, 'info');
                            }
                        });
                    }
                    return fetchedList;
                });
            }

            if (taskRes.ok) {
                const data = await taskRes.json();
                const fetchedList = Array.isArray(data) ? data : [];
                
                setTasks(prevList => {
                    // Yeni bir görev eklendiğinde ve bana atandığında Toast göster
                    if (prevList && prevList.length > 0 && fetchedList.length > prevList.length) {
                        const oldIds = prevList.map(item => item._id);
                        const newItems = fetchedList.filter(item => !oldIds.includes(item._id));
                        
                        newItems.forEach(newItem => {
                            if (newItem.assignedTo === currentUser.name) {
                                showToast(`Yeni Görev: ${newItem.title}`, 'info');
                            }
                        });
                    }
                    return fetchedList;
                });
            }
        } catch (error) {
            console.error("Error fetching store updates in context:", error);
        }
    };

    useEffect(() => {
        if (!currentUser) return;
        
        fetchStoreUpdates();

        const interval = setInterval(fetchStoreUpdates, 15000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    const computeAlerts = (repairsList, announcementsList = [], tasksList = []) => {
        const newAlerts = [];
        
        // SLA Alerts
        repairsList.forEach(r => {
            const sla = checkSLA(r);
            if (sla && !clearedAlertIds.includes(r.id)) {
                newAlerts.push({ id: r.id, repair: r, ...sla });
            }
        });

        // Announcement Alerts
        announcementsList.forEach(ann => {
            const annId = `ann-${ann._id}`;
            if (!clearedAlertIds.includes(annId)) {
                newAlerts.push({
                    id: annId,
                    type: 'announcement',
                    title: ann.title,
                    message: ann.content.substring(0, 100) + (ann.content.length > 100 ? '...' : ''),
                    author: ann.author,
                    createdAt: ann.createdAt
                });
            }
        });

        // Task Alerts
        tasksList.forEach(task => {
            if (task.status === 'pending' && task.assignedTo === currentUser.name) {
                const taskId = `task-${task._id}`;
                if (!clearedAlertIds.includes(taskId)) {
                    newAlerts.push({
                        id: taskId,
                        type: 'task',
                        title: task.title,
                        message: task.description ? (task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '')) : 'Detay belirtilmemiş.',
                        dueDate: task.dueDate,
                        createdAt: task.createdAt
                    });
                }
            }
        });

        setAlerts(newAlerts);
    };

    const clearAllAlerts = () => {
        const allIds = alerts.map(a => a.id);
        setClearedAlertIds(prev => [...new Set([...prev, ...allIds])]);
        setAlerts([]);
    };

    useEffect(() => {
        computeAlerts(repairs, announcements, tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [repairs, announcements, tasks, clearedAlertIds]);

    const uploadMedia = async (file) => {
        try {
            // JPG/PNG Validation
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                throw new Error('Sadece JPG veya PNG formatında görseller yüklenebilir.');
            }

            const formData = new FormData();
            formData.append('file', file);
            const res = await apiFetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                return await res.json(); // Returns { url, id }
            }
            const errorData = await res.json().catch(() => ({ message: 'Sunucu hatası' }));
            throw new Error(errorData.message || 'Yükleme sırasında bir sorun oluştu.');
        } catch (error) {
            console.error("Upload Error:", error);
            throw error; // Hatayı yukarı fırlat ki bileşen yakalasın
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return;
            try {
                const [usersRes, servicePointsRes] = await Promise.all([
                    apiFetch(`${API_URL}/users`),
                    apiFetch(`${API_URL}/service-points`)
                ]);
                if (usersRes.ok) {
                    const fetchedUsers = await usersRes.json();
                    setUsers(fetchedUsers);
                    if (currentUser) {
                        const updatedSelf = fetchedUsers.find(u => u.id === currentUser.id || u._id === currentUser._id);
                        if (updatedSelf) setCurrentUser(updatedSelf);
                    }
                }
                if (servicePointsRes.ok) setServicePoints(await servicePointsRes.json());

                let queryParams = '';
                if (!hasPermission(currentUser, 'view_all_stores') && currentUser.storeId) {
                    queryParams = `?storeId=${currentUser.storeId}`;
                }
                const [repairsRes, inventoryRes, techniciansRes, settingsRes, customersRes, companyRes, earningsRes, notifSetRes, notifTempRes, serviceTermsRes, rolesRes, deviceModelsRes] = await Promise.all([
                    apiFetch(`${API_URL}/repairs${queryParams}`),
                    apiFetch(`${API_URL}/inventory${queryParams}`),
                    apiFetch(`${API_URL}/technicians${queryParams}`),
                    apiFetch(`${API_URL}/settings/emailSettings`),
                    apiFetch(`${API_URL}/customers${queryParams}`),
                    apiFetch(`${API_URL}/settings/companyProfile`),
                    apiFetch(`${API_URL}/earnings${queryParams}`),
                    apiFetch(`${API_URL}/settings/notificationSettings`),
                    apiFetch(`${API_URL}/settings/notificationTemplates`),
                    apiFetch(`${API_URL}/settings/serviceTerms`),
                    apiFetch(`${API_URL}/roles`),
                    apiFetch(`${API_URL}/device-models`)
                ]);
                if (repairsRes.ok) {
                    const data = await repairsRes.json();
                    if (Array.isArray(data)) {
                        // Verileri normalize et (serialNumber -> serial, deviceModel -> device)
                        const normalizedData = data.map(r => ({
                            ...r,
                            serial: r.serial || r.serialNumber || '',
                            device: r.device || r.deviceModel || '',
                            tcNo: r.tcNo || r.customerTC || '',
                            customerAddress: r.customerAddress || r.address || ''
                        }));
                        setRepairs(normalizedData);
                    } else {
                        setRepairs([]);
                    }
                }
                if (inventoryRes.ok) {
                    const invData = await inventoryRes.json();
                    setInventory(Array.isArray(invData) ? invData : []);
                }
                if (techniciansRes.ok) {
                    const techData = await techniciansRes.json();
                    setTechnicians(Array.isArray(techData) ? techData : []);
                }
                if (earningsRes.ok) {
                    const earnData = await earningsRes.json();
                    setEarnings(Array.isArray(earnData) ? earnData : []);
                }
                if (settingsRes.ok) {
                    const settings = await settingsRes.json();
                    if (settings) setEmailSettings(settings);
                }
                if (companyRes.ok) {
                    const profile = await companyRes.json();
                    if (profile) setCompanyProfile(profile);
                }
                if (notifSetRes.ok) {
                    const notifSet = await notifSetRes.json();
                    if (notifSet) setNotificationSettings(notifSet);
                }
                if (notifTempRes.ok) {
                    const notifTemp = await notifTempRes.json();
                    if (notifTemp) setNotificationTemplates(notifTemp);
                }
                if (serviceTermsRes.ok) {
                    const terms = await serviceTermsRes.json();
                    if (terms) setServiceTerms(terms);
                }
                if (rolesRes && rolesRes.ok) {
                    const fetchedRoles = await rolesRes.json();
                    setRoles(fetchedRoles);
                    setGlobalRoles(fetchedRoles);
                }
                if (customersRes.ok) {
                    const custData = await customersRes.json();
                    setCustomers(Array.isArray(custData) ? custData : []);
                }
                if (deviceModelsRes && deviceModelsRes.ok) {
                    setDeviceModels(await deviceModelsRes.json());
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // Force store restriction for unauthorized users
    useEffect(() => {
        if (currentUser && !hasPermission(currentUser, 'view_all_stores')) {
            const userStoreId = Number(currentUser.storeId);
            if (selectedStoreId === 0 || selectedStoreId === '0' || Number(selectedStoreId) !== userStoreId) {
                console.log("Enforcing store restriction for user:", currentUser.name);
                setSelectedStoreId(userStoreId);
            }
        }
    }, [currentUser, selectedStoreId]);

    useEffect(() => {
        if (currentUser) sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        else sessionStorage.removeItem('currentUser');
    }, [currentUser]);

    const saveSettings = async (key, value) => {
        try {
            await apiFetch(`${API_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            });
        } catch (error) { console.error("Error saving settings:", error); }
    };

    const login = async (email, password) => {
        try {
            const res = await apiFetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (res.ok) {
                const data = await res.json();
                setCurrentUser(data.user);

                // SuperAdmin ve Yönetici için varsayılan olarak Tüm Mağazalar (0)
                const role = data.user.role?.toLowerCase();
                if (role === 'superadmin' || role === 'admin' || role === 'yonetici') {
                    setSelectedStoreId(0);
                } else if (data.user.storeId !== undefined && data.user.storeId !== null) {
                    setSelectedStoreId(Number(data.user.storeId));
                }
                sessionStorage.setItem('token', data.token);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Login Error:", error);
            return false;
        }
    };

    const logout = () => {
        try {
            window.isLoggingOut = true;
            sessionStorage.clear();
            setCurrentUser(null);
            window.location.href = '/';
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = '/';
        }
    };

    const addUser = async (user) => {
        try {
            const res = await apiFetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...user, id: user.id || `u${Date.now()}` })
            });
            if (res.ok) {
                const saved = await res.json();
                setUsers(prev => [...prev, saved]);
                return true;
            }
        } catch (error) { console.error("Error adding user:", error); return false; }
    };

    const updateUser = async (id, updates) => {
        try {
            console.log(`[AppContext] Updating user ${id}...`, updates);
            const res = await apiFetch(`${API_URL}/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                const updated = await res.json();
                console.log("[AppContext] Update success:", updated);

                setUsers(prev => prev.map(u => {
                    const uId = String(u._id || u.id);
                    const updatedId = String(updated._id || updated.id);
                    return uId === updatedId ? { ...u, ...updated } : u;
                }));

                const currentId = String(currentUser?._id || currentUser?.id);
                const updatedId = String(updated._id || updated.id);
                if (currentId === updatedId) {
                    setCurrentUser(prev => ({ ...prev, ...updated }));
                    sessionStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...updated }));
                }
                return true;
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error("[AppContext] Update failed on server:", res.status, errorData);
                throw new Error(errorData.message || `Sunucu hatası: ${res.status}`);
            }
        } catch (error) {
            console.error("[AppContext] Network error updating user:", error);
            return false;
        }
    };

    const removeUser = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== id && u._id !== id));
                return true;
            }
            return false;
        } catch (error) { console.error("Error removing user:", error); return false; }
    };

    const addRepair = async (repair) => {
        const newRepairInitial = {
            ...repair,
            tcNo: repair.tcNo || repair.customerTC || '',
            customerAddress: repair.customerAddress || repair.address || '',
            serial: repair.serial || repair.serialNumber || '',
            device: repair.device || repair.deviceModel || '',
            id: repair.id || `TR-${Math.floor(Math.random() * 10000)}`,
            date: new Date().toLocaleString('tr-TR'),
            status: 'Beklemede',
            history: [{ status: 'Kayıt Oluşturuldu', date: new Date().toLocaleString(), note: 'Cihaz servise kabul edildi.' }],
            storeId: parseInt(currentUser?.storeId) || 0
        };
        try {
            const res = await apiFetch(`${API_URL}/repairs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRepairInitial)
            });
            if (res.ok) {
                const saved = await res.json();
                const normalized = {
                    ...saved,
                    serial: saved.serial || saved.serialNumber || repair.serial || repair.serialNumber || '',
                    device: saved.device || saved.deviceModel || repair.device || repair.deviceModel || '',
                    tcNo: saved.tcNo || saved.customerTC || repair.tcNo || repair.customerTC || '',
                    customerAddress: saved.customerAddress || saved.address || repair.customerAddress || repair.address || ''
                };
                setRepairs(prev => [normalized, ...prev]);
                return normalized;
            }
        } catch (error) { console.error("Error adding repair:", error); return null; }
    };

    const removeRepair = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/repairs/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setRepairs(prev => prev.filter(r => r.id !== id && r._id !== id));
                return true;
            }
            return false;
        } catch (error) { console.error("Error removing repair:", error); return false; }
    };

    const updateRepair = async (id, updates) => {
        const repair = repairs.find(r => r.id === id || r._id === id);
        if (!repair) return false;
        let newHistory = repair.history || [];
        const extraUpdates = {};

        if (updates.status && updates.status !== repair.status) {
            newHistory = [...newHistory, { status: updates.status, date: new Date().toLocaleString(), note: updates.historyNote || 'Durum güncellendi.' }];

            // Performans Takibi için Tarihsel Damgalar
            if (updates.status === 'İşlemde' && !repair.startedAt) {
                extraUpdates.startedAt = new Date();
            }
            if (['Tamamlandı', 'Cihaz Hazır', 'Teslim Edildi'].includes(updates.status) && !repair.completedAt) {
                extraUpdates.completedAt = new Date();
            }
        }

        try {
            const normalizedUpdates = {
                ...updates,
                tcNo: updates.tcNo || updates.customerTC || undefined,
                customerAddress: updates.customerAddress || updates.address || undefined
            };
            // undefined alanları temizle ki DB'deki veriyi silmesin
            Object.keys(normalizedUpdates).forEach(key => normalizedUpdates[key] === undefined && delete normalizedUpdates[key]);

            const res = await apiFetch(`${API_URL}/repairs/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...normalizedUpdates, ...extraUpdates, history: newHistory })
            });
            if (res.ok) {
                const updated = await res.json();
                const normalized = {
                    ...updated,
                    serial: updated.serial || updated.serialNumber || '',
                    device: updated.device || updated.deviceModel || '',
                    tcNo: updated.tcNo || updated.customerTC || '',
                    customerAddress: updated.customerAddress || updated.address || ''
                };
                setRepairs(prev => prev.map(r => (r._id === updated._id || r.id === id) ? normalized : r));
                return true;
            }
        } catch (error) { console.error("Error updating repair:", error); return false; }
    };

    const updateRepairStatus = async (id, status, note = '') => {
        return updateRepair(id, { status, historyNote: note });
    };

    const addTechnician = async (tech) => {
        try {
            const res = await apiFetch(`${API_URL}/technicians`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...tech, id: tech.id || `t${Date.now()}` })
            });
            if (res.ok) {
                const saved = await res.json();
                setTechnicians(prev => [...prev, saved]);
                return true;
            }
        } catch (error) { console.error("Error adding tech:", error); return false; }
    };

    const updateTechnician = async (id, updates) => {
        try {
            const res = await apiFetch(`${API_URL}/technicians/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updated = await res.json();
                setTechnicians(prev => prev.map(t => (t._id === updated._id || t.id === id) ? updated : t));
                return updated;
            }
        } catch (error) { console.error("Error updating technician:", error); return null; }
    };

    const removeTechnician = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/technicians/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTechnicians(prev => prev.filter(t => t.id !== id && t._id !== id));
                return true;
            }
            return false;
        } catch (error) { console.error("Error removing technician:", error); return false; }
    };

    const assignTechnician = async (repairId, techId) => {
        const updatedTech = await updateTechnician(techId, { status: 'busy', currentJob: repairId });
        if (updatedTech) await updateRepairStatus(repairId, 'İşlemde', `${techId} atandı.`);
    };

    const completeJob = async (techId) => {
        await updateTechnician(techId, { status: 'available', currentJob: null });
    };

    const verifyTechnicianPassword = async (userId, password) => {
        try {
            const res = await apiFetch(`${API_URL}/users/verify-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });
            if (res.ok) {
                const data = await res.json();
                return data.success;
            }
            return false;
        } catch (error) {
            console.error("Error verifying password:", error);
            return false;
        }
    };

    const updateServicePoint = async (id, updates) => {
        try {
            const res = await apiFetch(`${API_URL}/service-points/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updated = await res.json();
                setServicePoints(prev => prev.map(p => (p._id === updated._id || p.id === id) ? updated : p));
                return true;
            }
        } catch (error) { console.error("Error updating service point:", error); return false; }
    };

    const removeServicePoint = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/service-points/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setServicePoints(prev => prev.filter(p => p.id !== id && p._id !== id));
                return true;
            }
        } catch (error) { console.error("Error removing service point:", error); return false; }
    };

    const addServicePoint = async (point) => {
        try {
            const res = await apiFetch(`${API_URL}/service-points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...point, id: point.id || Date.now() })
            });
            if (res.ok) {
                const saved = await res.json();
                setServicePoints(prev => [...prev, saved]);
                return { success: true };
            }
            const errData = await res.json();
            return { success: false, message: errData.message || 'Sunucu hatası' };
        } catch (error) {
            console.error("Error adding service point:", error);
            return { success: false, message: error.message };
        }
    };

    const addCustomer = async (customer) => {
        try {
            const res = await apiFetch(`${API_URL}/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...customer, id: customer.id || `c${Date.now()}` })
            });
            if (res.ok) {
                const saved = await res.json();
                setCustomers(prev => [...prev, saved]);
                return saved;
            }
        } catch (error) { console.error("Error adding customer:", error); return null; }
    };

    const updateCustomer = async (id, updates) => {
        try {
            const res = await apiFetch(`${API_URL}/customers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updated = await res.json();
                setCustomers(prev => prev.map(c => (c._id === updated._id || c.id === id) ? updated : c));
                return true;
            }
        } catch (error) { console.error("Error updating customer:", error); return false; }
    };

    const removeCustomer = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setCustomers(prev => prev.filter(c => c.id !== id && c._id !== id));
                return true;
            }
            return false;
        } catch (error) { console.error("Error removing customer:", error); return false; }
    };

    const addInventoryItem = async (item) => {
        try {
            const itemToSave = { ...item };
            if (itemToSave.kgbSerial && (!itemToSave.kgbSerials || itemToSave.kgbSerials.length === 0)) {
                itemToSave.kgbSerials = [itemToSave.kgbSerial];
            }
            if (itemToSave.kbbSerial && (!itemToSave.kbbSerials || itemToSave.kbbSerials.length === 0)) {
                itemToSave.kbbSerials = [itemToSave.kbbSerial];
            }
            const res = await apiFetch(`${API_URL}/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...itemToSave, storeId: itemToSave.storeId || currentUser?.storeId || 0 })
            });
            if (res.ok) {
                const saved = await res.json();
                setInventory(prev => [...prev, saved]);
                return true;
            }
        } catch (error) { console.error("Error adding item:", error); return false; }
    };

    const updateInventoryItem = async (id, updates) => {
        try {
            const updatesToSave = { ...updates };
            if (updatesToSave.kgbSerial && (!updatesToSave.kgbSerials || updatesToSave.kgbSerials.length === 0)) {
                updatesToSave.kgbSerials = [updatesToSave.kgbSerial];
            }
            if (updatesToSave.kbbSerial && (!updatesToSave.kbbSerials || updatesToSave.kbbSerials.length === 0)) {
                updatesToSave.kbbSerials = [updatesToSave.kbbSerial];
            }
            const res = await apiFetch(`${API_URL}/inventory/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatesToSave)
            });
            if (res.ok) {
                const updated = await res.json();
                setInventory(prev => prev.map(i => (i._id === updated._id || i.id === id) ? updated : i));
                return true;
            }
        } catch (error) { console.error("Error updating item:", error); return false; }
    };

    const removeInventoryItem = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setInventory(prev => prev.filter(i => i.id !== id && i._id !== id));
                return true;
            }
            return false;
        } catch (error) { console.error("Error removing item:", error); return false; }
    };

    const usePart = async (partId, quantity = 1) => {
        try {
            const res = await apiFetch(`${API_URL}/inventory/use`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partId, quantity })
            });
            if (res.ok) {
                const updated = await res.json();
                setInventory(prev => prev.map(i => (i._id === updated._id || i.id === partId) ? updated : i));
                return true;
            }
        } catch (error) { console.error("Error using part:", error); return false; }
    };

    const processStockMovement = async (repairId, parts) => {
        if (!parts || parts.length === 0) return true;

        try {
            // Backend endpoint to process stock movement in one go
            // This is safer than multiple manual updates to prevent race conditions
            const res = await apiFetch(`${API_URL}/inventory/process-movement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repairId, parts })
            });

            if (res.ok) {
                // Refresh inventory from server to get accurate state
                const invRes = await apiFetch(`${API_URL}/inventory`);
                if (invRes.ok) setInventory(await invRes.json());
                return true;
            } else {
                // Fallback: If endpoint doesn't exist, we'll need to do it manually (for backward compatibility)
                console.warn("process-movement endpoint not found, falling back to manual updates.");

                for (const part of parts) {
                    const storeId = part.storeId || currentUser?.storeId || 0;

                    // 1. KGB'den Düş
                    const kgbItem = inventory.find(i =>
                        i.partNumber === part.partNumber &&
                        (String(i.storeId) === String(storeId)) &&
                        (i.warehouseType === 'KGB' || !i.warehouseType)
                    );

                    if (kgbItem) {
                        const newQuantity = Math.max(0, kgbItem.quantity - 1);
                        const newSerials = (kgbItem.kgbSerials || []).filter(s => s !== part.kgbSerial);
                        await updateInventoryItem(kgbItem._id || kgbItem.id, {
                            quantity: newQuantity,
                            kgbSerials: newSerials
                        });
                    }

                    // 2. KBB'ye Gir
                    const kbbItem = inventory.find(i =>
                        i.partNumber === part.partNumber &&
                        (String(i.storeId) === String(storeId)) &&
                        i.warehouseType === 'KBB'
                    );

                    if (kbbItem) {
                        const newQuantity = (kbbItem.quantity || 0) + 1;
                        const newSerials = [...(kbbItem.kbbSerials || []), part.kbbSerial].filter(Boolean);
                        await updateInventoryItem(kbbItem._id || kbbItem.id, {
                            quantity: newQuantity,
                            kbbSerials: newSerials
                        });
                    } else {
                        // Create new KBB record
                        await addInventoryItem({
                            name: part.description || part.name,
                            partNumber: part.partNumber,
                            quantity: 1,
                            kbbSerials: [part.kbbSerial].filter(Boolean),
                            warehouseType: 'KBB',
                            storeId: storeId,
                            category: part.category || 'Diğer'
                        });
                    }
                }
                return true;
            }
        } catch (error) {
            console.error("Error processing stock movement:", error);
            return false;
        }
    };

    const transferInventorySerial = async (sourceItemId, targetStoreId, serialNumbers, serialType) => {
        try {
            const res = await apiFetch(`${API_URL}/inventory/transfer-serial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceItemId, targetStoreId, serialNumbers, serialType })
            });
            if (res.ok) {
                const { sourceItem, targetItem } = await res.json();
                setInventory(prev => {
                    let next = [...prev];
                    const sIndex = next.findIndex(i => (i._id === sourceItem._id) || (i.id === sourceItem.id));
                    if (sIndex > -1) next[sIndex] = sourceItem;

                    const tIndex = next.findIndex(i => (i._id === targetItem._id) || (i.id === targetItem.id));
                    if (tIndex > -1) next[tIndex] = targetItem;
                    else next.push(targetItem);

                    return next;
                });
                return true;
            }
        } catch (e) {
            console.error("Error transferring serial:", e);
        }
        return false;
    };

    const addEarning = async (earning) => {
        try {
            const res = await apiFetch(`${API_URL}/earnings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(earning)
            });
            if (res.ok) {
                const saved = await res.json();
                setEarnings(prev => [...prev, saved]);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error adding earning:", error);
            return false;
        }
    };

    const addRole = async (role) => {
        try {
            const res = await apiFetch(`${API_URL}/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(role)
            });
            if (res.ok) {
                const savedRole = await res.json();
                setRoles(prev => [...prev, savedRole]);
                return true;
            } else {
                const errorData = await res.json();
                showToast(errorData.message || 'Rol eklenemedi', 'error');
                return false;
            }
        } catch (error) {
            console.error("Error adding role:", error);
            showToast('Bağlantı hatası', 'error');
            return false;
        }
    };

    const updateRole = async (id, roleData) => {
        try {
            const res = await apiFetch(`${API_URL}/roles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roleData)
            });
            if (res.ok) {
                const updated = await res.json();
                setRoles(prev => prev.map(r => r._id === id ? updated : r));
                return true;
            } else {
                const errorData = await res.json();
                showToast(errorData.message || 'Rol güncellenemedi', 'error');
                return false;
            }
        } catch (error) {
            console.error("Error updating role:", error);
            return false;
        }
    };

    const deleteRole = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/roles/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setRoles(prev => prev.filter(r => r._id !== id));
                return true;
            } else {
                const errorData = await res.json();
                showToast(errorData.message || 'Rol silinemedi', 'error');
                return false;
            }
        } catch (error) {
            console.error("Error deleting role:", error);
            return false;
        }
    };

    const addDeviceModel = async (model) => {
        try {
            const res = await apiFetch(`${API_URL}/device-models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(model)
            });
            if (res.ok) {
                const saved = await res.json();
                setDeviceModels(prev => [...prev, saved]);
                showToast('Cihaz modeli eklendi.', 'success');
                return true;
            } else {
                const errData = await res.json();
                showToast(errData.message || 'Cihaz modeli eklenemedi.', 'error');
                return false;
            }
        } catch (error) {
            console.error("Error adding device model:", error);
            showToast('Bağlantı hatası', 'error');
            return false;
        }
    };

    const updateDeviceModel = async (id, updates) => {
        try {
            const res = await apiFetch(`${API_URL}/device-models/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updated = await res.json();
                setDeviceModels(prev => prev.map(m => (m._id === id || m.id === id) ? updated : m));
                showToast('Cihaz modeli güncellendi.', 'success');
                return true;
            } else {
                const errData = await res.json();
                showToast(errData.message || 'Cihaz modeli güncellenemedi.', 'error');
                return false;
            }
        } catch (error) {
            console.error("Error updating device model:", error);
            showToast('Bağlantı hatası', 'error');
            return false;
        }
    };

    const removeDeviceModel = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/device-models/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setDeviceModels(prev => prev.filter(m => m._id !== id && m.id !== id));
                showToast('Cihaz modeli silindi.', 'info');
                return true;
            } else {
                const errData = await res.json();
                showToast(errData.message || 'Cihaz modeli silinemedi.', 'error');
                return false;
            }
        } catch (error) {
            console.error("Error deleting device model:", error);
            showToast('Bağlantı hatası', 'error');
            return false;
        }
    };

    const getStoreRepairs = () => {
        if (!currentUser) return [];
        if (hasPermission(currentUser, 'view_all_stores')) {
            if (String(selectedStoreId) === '0') return repairs;
            return repairs.filter(r => String(r.storeId) === String(selectedStoreId));
        }
        return repairs.filter(r => String(r.storeId) === String(currentUser.storeId));
    };

    const [toast, setToast] = useState({ id: 0, message: '', type: 'info', isVisible: false });
    const sendWhatsApp = (phone, message) => {
        if (!phone) return;
        // Sadece rakamları al
        const cleanPhone = phone.replace(/\D/g, '');
        // Başına ülke kodu ekle (yoksa Türkiye 90)
        const finalPhone = cleanPhone.startsWith('90') ? cleanPhone : (cleanPhone.startsWith('0') ? '90' + cleanPhone.substring(1) : '90' + cleanPhone);
        const encodedMsg = encodeURIComponent(message);
        window.open(`https://wa.me/${finalPhone}?text=${encodedMsg}`, '_blank');
    };

    const showToast = React.useCallback((message, type = 'info') => {
        setToast({ id: Date.now(), message, type, isVisible: true });
    }, []);

    React.useEffect(() => {
        window.showToast = showToast;
        return () => {
            delete window.showToast;
        };
    }, [showToast]);

    const hideToast = React.useCallback(() => {
        setToast(prev => ({ ...prev, isVisible: false }));
    }, []);

    const { isAdmin, isStaff } = React.useMemo(() => {
        if (!currentUser) return { isAdmin: false, isStaff: false };
        const role = currentUser.role?.toLowerCase() || '';
        const normalized = role.replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
        return {
            isAdmin: normalized === 'admin' || normalized === 'superadmin' || normalized === 'yonetici',
            isStaff: ['technician', 'reception', 'logistic', 'accountant', 'teknisyen', 'storemanager', 'muhasebe', 'servis_sorumlusu', 'servissorumlusu'].includes(normalized)
        };
    }, [currentUser]);

    // Filtered service points based on user permissions
    const visibleServicePoints = React.useMemo(() => {
        if (!currentUser) return [];
        const hasViewAllPerm = hasPermission(currentUser, 'view_all_stores');
        if ((isAdmin || hasViewAllPerm) && !isStaff) {
            return servicePoints;
        }
        return servicePoints.filter(sp => String(sp.id) === String(currentUser.storeId));
    }, [servicePoints, currentUser, isAdmin, isStaff]);

    const filterByStore = React.useCallback((list, storeIdKey = 'storeId') => {
        if (!currentUser || !Array.isArray(list)) return [];
        const hasViewAllPerm = hasPermission(currentUser, 'view_all_stores');
        if ((isAdmin || hasViewAllPerm) && !isStaff) {
            return selectedStoreId === 0 ? list : list.filter(item => String(item[storeIdKey]) === String(selectedStoreId));
        }
        return list.filter(item => String(item[storeIdKey]) === String(currentUser.storeId));
    }, [currentUser, isAdmin, isStaff, selectedStoreId]);

    return (
        <AppContext.Provider value={{
            API_URL,
            repairs: getStoreRepairs(),
            allRepairs: repairs,
            users,
            currentUser,
            servicePoints: visibleServicePoints,
            allServicePoints: servicePoints,
            visibleServicePoints,
            searchQuery,
            setSearchQuery,
            inventory: filterByStore(inventory),
            allInventory: inventory,
            technicians: (() => {
                const baseTechnicians = filterByStore(technicians);
                const technicianUsers = users
                    .filter(u => {
                        const isTech = u.role?.toLowerCase() === 'technician' || u.role === 'Teknisyen';
                        if (!isTech) return false;
                        if (!currentUser) return false;
                        const hasViewAllPerm = hasPermission(currentUser, 'view_all_stores');
                        if ((isAdmin || hasViewAllPerm) && !isStaff) {
                            return selectedStoreId === 0 || String(u.storeId) === String(selectedStoreId);
                        }
                        return String(u.storeId) === String(currentUser.storeId);
                    })
                    .map(u => ({
                        ...u,
                        name: u.name,
                        id: u.id || u._id,
                        specialty: u.specialty || 'Genel Teknisyen',
                        status: 'Müsait',
                        isUserAcc: true
                    }));

                const combined = [...baseTechnicians];
                technicianUsers.forEach(uTech => {
                    const exists = combined.some(ct => (ct.name?.toLowerCase() === uTech.name?.toLowerCase()) || (ct.email?.toLowerCase() === uTech.email?.toLowerCase()));
                    if (!exists) combined.push(uTech);
                });
                return combined;
            })(),
            allTechnicians: technicians,
            customers: filterByStore(customers),
            allCustomers: customers,
            earnings: filterByStore(earnings),
            allEarnings: earnings,
            login, logout, addUser, updateUser, removeUser, addRepair, removeRepair, updateRepair, updateRepairStatus,
            addTechnician, updateTechnician, removeTechnician, assignTechnician, completeJob, verifyTechnicianPassword, addServicePoint, updateServicePoint, removeServicePoint,
            addCustomer, updateCustomer, removeCustomer, addInventoryItem, updateInventoryItem, removeInventoryItem, usePart, processStockMovement, transferInventorySerial, addEarning,
            emailSettings, setEmailSettings: (s) => { setEmailSettings(s); saveSettings('emailSettings', s); },
            companyProfile, setCompanyProfile: (p) => { setCompanyProfile(p); saveSettings('companyProfile', p); },
            notificationSettings, setNotificationSettings: (s) => { setNotificationSettings(s); saveSettings('notificationSettings', s); },
            notificationTemplates, setNotificationTemplates: (s) => { setNotificationTemplates(s); saveSettings('notificationTemplates', s); },
            serviceTerms, setServiceTerms: (s) => { setServiceTerms(s); saveSettings('serviceTerms', s); },
            roles, addRole, updateRole, deleteRole,
            deviceModels, addDeviceModel, updateDeviceModel, removeDeviceModel,
            selectedStoreId, setSelectedStoreId, showToast, alerts: alerts.filter(a => !clearedAlertIds.includes(a.id)), checkSLA, sendWhatsApp, uploadMedia, clearAllAlerts
        }}>
            {children}
            {toast.isVisible && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={hideToast} />}
        </AppContext.Provider>
    );
};
