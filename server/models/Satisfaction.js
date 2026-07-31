import mongoose from 'mongoose';

const satisfactionSchema = new mongoose.Schema({
    storeId: { type: Number, required: true },
    date: { type: String, required: true }, // Gün anahtarı: 'YYYY-MM-DD'
    satisfied: { type: Number, default: 0 },     // Memnun müşteri adedi
    neutral: { type: Number, default: 0 },       // Nötr
    dissatisfied: { type: Number, default: 0 },  // Memnun olmayan
    createdBy: { type: String },
    userId: { type: String },
}, { timestamps: true });

// Her mağaza için gün başına tek kayıt (upsert)
satisfactionSchema.index({ storeId: 1, date: 1 }, { unique: true });

export default mongoose.models.Satisfaction || mongoose.model('Satisfaction', satisfactionSchema);
