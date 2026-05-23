import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mobile-asp';

import StoreShift from '../server/models/StoreShift.js';

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!');
        
        const newShift = new StoreShift({
            storeId: 1,
            userId: 'u1777101776508',
            userName: 'Faik Can Öz',
            date: new Date('2026-05-24'),
            startTime: '09:00',
            endTime: '18:00',
            shiftType: 'Tam Gün',
            notes: 'Test shift'
        });
        
        const saved = await newShift.save();
        console.log('Saved shift successfully!', saved);
        
        // Clean up test shift
        await StoreShift.deleteOne({ _id: saved._id });
        console.log('Cleaned up test shift.');
        
    } catch (err) {
        console.error('Validation/Save Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
