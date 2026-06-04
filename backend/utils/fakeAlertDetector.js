const { Emergency } = require("../models/emergencyModel");

/**
 * Calculates a suspicion index for a newly initiated distress alert to flag mock/accidental triggers.
 * 
 * @param {string} userId - ID of the victim initiating distress
 * @param {number} lat - Latitude coordinates
 * @param {number} long - Longitude coordinates
 * @returns {Promise<{suspicionScore: number, action: string, message: string}>} Suspicion analysis report
 */
async function detectFakeAlert(userId, lat, long) {
  try {
    let suspicionScore = 0;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // 1. FREQUENCY CHECK (Rapid successive alarms raise suspicion)
    const recentAlertsCount = await Emergency.countDocuments({
      user: userId,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (recentAlertsCount > 1) {
      suspicionScore += 45; // Stacking alerts quickly is highly suspect
    }

    // 2. HISTORICAL RECORD RESOLUTION AUDIT
    const historicalAlerts = await Emergency.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    let unresolvedCount = 0;
    historicalAlerts.forEach((alert) => {
      // If alert was closed quickly without responder assignment, or left un-responded
      if (!alert.isResolved && (Date.now() - new Date(alert.createdAt).getTime() > 24 * 60 * 60 * 1000)) {
        unresolvedCount++;
      }
    });

    suspicionScore += unresolvedCount * 15;

    // Normalize boundaries
    suspicionScore = Math.min(suspicionScore, 100);

    // 3. ACTION THRESHOLD ASSIGNMENT
    let action = "allow";
    let message = "Alert verified as authentic.";

    if (suspicionScore >= 40 && suspicionScore < 75) {
      action = "warning";
      message = "High distress alert frequency detected. Sending verification request.";
    } else if (suspicionScore >= 75) {
      action = "restrict";
      message = "SOS feature temporarily locked due to repeated false/duplicate triggers. Admin review scheduled.";
    }

    return {
      suspicionScore,
      action,
      message
    };
  } catch (err) {
    console.error("Error running false alert detection engine:", err);
    return {
      suspicionScore: 0,
      action: "allow",
      message: "Security scanning bypassed."
    };
  }
}

module.exports = { detectFakeAlert };
