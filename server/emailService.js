import nodemailer from 'nodemailer';
import SystemSetting from './models/SystemSetting.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Otomatik E-Posta Bildirim Servisi
 */
export const sendAutomatedEmail = async (repair, statusType) => {
    try {
        // 1. Ayarları Veritabanından Al
        const emailConfigSetting = await SystemSetting.findOne({ key: 'emailConfig' });
        if (!emailConfigSetting || !emailConfigSetting.value) {
            console.warn('[EmailService] Email ayarları bulunamadı. Gönderim iptal edildi.');
            return;
        }

        const auth = emailConfigSetting.value;

        // 2. SMTP Transporter Yapılandır (Microsoft Exchange Zorunlu)
        const transporter = nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false, // 587 portu için STARTTLS kullanılır
            requireTLS: true,
            auth: {
                user: auth.user,
                pass: auth.pass,
            },
            tls: { ciphers: 'SSLv3', rejectUnauthorized: false },
            connectionTimeout: 10000,
        });

        // 3. Şablon ve İçerik Belirle
        let subject = '';
        let templateTitle = '';
        let templateContent = '';
        let accentColor = '#0071e3'; // Apple Blue

        switch (statusType) {
            case 'Beklemede':
            case 'Kabul':
                subject = `Servis Kaydınız Alındı: #${repair.id} - ${repair.device}`;
                templateTitle = 'Cihazınız Servisimize Ulaştı';
                templateContent = `
                    Sayın <strong>${repair.customer}</strong>,<br><br>
                    <strong>${repair.device}</strong> cihazınız servisimize başarıyla kabul edilmiştir. 
                    Apple standartlarında incelenip en kısa sürede tarafınıza bilgi verilecektir.<br><br>
                    <strong>Takip No:</strong> ${repair.id}<br>
                    <strong>Durum:</strong> ${repair.status || 'Kabul Edildi'}
                `;
                break;
            
            case 'Cihaz Hazır':
            case 'Hazır':
                subject = `Onarım Tamamlandı: #${repair.id} - ${repair.device}`;
                templateTitle = 'Cihazınız Hazır!';
                accentColor = '#28a745'; // Green
                templateContent = `
                    İyi haber! <strong>${repair.device}</strong> cihazınızın onarım süreci başarıyla tamamlanmıştır. 
                    Cihazınızı mağazamızdan dilediğiniz zaman teslim alabilirsiniz.<br><br>
                    <strong>Servis Kaydı:</strong> #${repair.id}<br>
                    <strong>Çalışma Saatleri:</strong> 10:00 - 18:00
                `;
                break;

            case 'Müşteri Onayı Bekliyor':
                subject = `Servis Teklifi: #${repair.id} - ${repair.device}`;
                templateTitle = 'İşleminiz İçin Onay Bekleniyor';
                templateContent = `
                    Cihazınızın arıza tespit süreci tamamlanmıştır. Onarıma devam edilebilmesi için onayınız gerekmektedir.<br><br>
                    <strong>Teklif Tutarı:</strong> ${repair.quoteAmount} TL<br>
                    <strong>Açıklama:</strong> ${repair.diagnosisNotes || 'Genel onarım süreci.'}<br><br>
                    Lütfen müşteri portalı üzerinden veya servisimizle iletişime geçerek kararınızı bildiriniz.
                `;
                break;

            case 'Teslim Edildi':
                subject = `Cihazınız Teslim Edildi: #${repair.id}`;
                templateTitle = 'Bizi Tercih Ettiğiniz İçin Teşekkürler';
                templateContent = `
                    Cihazınız bugün itibariyle teslim edilmiştir. 
                    Troy Apple Yetkili Servis Sağlayıcısı olarak sizlere hizmet vermekten mutluluk duyduk.<br><br>
                    Yaptığımız işlemleri kontrol etmeyi ve görüşlerinizi bizimle paylaşmayı unutmayın.
                `;
                break;

            default:
                subject = `Servis Güncellemesi: #${repair.id}`;
                templateTitle = 'Servis Durumunda Güncelleme';
                templateContent = `
                    Cihazınızın servis durumunda bir güncelleme mevcuttur.<br><br>
                    <strong>Yeni Durum:</strong> ${repair.status}<br>
                `;
        }

        // 4. HTML Gövdesini Oluştur (Modern Apple Estetiği)
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f5f5f7; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                    .header { background-color: #ffffff; padding: 40px 20px; text-align: center; }
                    .content { padding: 40px; color: #1d1d1f; }
                    .title { color: ${accentColor}; font-size: 24px; font-weight: 700; margin-bottom: 20px; }
                    .footer { background-color: #f5f5f7; padding: 20px; text-align: center; font-size: 11px; color: #86868b; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #0071e3; color: white; text-decoration: none; border-radius: 980px; font-weight: 600; margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <img src="cid:signature_logo" width="120" alt="Troy Logo">
                    </div>
                    <div class="content">
                        <div class="title">${templateTitle}</div>
                        <p style="font-size: 15px; line-height: 1.6;">${templateContent}</p>
                        <a href="https://troyapr.com/servis-takip" class="button">Servis Durumunu İncele</a>
                    </div>
                    <div class="footer">
                        Bu bir otomatik bilgilendirme e-postasıdır. Lütfen bu adrese yanıt vermeyiniz.<br>
                        Troy Apple Yetkili Servis Sağlayıcısı &copy; ${new Date().getFullYear()}
                    </div>
                </div>
            </body>
            </html>
        `;

        // 5. Ekleri Hazırla
        const attachments = [];
        const logoPath = path.join(__dirname, 'signature_logo.png');
        if (fs.existsSync(logoPath)) {
            attachments.push({
                filename: 'logo.png',
                path: logoPath,
                cid: 'signature_logo'
            });
        }

        // 6. Gönder
        const info = await transporter.sendMail({
            from: `"Troy Apple Yetkili Servis" <${auth.user}>`,
            to: repair.customerEmail || repair.email, // Hem schema hem de legacy destekli
            cc: 'servis.mavibahce@artitroy.com',
            subject: subject,
            html: html,
            attachments: attachments
        });

        console.log(`[EmailService] Otomatik e-posta gönderildi: ${statusType} -> ${repair.customerEmail || repair.email}`);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('[EmailService] HATA:', error);
        return { success: false, error: error.message };
    }
};
