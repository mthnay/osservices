import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mobile-asp';

const spSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.Mixed,
    name: String
}, { strict: false });

const ServicePoint = mongoose.model('ServicePoint', spSchema);

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const sps = await ServicePoint.find({});
        console.log('\n--- SERVICE POINTS IN DATABASE ---');
        sps.forEach(sp => {
            console.log(`Name: ${sp.name}, ID (id field): ${sp.id}, Mongoose _id: ${sp._id}, type: ${typeof sp.id}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
