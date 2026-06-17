import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function run() {
    const ids = ['S00004', 'S00005', 'S00006', 'TR-1001'];
    for (const id of ids) {
        const snap = await db.collection('repairs').where('repairId', '==', id).get();
        if (snap.empty) {
            console.log(id, 'Not Found');
        } else {
            const doc = snap.docs[0].data();
            console.log(id, 'image:', doc.image ? doc.image.substring(0, 100) : 'null');
            console.log(id, 'device:', doc.device);
        }
    }
}
run();
