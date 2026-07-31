import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    tc: { type: String },
    type: { type: String, default: 'bireysel' },
    notes: { type: String },
    storeId: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);
