import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/mthnay/GitHub/osservices/server/.env' });

const MONGODB_URI = process.env.MONGODB_URI;

const systemSettingSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    value: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

const SystemSetting = mongoose.models.SystemSetting || mongoose.model('SystemSetting', systemSettingSchema);

const termsTitle = 'OSS - OPERATING SYSTEM SOFTWARE GENEL HİZMET SÖZLEŞMESİ';
const termsContent = `Bu Hüküm ve Koşullar OSS - Operating System Software tarafından ürününüz için sağlanacak servis hakkındaki kuralları belirler.

1. OSS - Operating System Software ürününüz için belirtilen servisi verir ve karşılığında Çalışma iznindeki ücretleri ve ilgili vergileri tahsil eder. OSS - Operating System Software, Apple Store ziyaretiniz sırasında verilen servisi müşteri başına bir (1) ürünle sınırlayabilir. Verilen hizmet Apple garantisi, uzatılmış hizmet sözleşmesi veya tüketici kanununun garanti hükümleri kapsamına giriyorsa, ilgili koşullar veya yürürlükteki yasa hükümleri uygulanır. OSS - Operating System Software verilerinizin sizin için önemli olabileceğini bilir. Servis sırasında verilerin kaybolma olasılığı her zaman vardır ve bazı durumlarda bu veriler kurtarılamayabilir, silinebilir veya yeniden biçimlendirilebilir. Bu nedenle, servise vermeden önce ürününüzdeki tüm verileri, yazılımı ve/veya programları yedeklemek ve bu tür verilerin ürününüzden silinip silinmeyeceğine karar vermek yalnızca sizin sorumluluğunuzdadır. OSS - Operating System Software, sağladığı hizmetlerden dolayı verilerin, yazılımın ya da programların kaybolması, kurtarılması veya bozulmasından sorumlu değildir veya ürününüz ya da diğer ekipmandaki kullanım kaybıyla ilgili sorumluluk kabul etmez. Ürününüzün yasa dışı dosyalar veya veriler içermediğini beyan edersiniz. Aygıtınızın servis verilmek üzere harici bir servis sağlayıcıya bir kargo firması aracılığıyla gönderilebileceğini kabul edersiniz. Bu nedenle, servis için göndermeden önce aygıtınızı yedeklemeniz ve silmeniz önerilir.

2. Servis ihtiyacı üründeki orijinal olmayan parçalar, yanlış ya da hatalı kullanım ya da dış sebeplerden dolayı oluştuysa, OSS - Operating System Software ürünü servise almadan size geri iade etme hakkını saklı tutar ve sizi ilgili tanılama ücretinden sorumlu tutabilir. OSS - Operating System Software, yetkisiz değişikliklerden veya Apple ya da bir AASP tarafından gerçekleştirilmemiş onarımlardan veya değişimlerden dolayı onarım sırasında üründe meydana gelen hasardan sorumlu tutulamaz. Hasar oluşması durumunda, ürün garanti veya AppleCare servis planı kapsamında olsa bile Apple servisin tamamlanması için ek masraflar konusunda sizin onayınızı isteyecektir. Onay vermeyi reddetmeniz durumunda, Apple ürününüzü hasarlı durumda, onarılmadan, hiçbir sorumluluğu olmaksızın iade edebilir.

3. OSS - Operating System Software, servisin bir parçası olarak, Apple ürününüzün sistem yazılımının önceki sürümlerine geri dönmesini önleyen sistem yazılımı güncellemeleri yükleyebilir. Apple ürününüze yüklenmiş üçüncü taraf uygulamaları, sistem yazılımı güncellemesi sonrasında Apple ürününüzle uyumlu olmayabilir veya çalışmayabilir.

4. Servis için bir önceki tanıda belirtilmeyen bir işçilik türü ve/veya parça gerektiğine karar verilirse, OSS - Operating System Software, gözden geçirilmiş servis ücreti için sizin onayınızı isteyebilir. OSS - Operating System Software'nın servis ücretini gözden geçirmesini kabul etmezseniz Apple ürününüzü iade edebilir ve sizi ilgili teşhisin ücretinden sorumlu tutabilir.

5. Apple, yasaların izin verdiği ölçüde, değişimi yapılan eski parçayı ya da ürünü kendi mülkiyetine alacak ve değişimi yapılan yeni parçanızın mülkiyetinizde olacaktır. Apple'ın yasal olarak değişimi yapılan parçayı gösterme ya da iade etme yükümlülüğü olduğunda Apple bu yükümlülüğünü yerine getirecektir.

6. Türkiye'de geçerli olan Tüketicinin Korunması Hakkında Kanun’a uymanın yanı sıra, Apple servisin yapıldığı tarihten itibaren aşağıdaki yetkinlikle ve ustalıkla uygulanacaktır ve (2) Apple tarafından aksi konularda 90 günlük bir garanti sağlamaktadır: (1) Servis süreci belirtilmediği sürece, ürününüzü onarmak için kullanılan parçalarda hiçbir malzeme ve ustalık hatası bulunmayacaktır. Apple ayrıca geçerli kanunlar çerçevesinde, Apple'ın Apple markalı taşınabilir takılan pillerde servis tarihinden itibaren bir (1) yıl süreyle malzeme Mac bilgisayarlara yönelik pil değiştirme servisinin bir parçası olarak ve işçilik hatası olmayacağını garanti eder. Sözü edilen garanti açık sınırlı bir garantidir ve ihlal edilmesi halinde Apple ya (i) servisi yeniden sağlayacaktır, (ii) parçayı tamir edecek veya değiştirecektir ya da (iii) sağlanan servisin bedelini iade edecektir. Bu garantiden yararlanabilmek için ürününüzü servisin sağlandığı yere geri götürmeniz gerekir. BU GARANTİ VE ONA BAĞLI ÇARELER, SÖZLÜ VEYA YAZILI, YA DA AÇIK VEYA ZIMNİ TÜM DİĞER GARANTİLERİN, ÇARELERİN VE ŞARTLARIN HARİCİNDEDİR VE ONLARIN YERİNE GEÇER. APPLE, SINIRLAMA OLMAKSIZIN, TİCARİ ELVERİŞLİLİK VE BİR AMACA UYGUNLUK GARANTİLERİ DAHİL OLMAK ÜZERE HERHANGİ VE TÜM ZIMNİ GARANTİLERİ ÖZELLİKLE REDDEDER. APPLE'IN YASALAR UYARINCA REDDEDEMEDİĞİ TÜM ZIMNİ GARANTİLER, AÇIK SINIRLI GARANTİNİN SÜRESİYLE SINIRLI OLACAKTIR. BAZI ÜLKELER, EYALETLER VE VİLAYETLER ZIMNİ GARANTİLERE (YA DA ŞARTLARA) SÜRE SINIRLAMASI GETİRMEYE İZİN VERMEMEKTEDİR. BU DURUMDA YUKARIDA BELİRTİLEN SINIRLAMA SİZİN İÇİN GEÇERLİ OLMAYABİLİR.

7. OSS - Operating System Software, APPLE VE BAĞLI ŞİRKETLERİ, ÇALIŞANLARI VE TEMSİLCİLERİ, YÜRÜRLÜKTEKİ YASALARIN İZİN VERDİĞİ AZAMİ ÖLÇÜDE, SAĞLANAN HİZMETLERDEN KAYNAKLANAN ÖZEL, DOLAYLI, ARIZA, BAĞLI ZARAR ZİYAN; YA DA BAŞKA BİR YASAL KURAM ALTINDA GELİR KAYBI, (SÖZLEŞME ÜZERİNDEKİ KARIN KAYBI DA DAHİL OLMAK ÜZERE) GERÇEK YA DA ÖNGÖRÜLEN KARIN KAYBI, PARA KULLANIMININ KAYBI, ÖNGÖRÜLEN TASARRUFUN KAYBI; İŞ KAYBI; FIRSAT KAYBI; İYİ NİYET KAYBI; İTİBAR KAYBI, VERİLERİN KAYBI, ZARAR GÖRMESİ YA DA BOZULMASI; YENİDEN PROGRAMLAMA YA DA ÜRÜNÜNÜZDE SAKLANAN YA DA KULLANILAN PROGRAM YA DA VERİLERİN ESKİ HALİNE GETİRİLMESİ VE ÜRÜNÜNÜZDE SAKLANAN VERİLERİN GİZLİLİĞİNİ KORUYAMAMAKTAN KAYNAKLANAN MALİYETLERİN HİÇBİRİ İÇİN, HİÇBİR DURUMDA SORUMLU OLMAYACAKTIR. BU SINIRLAMA ÖLÜM YA DA KİŞİSEL YARALANMA; BİLEREK İHMAL YA DA AĞIR KUSURDAN KAYNAKLI ZARARLAR İLE İLGİLİ HAK TALEPLERİ İÇİN GEÇERLİ OLMAYACAKTIR. APPLE (i) ÜRÜNÜNÜZÜ YAZILIM PROGRAMLARINI VEYA VERİLERİ RİSKE ETMEDEN VEYA KAYBETMEDEN ONARABİLECEĞİNİ VEYA DEĞİŞTİREBİLECEĞİNİ VE (ii) VERİLERİN GİZLİLİĞİNİ KORUYABİLECEĞİNİ ÖZEL OLARAK GARANTİ VEYA TAAHHÜT ETMEMEKTE VEYA BUNUN SÖZÜNÜ VERMEMEKTEDİR. HERHANGİ BİR ÜRÜNÜN APPLE KORUMASI ALTINDAYKEN ZARAR GÖRMESİ YA DA KAYBOLMASI HALİNDE APPLE'IN SORUMLULUĞU ETKİLENEN ÜRÜNÜN ONARIMI YA DA DEĞİŞİMİYLE SINIRLI OLACAKTIR. AKSİ DURUMDA, APPLE'IN TÜM ZARARLAR İÇİN SORUMLULUĞU APPLE'IN BU HÜKÜMLER UYARINCA SAĞLADIĞI SERVİS İÇİN ALDIĞI ÖDEMELERİ HİÇBİR ŞEKİLDE GEÇEMEYECEKTİR. BURADA BELİRTİLEN ÇARELER, BU HÜKÜM VE KOŞULLAR ALTINDA APPLE'IN HERHANGİ BİR İHLAL İÇİN ELDE EDEBİLECEĞİNİZ TEK VE YEGANE ÇARE OLACAKTIR.

8. OSS - Operating System Software ürününüze sağlanan servisin tamamlandığına dair sizi bilgilendirdikten sonra doksan (90) gün içinde ürünü almaya gelmemeniz ve ödemeniz gereken ücretleri ödememeniz halinde Apple ürününüzü terk edilmiş sayacaktır ve yürürlükteki yasalar uyarınca ürününüzü elden çıkarma hakkına sahiptir.

9. Sağlanan hizmet veri aktarımı ya da yazılım kurulumu içeriyorsa, verileri aktarmaya yetkiniz olduğunu ve yazılım lisansının koşullarını kabul ettiğinizi, Apple'a veriyi aktarması ve sizin adınıza bu tür koşulları kabul etmesi için yetki verdiğinizi kabul etmiş sayılırsınız.

10. Bu Hüküm ve Koşullar, (kanunlar ihtilafı kuralları hariç olmak üzere) Türkiye Cumhuriyeti yasalarına tabidir.

11. Yalnızca bu Hüküm ve Koşullar OSS - Operating System Software ürününüz için sağladığı hizmetin kurallarını belirler.

12. Apple'ın Bu Hüküm ve Koşullardaki hizmet ve destek yükümlülüklerini yerine getirmek için sizin kişisel bilgilerinizi toplaması, işlemesi ve kullanması gerektiğini kabul eder ve anlarsınız. Apple, bilgilerinizi www.apple.com/tr/privacy sayfasında bulabileceğiniz Apple'ın Gizlilik Politikasına uygun olarak koruyacaktır.`;

const approvalText = "Müşteri olarak, yukarıdaki sözleşme metnini, teknik riskleri okudum, anladım ve cihazımı bu şartlar altında teslim ediyorum.";
const kvkkText = "Kişisel verileriniz KVKK kapsamında işlenmektedir. Aydınlatma metnini ve verilerimin işlenmesini onaylıyorum.";

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");
        
        const value = {
            termsTitle,
            termsContent,
            approvalText,
            kvkkText
        };
        
        await SystemSetting.findOneAndUpdate(
            { key: 'serviceTerms' },
            { value },
            { new: true, upsert: true }
        );
        
        console.log("serviceTerms updated successfully in DB.");
        await mongoose.disconnect();
    } catch (e) {
        console.error("Error updating serviceTerms:", e);
    }
}

run();
