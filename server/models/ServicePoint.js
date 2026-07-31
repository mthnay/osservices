import mongoose from 'mongoose';

const servicePointSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    name: { type: String, required: true },
    type: { type: String, default: 'Şube' },
    address: { type: String },
    phone: { type: String },
    shipTo: { type: String, unique: true }
}, { timestamps: true });

export default mongoose.models.ServicePoint || mongoose.model('ServicePoint', servicePointSchema);
