import { db } from './server/firebase.js';
import Media from './server/models/Media.js';

async function run() {
    try {
        console.log("Testing new Media().save()...");
        const m = new Media({ name: "test.png", data: Buffer.from("hello"), contentType: "image/png" });
        await m.save();
        console.log("Saved with ID:", m._id);
        
        console.log("Testing Media.find()...");
        const docs = await Media.find().exec();
        console.log("Docs found:", docs.length);
        
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
run();
