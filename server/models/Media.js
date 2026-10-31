import mongoose from '../db/odm.js';

const mediaSchema = new mongoose.Schema({
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    name: { type: String }
}, { timestamps: true });

export default mongoose.models.Media || mongoose.model('Media', mediaSchema);
