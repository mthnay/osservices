import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const key = JSON.parse(fs.readFileSync('./server/serviceAccountKey.json', 'utf8'));

// Test setting the env var exactly as Render would have it
process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(key);

let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
} catch(e) {
    console.error('Parse error', e);
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();
db.collection('users').limit(1).get().then(snapshot => {
    console.log('SUCCESS, fetched ' + snapshot.docs.length + ' docs');
    process.exit(0);
}).catch(err => {
    console.error('FETCH ERROR:', err);
    process.exit(1);
});
