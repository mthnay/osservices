import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Render üzerinden (veya .env üzerinden) JSON string olarak geliyorsa
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error('CRITICAL ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT env variable!');
        process.exit(1);
    }
} else {
    // Yerel geliştirme ortamı için dosyadan oku
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    if (!fs.existsSync(serviceAccountPath)) {
        console.error('CRITICAL ERROR: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT is not set!');
        process.exit(1);
    }
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
}

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

export const db = getFirestore();
