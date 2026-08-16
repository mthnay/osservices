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
    // Müşteri portalı ve eski ekranlar bu şekli okur: { date, items: [{name, price}] }
    quotationDetails: { type: Object },
    // Onarım teklifinin yapılandırılmış kaydı. Karar mağazadan ya da müşteri
    // portalından gelebilir; iki kanal da buraya yazar.
    quote: {
        items: [{ name: String, price: Number }],
        amount: Number,
        note: String,
        sentAt: String,
        sentBy: String,
        decision: String,        // pending | approved | rejected
        decidedAt: String,
        decidedBy: String,
        decisionChannel: String, // store | portal
        rejectionReason: String
    },
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
        // Bütün Birim Posta akışı: cihaz komple Onarım Merkezi'ne gider.
        // Stok hareketi oluşmaz, seri numaraları parça değil cihaz bazlıdır.
        isWholeUnit: { type: Boolean, default: false },
        faultyDeviceSerial: String,      // Gönderilen arızalı cihaz
        replacementDeviceSerial: String, // Onarım merkezinden dönen cihaz
        needsOrder: Boolean,
        price: Number,
        status: { type: String, default: 'Pending' } // Pending, Ordered, Received, Installed
    }],
    // Bütün Birim Posta: Onarım Merkezi'nden (ARC) dönen sonucun kaydı.
    // Kod, ek alanları belirler; rapor her sonuçta zorunludur.
    arcOutcome: {
        code: String,   // unit-replaced | board-system-replaced | repaired | ntf | abuse | ber
        label: String,
        newSerial: String,
        newImei1: String,
        newImei2: String,
        previousSerial: String,
        previousImei1: String,
        previousImei2: String,
        replacedParts: [{
            partNumber: String,
            description: String,
            kbbSerial: String,
            kgbSerial: String
        }],
        report: String,
        recordedAt: String,
        recordedBy: String,
        status: String  // draft | final
    },
    shipmentCode: { type: String },
    appleRepairId: { type: String },
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
