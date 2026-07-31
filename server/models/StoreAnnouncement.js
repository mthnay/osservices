import mongoose from 'mongoose';

const storeAnnouncementSchema = new mongoose.Schema({
    storeId: { type: Number, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true }
}, { timestamps: true });

export default mongoose.models.StoreAnnouncement || mongoose.model('StoreAnnouncement', storeAnnouncementSchema);
