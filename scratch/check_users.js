import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mobile-asp';

console.log('Connecting to database:', MONGODB_URI);

const userSchema = new mongoose.Schema({
    id: String,
    name: String,
    email: String,
    role: String,
    storeId: Number
}, { strict: false });

const User = mongoose.model('User', userSchema);

const storeShiftSchema = new mongoose.Schema({
    storeId: Number,
    userId: String,
    userName: String,
    date: Date,
    startTime: String,
    endTime: String,
    shiftType: String,
    notes: String
}, { strict: false });

const StoreShift = mongoose.model('StoreShift', storeShiftSchema);

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully!');
        
        const users = await User.find({});
        console.log('\n--- USERS IN DATABASE ---');
        users.forEach(u => {
            console.log(`Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, StoreId: ${u.storeId}, ID: ${u.id || u._id}`);
        });

        const shifts = await StoreShift.find({});
        console.log('\n--- SHIFTS IN DATABASE ---');
        shifts.forEach(s => {
            console.log(`User: ${s.userName}, Date: ${s.date}, Type: ${s.shiftType}, Time: ${s.startTime}-${s.endTime}, StoreId: ${s.storeId}`);
        });
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
