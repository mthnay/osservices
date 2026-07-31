import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    repairId: { type: String, required: true },
    customerEmail: { type: String },
    customerPhone: { type: String },
    channel: { type: String, required: true }, // 'email', 'sms', 'whatsapp'
    message: { type: String, required: true },
    subject: { type: String },
    status: { type: String, default: 'success' },
    sentAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
