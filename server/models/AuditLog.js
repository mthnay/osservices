import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String },
    action: { type: String, required: true }, // e.g., 'CREATE_REPAIR', 'TRANSFER_STOCK', 'LOGIN'
    module: { type: String, required: true }, // e.g., 'INVENTORY', 'REPAIR', 'AUTH'
    details: { type: String }, // JSON string or description
    ipAddress: { type: String },
    storeId: { type: Number },
}, { timestamps: true });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
