import mongoose from 'mongoose';

const storeShiftSchema = new mongoose.Schema({
    storeId: { type: Number, required: true },
    userId: { type: String },
    userName: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    shiftType: { type: String, enum: ['Sabah', 'Akşam', 'Tam Gün', 'İzin', 'Diğer'], default: 'Tam Gün' },
    notes: { type: String }
}, { timestamps: true });

export default mongoose.models.StoreShift || mongoose.model('StoreShift', storeShiftSchema);
