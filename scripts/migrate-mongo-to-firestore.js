import mongoose from 'mongoose';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '../server/.env') });

// Setup Firebase Admin
const serviceAccountPath = path.join(__dirname, '../server/serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('CRITICAL: serviceAccountKey.json not found in server directory!');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Setup Mongoose
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI is not defined in .env file!');
    process.exit(1);
}

// Collections to migrate
const collections = [
    'auditlogs',
    'customers',
    'devicemodels',
    'earnings',
    'inventories',
    'media',
    'notifications',
    'repairs',
    'roles',
    'servicepoints',
    'storeannouncements',
    'storeshifts',
    'storetasks',
    'systemsettings',
    'technicians',
    'users'
];

async function migrateCollection(collectionName) {
    console.log(`Migrating collection: ${collectionName}...`);
    try {
        const docs = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        if (docs.length === 0) {
            console.log(`No documents found in ${collectionName}. Skipping.`);
            return;
        }

        const batchSize = 10;
        let batch = db.batch();
        let count = 0;

        for (const doc of docs) {
            const docId = doc._id.toString();
            // Deep clean the document
            const cleanData = JSON.parse(JSON.stringify(doc, (key, value) => {
                if (key === '_id' || key === '__v') return undefined; // remove _id and __v
                return value;
            }));
            
            const docRef = db.collection(collectionName).doc(docId);
            batch.set(docRef, cleanData);
            
            count++;
            if (count % batchSize === 0) {
                await batch.commit();
                console.log(`Committed ${count} documents for ${collectionName}...`);
                batch = db.batch();
            }
        }
        
        if (count % batchSize !== 0) {
            await batch.commit();
            console.log(`Committed remaining documents for ${collectionName}. Total: ${count}`);
        }
    } catch (err) {
        console.error(`Error migrating collection ${collectionName}:`, err);
    }
}

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        for (const coll of collections) {
            await migrateCollection(coll);
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
