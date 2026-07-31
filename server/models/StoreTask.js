import mongoose from 'mongoose';

const storeTaskSchema = new mongoose.Schema({
    storeId: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: String },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    dueDate: { type: Date },
    completedBy: { type: String }
}, { timestamps: true });

export default mongoose.models.StoreTask || mongoose.model('StoreTask', storeTaskSchema);
