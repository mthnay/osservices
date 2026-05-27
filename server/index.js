import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import apiRoutes from './routes.js';
import { seedData } from './seeder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import mongoose from 'mongoose';

const app = express();
const PORT = process.env.PORT || 5001;

// --- database connection ---
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('CRITICAL ERROR: MONGODB_URI is not defined in .env file!');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('SUCCESS: Connected to MongoDB Atlas');
        try { mongoose.connection.db.collection('inventories').dropIndex('id_1').catch(()=>null); } catch (e) {}
        await seedData();
    })
    .catch(err => {
        console.error('CRITICAL: MongoDB connection error:', err);
        console.error('ERROR CODE:', err.code);
        console.error('ERROR MESSAGE:', err.message);
        
        if (err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED')) {
            console.log('TIP: This might be an IP Whitelist issue. Ensure 0.0.0.0/0 is allowed in MongoDB Atlas Network Access.');
        }
        
        console.log('WARNING: System is starting without database connection. Some features may not work.');
    });

// --- Security Middleware ---
// Render proxy ayarı (Rate limit ve IP tespiti için gerekli)
app.set('trust proxy', 1);

// CORS en başta olmalı ki preflight (OPTIONS) istekleri bloklanmasın
app.use(cors()); 

// Helmet ayarları esnetildi (Frontend'in bozulmaması için CSP kapatıldı)
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Rate Limit aktif edildi (DDoS ve Brute Force koruması)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 10000, // Geliştirme ortamında HMR sorunlarını önlemek için artırıldı
    message: 'Çok fazla istek gönderildi, lütfen biraz bekleyin.'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API İsteklerini Logla - Hata ayıklama için
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// API Routes
app.use('/api', apiRoutes);

// Dosya Yükleme Ayarları - Production'da yazılabilir bir klasör seçelim
const isPackaged = process.env.NODE_ENV === 'production';
const uploadDir = isPackaged
    ? path.join(process.env.USER_DATA_PATH || process.cwd(), 'troy-uploads')
    : path.resolve(__dirname, '../uploads');

const assetsDir = __dirname;

console.log('Upload directory:', uploadDir);

if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
        console.error('Failed to create upload directory:', err);
    }
}

app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Her zaman aynı isimle kaydedelim ki üzerine yazsın (tek dosya mantığı)
        cb(null, 'generic_attachment.pdf');
    }
});

const upload = multer({ storage: storage });

// Dosya Yükleme Endpoint'i
app.post('/api/upload-attachment', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Dosya seçilmedi.' });
    }
    res.json({ success: true, message: 'Dosya başarıyla yüklendi ve varsayılan olarak ayarlandı.' });
});

// Kayıtlı dosya bilgisini kontrol etme
app.get('/api/check-attachment', (req, res) => {
    const filePath = path.join(uploadDir, 'generic_attachment.pdf');
    if (fs.existsSync(filePath)) {
        res.json({ exists: true, name: 'Varsayılan Bilgilendirme (PDF)' });
    } else {
        res.json({ exists: false });
    }
});

// Dosya Silme
app.delete('/api/delete-attachment', (req, res) => {
    const filePath = path.join(uploadDir, 'generic_attachment.pdf');
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'Dosya silindi.' });
    } else {
        res.json({ success: false, message: 'Silinecek dosya bulunamadı.' });
    }
});


// E-posta gönderme endpoint'i
app.post('/api/send-email', async (req, res) => {
    const { to, subject, body, auth } = req.body;

    if (!auth || !auth.user || !auth.pass) {
        return res.status(400).json({
            success: false,
            message: 'Mail ayarları eksik. Lütfen ayarlardan giriş yapın.'
        });
    }

    // SMTP Ayarları
    const transporter = nodemailer.createTransport({
        host: auth.host || 'mail.troyapr.com',
        port: auth.port || 587,
        secure: auth.port == 465,
        auth: {
            user: auth.user,
            pass: auth.pass,
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 10000, // 10 saniye içinde bağlanamazsa hata ver
        greetingTimeout: 10000,   // Karşılama mesajı için 10 saniye
        socketTimeout: 20000,     // İşlem sırasında 20 saniye bekler
    });

    // Ekleri hazırla
    const attachments = [];

    // 1. Dinamik PDF (Frontend'den gelen)
    const { pdfData, pdfName } = req.body;
    if (pdfData) {
        // Base64 veri kontrolü ve ayırma - String splitting büyük dosyalarda CPU bloklayabilir
        // Daha güvenli ve performanslı bir yöntem deneyelim
        try {
            const base64Data = pdfData.includes("base64,") ? pdfData.split("base64,")[1] : pdfData;
            attachments.push({
                filename: pdfName || 'ServisFormu.pdf',
                content: Buffer.from(base64Data, 'base64'),
            });
        } catch (e) {
            console.error("PDF Parsing error:", e);
        }
    }

    // 2. Sunucudaki Sabit Ek (Varsa)
    const attachmentPath = path.join(uploadDir, 'generic_attachment.pdf');

    if (fs.existsSync(attachmentPath)) {
        attachments.push({
            filename: 'Bilgilendirme.pdf', // Müşteriye görünecek isim
            path: attachmentPath
        });
    }

    // İmza logosunu ekle (eğer varsa)
    const logoPath = path.join(__dirname, 'signature_logo.png');
    if (fs.existsSync(logoPath)) {
        attachments.push({
            filename: 'signature_logo.png',
            path: logoPath,
            cid: 'signature_logo' // HTML içinde kullanmak için
        });
    }

    const mailOptions = {
        from: `Troy Teknik Servis <${auth.user}>`,
        to: to,
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
                ${body.replace(/\n/g, '<br>')}
                <br><br>
                <img src="cid:signature_logo" width="150" style="display: block; margin-top: 20px;" alt="Troy Logo">
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 11px; color: #999;">Bu e-posta Troy Apple Yetkili Servis Sağlayıcısı tarafından otomatik olarak gönderilmiştir.</p>
            </div>
        `,
        attachments: attachments
    };

    // E-posta gönderimini bir timeout ile sarmalayalım ki sunucu sonsuza kadar asılı kalmasın
    const sendEmailWithTimeout = (mailOptions, timeoutMs = 15000) => {
        return Promise.race([
            transporter.sendMail(mailOptions),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('E-posta sunucusu zaman aşımına uğradı (Timeout). Lütfen internetinizi veya mail ayarlarınızı kontrol edin.')), timeoutMs)
            )
        ]);
    };

    try {
        console.log(`Sending email to ${to}...`);
        const info = await sendEmailWithTimeout(mailOptions);
        console.log('Email sent: ' + info.response);
        res.status(200).json({ success: true, message: 'Email başarıyla gönderildi!' });
    } catch (error) {
        console.error('Email Error Details:', error);
        
        let errorMessage = 'E-posta gönderilirken bir hata oluştu.';
        
        if (error.message.includes('Timeout')) {
            errorMessage = error.message;
        } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            errorMessage = 'E-posta sunucusuna bağlanılamadı. Lütfen internetinizi veya mail sunucu adresini kontrol edin.';
        } else if (error.code === 'EAUTH') {
            errorMessage = 'E-posta kullanıcı adı veya şifre hatalı. Lütfen ayarlarınızı kontrol edin.';
        }
            
        res.status(500).json({ 
            success: false, 
            message: errorMessage, 
            error: error.message 
        });
    }
});

// Production Modu: Frontend dosyalarını sun
const distDir = path.resolve(__dirname, '../dist');
console.log('Static files directory check:', distDir);

if (fs.existsSync(distDir)) {
    console.log('Serving static files from:', distDir);
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(404).json({ success: false, message: 'API endpoint bulunamadı.' });
        }
        // Set Cache-Control header to prevent caching of index.html in Single Page Apps
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path.join(distDir, 'index.html'));
    });
} else {
    console.warn('WARNING: Dist directory not found at', distDir);
    app.get('*', (req, res) => {
        res.status(404).send('Uygulama dosyaları (dist) bulunamadı. Lütfen "npm run build" komutunu çalıştırın.');
    });
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Email/API server running on port ${PORT} (Listening on 0.0.0.0)`);
});
