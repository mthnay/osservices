import mongoose from 'mongoose';

const technicianSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    expertise: [String],
    storeId: { type: Number, default: 1 }
}, { timestamps: true });

export default mongoose.models.Technician || mongoose.model('Technician', technicianSchema);
