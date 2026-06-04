const express = require("express");
const router = express.Router();
const validateToken = require('../middlewares/validateToken');
const { emergencyLimiter } = require('../middlewares/securityMiddleware');
const {
  sendemergencyCntrl,
  getAllEmergencies,
  getSinglEmergency,
  emergencyUpdate
} = require("../controllers/emergencyCntrl");

// All emergency routes require authentication
router.post("/emergencyPressed", validateToken, emergencyLimiter, sendemergencyCntrl);
router.get("/", validateToken, getAllEmergencies);
router.route("/:id")
  .get(validateToken, getSinglEmergency)
  .patch(validateToken, emergencyUpdate)
  .put(validateToken, emergencyUpdate);  // Support both PUT and PATCH for cancelSOS

module.exports = router;
