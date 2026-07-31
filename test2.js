import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./server/serviceAccountKey.json', 'utf8'));
console.log("Length of private_key from file:", serviceAccount.private_key.length);
console.log("Includes real newline:", serviceAccount.private_key.includes('\n'));
console.log("Includes literal \\n:", serviceAccount.private_key.includes('\\n'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
db.collection('users').limit(1).get().then(() => { console.log('OK'); process.exit(0); }).catch(e => { console.error('FAIL', e.message); process.exit(1); });
