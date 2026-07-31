import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false }
});

export default mongoose.model('Role', roleSchema);
