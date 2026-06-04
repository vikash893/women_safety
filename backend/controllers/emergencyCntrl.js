const asyncHandler = require("express-async-handler");
const { User } = require("../models/userModel");
const { Emergency } = require("../models/emergencyModel");
const { calculateRiskScore } = require("../utils/riskEngine");
const { detectFakeAlert } = require("../utils/fakeAlertDetector");
const { findNearestVolunteers } = require("../utils/matchingEngine");
const { dispatchEmergencyNotifications } = require("../utils/notifications");
const axios = require("axios");

/**
 * Reverse geocodes coordinates to a readable address.
 * Falls back to local defaults if API is unresponsive.
 */
const reverseGeocode = async (lat, long) => {
  try {
    const apiKey = process.env.MAPMYINDIA_API_KEY || "efd1bc9e76b7a36cb990af517a48f3c3";
    const url = `https://apis.mapmyindia.com/advancedmaps/v1/${apiKey}/rev_geocode?lat=${lat}&lng=${long}`;
    const { data } = await axios.get(url, { timeout: 3000 });
    if (data && data.results && data.results[0]) {
      return {
        pincode: data.results[0].pincode,
        formattedAddress: data.results[0].formatted_address
      };
    }
  } catch (err) {
    console.warn("[Geocode] MapMyIndia lookup failed, trying fallback Nominatim...");
    try {
      const fallbackUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}`;
      const { data } = await axios.get(fallbackUrl, {
        headers: { "User-Agent": "AegisHerSafetyPlatform/1.0" },
        timeout: 3000
      });
      if (data) {
        return {
          pincode: data.address.postcode || "110001",
          formattedAddress: data.display_name
        };
      }
    } catch (fallbackErr) {
      console.error("[Geocode] Nominatim lookup also failed:", fallbackErr.message);
    }
  }
  return { pincode: "110001", formattedAddress: "Coordinates Locked Location" };
};

const sendemergencyCntrl = asyncHandler(async (req, res) => {
  const { userId, lat, long } = req.body;

  if (!lat || !long) {
    return res.status(400).json({ message: "Latitude or longitude coordinates missing." });
  }

  // 1. Load User safety circle contacts
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // 2. Fetch Reverse Geolocation
  const geo = await reverseGeocode(lat, long);

  // 3. Run AI risk engine assessment
  const riskAnalysis = await calculateRiskScore(lat, long, geo.pincode);

  // 4. Run suspicious behavior analysis (Fake alarm filter)
  const suspicionAnalysis = await detectFakeAlert(userId, lat, long);

  if (suspicionAnalysis.action === "restrict") {
    return res.status(403).json({
      message: "SOS trigger blocked. " + suspicionAnalysis.message,
      suspicionScore: suspicionAnalysis.suspicionScore
    });
  }

  // 5. Match nearest volunteers within 3.0 km
  const matchedResponders = await findNearestVolunteers(lat, long, 3.0);

  // Extract contact fields
  const emergencyMailList = [];
  if (user.emergencyMail) emergencyMailList.push({ email: user.emergencyMail, phoneNumber: user.emergencyNo });
  if (user.extraEmail1) emergencyMailList.push({ email: user.extraEmail1, phoneNumber: user.extraphone1 });
  if (user.extraEmail2) emergencyMailList.push({ email: user.extraEmail2, phoneNumber: user.extraphone2 });

  // Map matched volunteers details
  const volEmails = matchedResponders.map(r => r.volunteer.email).filter(Boolean);
  const volPhones = matchedResponders.map(r => r.volunteer.phoneNo).filter(Boolean);

  // Create Emergency session
  const emergency = await Emergency.create({
    user: userId,
    lat,
    long,
    emergencyLctOnMap: `https://maps.google.com/maps?q=${lat},${long}&hl=en&z=14`,
    addressOfIncd: geo.formattedAddress,
    riskScore: riskAnalysis.riskScore,
    suspicionScore: suspicionAnalysis.suspicionScore,
    assignedVolunteers: matchedResponders.map(r => ({
      volunteer: r.volunteer._id,
      status: "navigating"
    }))
  });

  // 6. Broadcast notifications out to emergency nodes asynchronously
  dispatchEmergencyNotifications({
    alertId: emergency._id,
    victimName: user.uname,
    lat,
    long,
    address: geo.formattedAddress,
    pincode: geo.pincode,
    contactsList: emergencyMailList,
    volunteerEmails: volEmails,
    volunteerPhones: volPhones
  }).catch(err => console.error("[Notifications] Dispatched alerts error:", err));

  res.status(200).json({
    message: "Distress SOS signal activated successfully.",
    incidentId: emergency._id,
    riskScore: riskAnalysis.riskScore,
    suspicionScore: suspicionAnalysis.suspicionScore,
    matchedVolunteers: matchedResponders.map(r => ({
      id: r.volunteer._id,
      name: r.volunteer.uname,
      phoneNumber: r.volunteer.phoneNo,
      distanceKm: r.distance
    }))
  });
});

const getAllEmergencies = asyncHandler(async (req, res) => {
  const data = [];
  const emergencies = await Emergency.find({}).sort({ createdAt: -1 });

  for (const x of emergencies) {
    const user = await User.findById(x.user);
    if (user) {
      data.push({
        _id: x._id,
        lat: x.lat,
        long: x.long,
        mapLct: x.emergencyLctOnMap,
        addressOfInc: x.addressOfIncd,
        username: user.uname,
        userId: user._id,
        emergencyNo: user.emergencyNo,
        isResolved: x.isResolved,
        status: x.status,
        riskScore: x.riskScore,
        createdAt: x.createdAt
      });
    }
  }
  res.status(200).json(data);
});

const getSinglEmergency = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const emergency = await Emergency.findById(id).populate("assignedVolunteers.volunteer", "uname phoneNo email");

  if (!emergency) {
    return res.status(404).json({ message: "Distress event not found." });
  }

  const user = await User.findById(emergency.user);
  if (user) {
    res.status(200).json({
      _id: emergency._id,
      lat: emergency.lat,
      long: emergency.long,
      mapLct: emergency.emergencyLctOnMap,
      addressOfInc: emergency.addressOfIncd,
      username: user.uname,
      emergencyNo: user.emergencyNo,
      isResolved: emergency.isResolved,
      status: emergency.status,
      riskScore: emergency.riskScore,
      assignedVolunteers: emergency.assignedVolunteers
    });
  }
});

const emergencyUpdate = asyncHandler(async (req, res) => {
  const emerg = req.params.id;
  const emerge = await Emergency.findById(emerg);
  if (emerge) {
    emerge.isResolved = true;
    emerge.status = "resolved";
    await emerge.save();
    res.status(200).json({ message: "Resolved successfully" });
  } else {
    res.status(404).json({ message: "Emergency record not found" });
  }
});

module.exports = {
  sendemergencyCntrl,
  getAllEmergencies,
  getSinglEmergency,
  emergencyUpdate
};
