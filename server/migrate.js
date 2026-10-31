import mongoose from './db/odm.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Models
import User from './models/User.js';
import Repair from './models/Repair.js';
import Inventory from './models/Inventory.js';
import ServicePoint from './models/ServicePoint.js';
import SystemSetting from './models/SystemSetting.js';
import Earning from './models/Earning.js';
import Customer from './models/Customer.js';
import DeviceModel from './models/DeviceModel.js';
import Technician from './models/Technician.js';
import Media from './models/Media.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const DATA_DIR = path.join(process.cwd(), 'local-data');
const DATABASE_URL = process.env.DATABASE_URL;

async function migrate() {
    console.log('--- Database Migration Started ---');
    
    try {
        await mongoose.connect(DATABASE_URL);
        console.log('Connected to MongoDB');

        const modelsMap = {
            'User': User,
            'Repair': Repair,
            'Inventory': Inventory,
            'ServicePoint': ServicePoint,
            'SystemSetting': SystemSetting,
            'Earning': Earning,
            'Customer': Customer,
            'DeviceModel': DeviceModel,
            'Technician': Technician,
            'Media': Media
        };

        for (const [name, Model] of Object.entries(modelsMap)) {
            const filePath = path.join(DATA_DIR, `${name}.json`);
            
            if (fs.existsSync(filePath)) {
                console.log(`Processing ${name}...`);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                if (data && data.length > 0) {
                    // Check if already migrated or has data
                    const count = await Model.countDocuments();
                    if (count === 0) {
                        // Remove incompatible legacy _id fields so Atlas can generate valid ones
                        const cleanedData = data.map(item => {
                            const { _id, ...rest } = item;
                            return rest;
                        });
                        await Model.insertMany(cleanedData);
                        console.log(`✅ Successfully migrated ${data.length} records for ${name}`);
                    } else {
                        console.log(`⚠️  ${name} already has ${count} records. Skipping to prevent duplicates.`);
                    }
                } else {
                    console.log(`ℹ️  No data found in ${name}.json`);
                }
            } else {
                console.log(`❌  ${name}.json not found in local-data directory.`);
            }
        }

        console.log('--- Migration Completed Successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
