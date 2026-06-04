const express = require("express");
const router = express.Router();
const validateToken = require("../middlewares/validateToken");
const {
  authLimiter,
  validateBody,
  csrfProtection,
  requireRole
} = require("../middlewares/securityMiddleware");

const {
  userInfo,
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  verifyemail,
  profileUpdate,
  updateSafetyProfile,
  getTrustedCircles,
  createTrustedCircle,
  deleteTrustedCircle,
  addMemberToCircle
} = require("../controllers/userCntrl");

const { getAdminStats, getHeatmapData } = require("../controllers/statsCntrl");

// Public endpoints
router.post("/register", authLimiter, validateBody("register"), registerUser);
router.post("/login", authLimiter, validateBody("login"), loginUser);
router.get("/emailverify/:tokenId", verifyemail);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

// Admin Analytics Dashboard Route
router.get("/admin/stats", validateToken, requireRole([2]), getAdminStats);
router.get("/admin/heatmap", validateToken, requireRole([2]), getHeatmapData);

// Profile Updates
router.put("/update", validateToken, profileUpdate);
router.post("/update-safety-profile", validateToken, updateSafetyProfile);

// Authenticated user check
router.get("/get_user_info", validateToken, userInfo);

// Trusted Circles CRUD APIs
router.route("/circles")
  .get(validateToken, getTrustedCircles)
  .post(validateToken, createTrustedCircle);

router.delete("/circles/:circleId", validateToken, deleteTrustedCircle);
router.post("/circles/add-member", validateToken, addMemberToCircle);

// Legacy select endpoint for matching reports
const { Incident } = require("../models/incidentRptModel");
const { Emergency } = require("../models/emergencyModel");
const { User } = require("../models/userModel");

router.get("/getselected", async (req, res) => {
  const data = [];
  const edata = [];
  const inci = await Incident.find({ isSeen: true });
  const emer = await Emergency.find({ isResolved: true });

  for (const x of inci) {
    const user = await User.findById(x.user);
    if (user) {
      data.push({
        uname: user.uname,
        address: x.address,
        pincode: x.pincodeOfIncident,
        report: x.report,
        isSeen: x.isSeen,
        image: x.meidaSt || "empty",
        createdAt: x.createdAt,
        updatedAt: x.updatedAt
      });
    }
  }

  for (const x of emer) {
    const user = await User.findById(x.user);
    if (user) {
      edata.push({
        _id: x._id,
        mapLct: x.emergencyLctOnMap,
        addressOfInc: x.addressOfIncd,
        username: user.uname,
        userId: user._id,
        emergencyNo: user.emergencyNo,
        isResolved: x.isResolved,
        createdAt: x.createdAt,
        updatedAt: x.updatedAt
      });
    }
  }

  res.status(200).json({ incidents: data, emergency: edata });
});

module.exports = router;