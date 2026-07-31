import mongoose from 'mongoose';

const earningSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    storeId: { type: Number, required: true },
    month: { type: String, required: true },
    amount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.Earning || mongoose.model('Earning', earningSchema);
