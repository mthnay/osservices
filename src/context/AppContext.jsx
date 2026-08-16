/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import Toast from '../components/Toast';
import { hasPermission, ROLES, setGlobalRoles, getAccessibleStoreIds } from '../utils/permissions';
import { isWholeUnitItem } from '../utils/warehouse';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

/** Başarısız yanıtın gerekçesini okur; gövde okunamazsa varsayılana düşer. */
const readErrorMessage = async (res, fallback) => {
    try {
        const body = await res.json();
        if (body?.message) return body.message;
    } catch { /* JSON değilse varsayılan mesaj */ }
    return fallback;
};

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

            // Sistem erişimi kapatılan hesabın açık oturumunu anında sonlandır.
            // Sıradan yetki hataları (403) etkilenmesin diye yalnızca
            // ACCOUNT_DISABLED koduna bakılır; gövde clone üzerinden okunur.
            if (res.status === 403 && !url.includes('/login')) {
                let disabled = false;
                try {
                    const body = await res.clone().json();
                    disabled = body?.code === 'ACCOUNT_DISABLED';
                    if (disabled) window.accountDisabledMessage = body?.message || '';
                } catch { /* JSON değilse yoksay */ }

                if (disabled && !window.isLoggingOut) {
                    const message = window.accountDisabledMessage
                        || 'Hesabınızın sistem erişimi kapatılmıştır.';
                    sessionStorage.clear();
                    setCurrentUser(null);
                    try { sessionStorage.setItem('logoutReason', message); } catch { /* yoksay */ }
                    window.location.href = '/';
                    return new Response(JSON.stringify({ success: false, message }), { status: 403 });
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
    const [recentActivity, setRecentActivity] = useState([]);
    const [satisfactionEntries, setSatisfactionEntries] = useState([]);

    const fetchStoreUpdates = async () => {
        if (!currentUser) return;
        try {
            // Mağaza kapsamı backend'de JWT'ye göre zorlanır; istemcinin storeId göndermesine gerek yok
            const queryParams = '';

            const [annRes, taskRes, actRes, satRes] = await Promise.all([
                apiFetch(`${API_URL}/store-announcements${queryParams}`),
                apiFetch(`${API_URL}/store-tasks${queryParams}`),
                apiFetch(`${API_URL}/system/recent-activity?limit=30`),
                apiFetch(`${API_URL}/satisfaction`)
            ]);

            if (actRes.ok) {
                const data = await actRes.json();
                setRecentActivity(Array.isArray(data) ? data : []);
            }

            if (satRes.ok) {
                const data = await satRes.json();
                setSatisfactionEntries(Array.isArray(data) ? data : []);
            }

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

    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        if (!blob) return reject(new Error('Sıkıştırma başarısız.'));
                        const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
                        resolve(compressedFile);
                    }, 'image/jpeg', 0.7); // %70 Kalite
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    };

    const uploadMedia = async (file) => {
        try {
            // JPG/PNG Validation
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!validTypes.includes(file.type)) {
                throw new Error('Sadece JPG veya PNG formatında görseller yüklenebilir.');
            }

            // Sıkıştırma İşlemi
            let fileToUpload = file;
            try {
                fileToUpload = await compressImage(file);
            } catch (err) {
                console.warn("Görsel sıkıştırılamadı, orijinal dosya yükleniyor...", err);
            }

            const formData = new FormData();
            formData.append('file', fileToUpload);
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

                // Mağaza kapsamı backend'de JWT'ye göre zorlanır (yetkisiz → erişimli mağazalar; yetkili → tümü)
                const queryParams = '';
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

    // Yetkisiz kullanıcılar için mağaza kısıtı (çoklu mağaza destekli)
    useEffect(() => {
        if (currentUser && !hasPermission(currentUser, 'view_all_stores')) {
            const allowed = getAccessibleStoreIds(currentUser);
            const sel = Number(selectedStoreId);
            if (allowed.length <= 1) {
                // Tek mağaza: her zaman kendi mağazasına sabitle
                const only = allowed[0] ?? Number(currentUser.storeId);
                if (only && sel !== only) setSelectedStoreId(only);
            } else if (sel !== 0 && !allowed.includes(sel)) {
                // Çok mağaza: 0 (tümü) veya erişimli mağazalardan biri geçerli; değilse 0'a çek
                setSelectedStoreId(0);
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
                } else {
                    // Çok mağazalı kullanıcı → 0 (tüm erişimli mağazaları); tek mağazalı → kendi mağazası
                    const allowedStores = getAccessibleStoreIds(data.user);
                    setSelectedStoreId(allowedStores.length > 1 ? 0 : (allowedStores[0] ?? (data.user.storeId != null ? Number(data.user.storeId) : 0)));
                }
                sessionStorage.setItem('token', data.token);
                return { ok: true };
            }

            // Sunucunun gerekçesini yüzeye çıkar (ör. erişimi kapatılmış hesap)
            const errorData = await res.json().catch(() => ({}));
            return {
                ok: false,
                code: errorData.code,
                message: errorData.message || 'E-posta veya şifre hatalı.'
            };
        } catch (error) {
            console.error("Login Error:", error);
            return { ok: false, message: 'Bağlantı hatası. Lütfen tekrar deneyin.' };
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
            // Sunucunun gerekçesi (yinelenen e-posta, yetki) kullanıcıya gösterilmeli
            const message = await readErrorMessage(res, 'Personel hesabı oluşturulamadı.');
            showToast(/duplicate key|E11000/i.test(message)
                ? 'Bu e-posta adresi başka bir hesapta kayıtlı.'
                : message, 'error');
            return false;
        } catch (error) {
            console.error("Error adding user:", error);
            showToast(error.message || 'Personel hesabı oluşturulamadı.', 'error');
            return false;
        }
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
            // ('Onarımda' teknisyen atölyeden başlattığında yazılır; süre ölçümü buna dayanır)
            if (['İşlemde', 'Onarımda'].includes(updates.status) && !repair.startedAt) {
                extraUpdates.startedAt = new Date();
            }
            if (['Tamamlandı', 'Cihaz Hazır', 'Teslim Edildi', 'İade Hazır'].includes(updates.status) && !repair.completedAt) {
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
            showToast(await readErrorMessage(res, 'Mağaza bilgileri güncellenemedi.'), 'error');
            return false;
        } catch (error) {
            console.error("Error updating service point:", error);
            showToast(error.message || 'Mağaza bilgileri güncellenemedi.', 'error');
            return false;
        }
    };

    const removeServicePoint = async (id) => {
        try {
            const res = await apiFetch(`${API_URL}/service-points/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setServicePoints(prev => prev.filter(p => p.id !== id && p._id !== id));
                return true;
            }
            showToast(await readErrorMessage(res, 'Mağaza kaldırılamadı.'), 'error');
            return false;
        } catch (error) {
            console.error("Error removing service point:", error);
            showToast(error.message || 'Mağaza kaldırılamadı.', 'error');
            return false;
        }
    };

    const addServicePoint = async (point) => {
        try {
            // Mağaza id'sini sunucu atar (sıradaki numara); istemci saat damgası
            // üretirse kullanıcıların storeId değerleriyle eşleşmeyen id'ler oluşuyor.
            const res = await apiFetch(`${API_URL}/service-points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(point)
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

    /**
     * Yeni cari açar. Sunucu mükerrer kaydı 409 ile reddedebilir; bu durumda
     * eşleşen kayıtlar geri döner ve çağıran ekran "mevcut cariyi kullan /
     * düzenle" akışını gösterir.
     * @returns {{success: boolean, customer?, duplicate?: boolean, level?: string, forceable?: boolean, matches?: Array, message?: string}}
     */
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
                return { success: true, customer: saved };
            }
            if (res.status === 409) {
                const conflict = await res.json().catch(() => ({}));
                return {
                    success: false,
                    duplicate: true,
                    level: conflict.level || 'confirm',
                    forceable: Boolean(conflict.forceable),
                    matches: conflict.matches || [],
                    message: conflict.message || 'Bu bilgilerle kayıtlı bir cari zaten var.',
                };
            }
            const message = await readErrorMessage(res, 'Müşteri kaydedilemedi.');
            showToast(message, 'error');
            return { success: false, message };
        } catch (error) {
            console.error("Error adding customer:", error);
            showToast(error.message || 'Müşteri kaydedilemedi.', 'error');
            return { success: false, message: error.message };
        }
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
            if (res.status === 409) {
                const conflict = await res.json().catch(() => ({}));
                showToast(conflict.message || 'Bu bilgiler başka bir cariye ait.', 'error');
                return false;
            }
            showToast(await readErrorMessage(res, 'Müşteri güncellenemedi.'), 'error');
            return false;
        } catch (error) {
            console.error("Error updating customer:", error);
            showToast(error.message || 'Müşteri güncellenemedi.', 'error');
            return false;
        }
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
            // Bütün birim kodları sistem genelidir: bir ambara bağlanmaz,
            // bu yüzden mağaza zorunluluğundan muaftır.
            let payload;
            if (isWholeUnitItem(itemToSave)) {
                payload = { ...itemToSave, storeId: 0, quantity: 0, minLevel: 0 };
            } else {
                // Mağaza ambar ayrımı: geçerli bir mağaza zorunlu (storeId=0 "tüm mağazalar" sentinelidir, öksüz kayıt yaratır)
                const resolvedStoreId = Number(itemToSave.storeId ?? currentUser?.storeId);
                if (!resolvedStoreId || Number.isNaN(resolvedStoreId)) {
                    showToast('Parça eklemek için geçerli bir mağaza seçilmelidir.', 'error');
                    return false;
                }
                payload = { ...itemToSave, storeId: resolvedStoreId };
            }

            const res = await apiFetch(`${API_URL}/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const saved = await res.json();
                // Oturum düşmüşse apiFetch boş gövdeli bir yanıt döndürebilir;
                // kaydedilmemiş parçayı listeye eklemeyelim.
                if (!saved || Array.isArray(saved) || !(saved._id || saved.id)) {
                    showToast('Parça kaydedilemedi. Oturumunuz sona ermiş olabilir, tekrar giriş yapın.', 'error');
                    return false;
                }
                setInventory(prev => [...prev, saved]);
                return true;
            }
            // Sunucunun gerekçesini gizlemeyelim: kullanıcı neden eklenemediğini görmeli
            showToast(await readErrorMessage(res, 'Parça eklenemedi.'), 'error');
            return false;
        } catch (error) {
            console.error("Error adding item:", error);
            showToast(error.message || 'Parça eklenemedi. Sunucuya ulaşılamıyor.', 'error');
            return false;
        }
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
                // PUT, kayıt bulunamadığında da 200 + null dönebiliyor
                if (!updated || !(updated._id || updated.id)) return false;
                setInventory(prev => prev.map(i => (i._id === updated._id || i.id === id) ? updated : i));
                return true;
            }
            // Çağıranlar kendi mesajlarını gösterdiği için burada toast yok
            console.warn('[inventory] Güncelleme reddedildi:', await readErrorMessage(res, res.status));
            return false;
        } catch (error) {
            console.error("Error updating item:", error);
            return false;
        }
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
        // Bütün birim kayıtları stoksuzdur; KGB düşümü / KBB girişi oluşturmaz
        const stockParts = (parts || []).filter(p => !p.isWholeUnit);
        if (stockParts.length === 0) return true;

        try {
            // Backend endpoint to process stock movement in one go
            // This is safer than multiple manual updates to prevent race conditions
            const res = await apiFetch(`${API_URL}/inventory/process-movement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repairId, parts: stockParts })
            });

            if (res.ok) {
                // Refresh inventory from server to get accurate state
                const invRes = await apiFetch(`${API_URL}/inventory`);
                if (invRes.ok) setInventory(await invRes.json());
                return true;
            } else {
                // Fallback: If endpoint doesn't exist, we'll need to do it manually (for backward compatibility)
                console.warn("process-movement endpoint not found, falling back to manual updates.");

                for (const part of stockParts) {
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

    // Günlük müşteri memnuniyeti verisi kaydet (mağaza + gün başına upsert)
    const addSatisfactionEntry = async (entry) => {
        try {
            const res = await apiFetch(`${API_URL}/satisfaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            });
            if (res.ok) {
                const saved = await res.json();
                setSatisfactionEntries(prev => {
                    const rest = prev.filter(e => !(String(e.storeId) === String(saved.storeId) && e.date === saved.date));
                    return [saved, ...rest];
                });
                return true;
            }
            const err = await res.json().catch(() => ({}));
            showToast(err.message || 'Memnuniyet verisi kaydedilemedi.', 'error');
            return false;
        } catch (error) {
            console.error('Error saving satisfaction entry:', error);
            showToast('Bağlantı hatası.', 'error');
            return false;
        }
    };

    // KBB iade edildiğinde ilgili mağazanın KBB ambarından düş
    const returnKbbStock = async (parts, returnCode = '') => {
        if (!parts || parts.length === 0) return true;
        try {
            const res = await apiFetch(`${API_URL}/inventory/return-kbb`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parts, returnCode })
            });
            if (res.ok) {
                const invRes = await apiFetch(`${API_URL}/inventory`);
                if (invRes.ok) setInventory(await invRes.json());
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error returning KBB stock:", error);
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

    /**
     * Yerleşik kataloğu veritabanına toplu aktarır.
     * addDeviceModel her kayıt için ayrı bildirim gösterdiğinden burada
     * doğrudan API'ye gidilir ve sonunda tek özet bildirim verilir.
     * Mevcut kayıtlar silinmez; aynı isimli modeller atlanır.
     */
    const importDeviceModels = async (models) => {
        const existing = new Set(deviceModels.map(m => String(m.name || '').trim().toLocaleLowerCase('tr')));
        const pending = (models || []).filter(m => {
            const key = String(m?.name || '').trim().toLocaleLowerCase('tr');
            return key && !existing.has(key);
        });

        if (pending.length === 0) {
            showToast('Aktarılacak yeni model yok; katalog zaten güncel.', 'info');
            return { added: 0, failed: 0, skipped: (models || []).length };
        }

        const saved = [];
        let failed = 0;

        for (const model of pending) {
            try {
                const res = await apiFetch(`${API_URL}/device-models`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: model.name,
                        type: model.type,
                        configurations: model.configurations || [],
                        colors: model.colors || []
                    })
                });
                if (res.ok) saved.push(await res.json());
                else failed += 1;
            } catch (error) {
                console.error('Error importing device model:', model?.name, error);
                failed += 1;
            }
        }

        if (saved.length > 0) setDeviceModels(prev => [...prev, ...saved]);

        const skipped = (models || []).length - pending.length;
        if (failed === 0) {
            showToast(`${saved.length} cihaz modeli veritabanına aktarıldı.`, 'success');
        } else if (saved.length > 0) {
            showToast(`${saved.length} model aktarıldı, ${failed} tanesi başarısız oldu.`, 'warning');
        } else {
            showToast('Katalog aktarılamadı. Yetkinizi kontrol edin.', 'error');
        }

        return { added: saved.length, failed, skipped };
    };

    const getStoreRepairs = () => {
        if (!currentUser) return [];
        if (hasPermission(currentUser, 'view_all_stores')) {
            if (String(selectedStoreId) === '0') return repairs;
            return repairs.filter(r => String(r.storeId) === String(selectedStoreId));
        }
        // Erişim yetkisi olan mağazalar (tek veya çoklu)
        const allowed = getAccessibleStoreIds(currentUser).map(String);
        // Çoklu mağazalı kullanıcı kendi mağazalarından birini seçtiyse ona daralt
        if (selectedStoreId && String(selectedStoreId) !== '0' && allowed.includes(String(selectedStoreId))) {
            return repairs.filter(r => String(r.storeId) === String(selectedStoreId));
        }
        return repairs.filter(r => allowed.includes(String(r.storeId)));
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
    // Not: kapsam kuralı sunucudaki canViewAllStores ile birebir aynı olmalı.
    // Aksi halde sunucu tüm mağazalara izin verirken arayüz mağaza listesini
    // boş bırakıyor ve kullanıcı stok girişinde mağaza seçemiyordu.
    const visibleServicePoints = React.useMemo(() => {
        if (!currentUser) return [];
        if (isAdmin || hasPermission(currentUser, 'view_all_stores')) {
            return servicePoints;
        }
        // Erişim yetkisi olan mağazalar (çoklu destekli)
        const allowed = getAccessibleStoreIds(currentUser).map(String);
        return servicePoints.filter(sp => allowed.includes(String(sp.id)));
    }, [servicePoints, currentUser, isAdmin]);

    const filterByStore = React.useCallback((list, storeIdKey = 'storeId') => {
        if (!currentUser || !Array.isArray(list)) return [];
        // Kapsam kuralı visibleServicePoints ve getStoreRepairs ile aynı olmalı
        if (isAdmin || hasPermission(currentUser, 'view_all_stores')) {
            return selectedStoreId === 0 ? list : list.filter(item => String(item[storeIdKey]) === String(selectedStoreId));
        }
        // Erişim yetkisi olan mağazalar (tek veya çoklu)
        const allowed = getAccessibleStoreIds(currentUser).map(String);
        if (selectedStoreId && String(selectedStoreId) !== '0' && allowed.includes(String(selectedStoreId))) {
            return list.filter(item => String(item[storeIdKey]) === String(selectedStoreId));
        }
        return list.filter(item => allowed.includes(String(item[storeIdKey])));
    }, [currentUser, isAdmin, selectedStoreId]);

    /**
     * Envanter mağaza kapsamına göre süzülür; ancak bütün birim kodları
     * sistem geneli olduğu için hangi mağaza seçili olursa olsun listede kalır.
     */
    const scopedInventory = React.useMemo(() => {
        const scoped = filterByStore(inventory);
        const seen = new Set(scoped.map(item => item._id || item.id));
        const wholeUnits = inventory.filter(
            item => isWholeUnitItem(item) && !seen.has(item._id || item.id)
        );
        return wholeUnits.length ? [...scoped, ...wholeUnits] : scoped;
    }, [inventory, filterByStore]);

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
            inventory: scopedInventory,
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
            addCustomer, updateCustomer, removeCustomer, addInventoryItem, updateInventoryItem, removeInventoryItem, usePart, processStockMovement, transferInventorySerial, returnKbbStock, addEarning,
            emailSettings, setEmailSettings: (s) => { setEmailSettings(s); saveSettings('emailSettings', s); },
            companyProfile, setCompanyProfile: (p) => { setCompanyProfile(p); saveSettings('companyProfile', p); },
            notificationSettings, setNotificationSettings: (s) => { setNotificationSettings(s); saveSettings('notificationSettings', s); },
            notificationTemplates, setNotificationTemplates: (s) => { setNotificationTemplates(s); saveSettings('notificationTemplates', s); },
            serviceTerms, setServiceTerms: (s) => { setServiceTerms(s); saveSettings('serviceTerms', s); },
            roles, addRole, updateRole, deleteRole,
            deviceModels, addDeviceModel, updateDeviceModel, removeDeviceModel, importDeviceModels,
            selectedStoreId, setSelectedStoreId, showToast, alerts: alerts.filter(a => !clearedAlertIds.includes(a.id)), checkSLA, sendWhatsApp, uploadMedia, clearAllAlerts,
            recentActivity, satisfactionEntries, addSatisfactionEntry
        }}>
            {children}
            {toast.isVisible && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={hideToast} />}
        </AppContext.Provider>
    );
};
