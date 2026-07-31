import mongoose from 'mongoose';

const repairSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    device: { type: String, required: true },
    customer: { type: String, required: true },
    customerPhone: { type: String },
    customerEmail: { type: String },
    customerAddress: { type: String },
    tcNo: { type: String },
    taxOffice: { type: String },
    customerSignature: { type: String },
    status: { type: String, default: 'Beklemede' },
    date: { type: String },
    storeId: { type: Number, default: 1 },
    serial: { type: String },
    imei1: { type: String },
    imei2: { type: String },
    warrantyStatus: { type: String },
    visualCondition: [String],
    findMyOff: { type: Boolean, default: false },
    backupTaken: { type: Boolean, default: false },
    issue: { type: String },
    diagnosisNotes: { type: String },
    tests: { type: String },
    quoteAmount: { type: String },
    quotationDetails: { type: Object },
    repairClosingNote: { type: String },
    steps: [{
        id: Number,
        label: String,
        checked: Boolean
    }],
    parts: [{
        id: String,
        inventoryId: String,
        description: String,
        partNumber: String,
        kgbSerial: String,  // New Part Serial
        kbbSerial: String,  // Old Part Serial
        price: Number,
        status: { type: String, default: 'Pending' } // Pending, Ordered, Received, Installed
    }],
    beforeImages: [String],
    afterImages: [String],
    mediaFiles: [{
        url: String,
        id: String
    }],
    technician: { type: String },
    technicianId: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    history: [{
        status: String,
        date: String,
        note: String
    }],
    internalNotes: [{
        text: String,
        date: String,
        user: String
    }],
    feedback: {
        score: { type: Number, min: 1, max: 5 },
        comment: String,
        createdAt: { type: Date }
    }
}, { timestamps: true, strict: false });

export default mongoose.models.Repair || mongoose.model('Repair', repairSchema);
