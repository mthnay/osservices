import mongoose from './db/odm.js';
import dotenv from 'dotenv';
import Technician from './models/Technician.js';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

const deleteTechnicians = async () => {
    try {
        await mongoose.connect(DATABASE_URL);
        const result = await Technician.deleteMany({});
        console.log(`- Technicians deleted: ${result.deletedCount}`);
        process.exit(0);
    } catch (error) {
        console.error('Failed to delete technicians:', error);
        process.exit(1);
    }
};

deleteTechnicians();
