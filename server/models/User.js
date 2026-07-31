import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Technician' },
    storeId: { type: Number, default: 1 },
    avatar: { type: String },
    lastLogin: { type: Date }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
