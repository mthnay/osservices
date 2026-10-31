import mongoose from '../db/odm.js';

const deviceModelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String },
    configurations: [String],
    colors: [String]
}, { timestamps: true });

export default mongoose.models.DeviceModel || mongoose.model('DeviceModel', deviceModelSchema);
