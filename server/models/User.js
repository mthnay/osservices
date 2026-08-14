import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Technician' },
    storeId: { type: Number, default: 1 }, // Birincil/varsayılan mağaza (geri uyumluluk)
    storeIds: [{ type: Number }], // Erişim yetkisi olan mağazalar (çoklu)
    avatar: { type: String },
    lastLogin: { type: Date },
    // Sisteme erişim kontrolü (Ayarlar > Sistem Güvenliği)
    isActive: { type: Boolean, default: true },
    disabledAt: { type: Date },
    disabledReason: { type: String },
    disabledBy: { type: String }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
