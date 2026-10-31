
import mongoose from './server/db/odm.js';
import dotenv from 'dotenv';
import ServicePoint from './server/models/ServicePoint.js';
import User from './server/models/User.js';

dotenv.config({ path: './server/.env' });

async function sync() {
    try {
        const uri = process.env.DATABASE_URL;
        console.log('Connecting to:', uri);
        await mongoose.connect(uri);

        const points = await ServicePoint.find({});
        if (points.length === 0) {
            console.log('No points found. Creating a default one...');
            const defaultPoint = new ServicePoint({
                id: Date.now(),
                name: 'İzmir MaviBahçe',
                type: 'Şube',
                shipTo: '6850',
                address: 'Mavibahçe AVM'
            });
            await defaultPoint.save();
            points.push(defaultPoint);
        }

        const targetId = points[0].id;
        console.log('Syncing all users to store ID:', targetId);

        const result = await User.updateMany({}, { storeId: targetId });
        console.log(`Updated ${result.modifiedCount} users.`);

        // Also ensure the first store has a Ship-To if it's missing
        if (!points[0].shipTo) {
            points[0].shipTo = '6850';
            await points[0].save();
            console.log('Added default Ship-To to store.');
        }

    } catch (err) {
        console.error('Error during sync:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

sync();
