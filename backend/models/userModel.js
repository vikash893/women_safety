const mongoose = require("mongoose");

const TrustedCircleSchema = mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

const UserSchema = mongoose.Schema(
  {
    uname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: [true, "This email is already in use"],
    },
    profile: {
      type: String,
    },
    phoneNo: {
      type: String,
      unique: [true, "This phone number is already in use"],
    },
    password: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    city: {
      type: String,
    },
    emergencyNo: {
      type: Number,
    },
    emergencyMail: {
      type: String,
    },
    pinCode: {
      type: Number,
    },
    address: {
      type: String,
    },
    role: {
      type: Number,
      enum: [0, 1, 2], // 0: User/Victim, 1: Volunteer, 2: Admin
      default: 0,
    },
    
    // Safety Profile Features
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
      default: ""
    },
    medicalNotes: {
      type: String,
      default: ""
    },

    // Volunteer Tracker Fields
    isOnline: {
      type: Boolean,
      default: false
    },
    currentCoords: {
      latitude: { type: Number, default: 28.6139 },
      longitude: { type: Number, default: 77.2090 }
    },
    responseCount: {
      type: Number,
      default: 0
    },
    suspicionScore: {
      type: Number,
      default: 0 // score calculated for fake alert detection
    },

    // Trusted Circles
    trustedCircles: [TrustedCircleSchema],

    // Security Refresh Tokens
    refreshToken: {
      type: String,
      default: null
    },

    extraphone1:{
      type: String
    },
    extraphone2:{
      type: String
    },
    extraEmail1:{
      type: String
    },
    extraEmail2:{
      type: String
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
module.exports = { User, UserSchema };
