import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    value: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.models.SystemSetting || mongoose.model('SystemSetting', systemSettingSchema);
