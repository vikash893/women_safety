const mongoose = require("mongoose");

const EmergencySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    lat: {
        type: Number,
        required: true
    },
    long: {
        type: Number,
        required: true
    },
    emergencyLctOnMap: {
        type: String,
    },
    addressOfIncd: {
        type: String
    },
    isResolved: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ["active", "responded", "resolved"],
        default: "active"
    },
    assignedVolunteers: [{
        volunteer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: { type: String, enum: ["navigating", "arrived"], default: "navigating" }
    }],
    riskScore: {
        type: Number,
        default: 0
    },
    suspicionScore: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Emergency = mongoose.model("Emergency", EmergencySchema);
module.exports = { Emergency };