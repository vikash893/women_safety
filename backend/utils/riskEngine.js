const { Incident } = require("../models/incidentRptModel");
const { calculateHaversineDistance } = require("./matchingEngine");

/**
 * Predicts localized risk scores based on coordinates, hour, and past reported incidents in the vicinity.
 * 
 * @param {number} lat - Latitude coordinate
 * @param {number} long - Longitude coordinate
 * @param {string} pincode - Local postal area code
 * @returns {Promise<{riskScore: number, riskCategory: string, recommendations: string[]}>} Risk analysis dossier
 */
async function calculateRiskScore(lat, long, pincode) {
  try {
    let score = 20; // Baseline score
    const hour = new Date().getHours();

    // 1. TEMPORAL DANGER MODIFIERS (Late hours raise danger)
    if (hour >= 22 || hour <= 4) {
      score += 35; // Late night
    } else if (hour >= 18 && hour < 22) {
      score += 15; // Evening dusk
    } else {
      score -= 5;  // Daylight hours
    }

    // 2. INCIDENT DENSITY DATABASE LOOKUP
    let query = {};
    if (pincode) {
      query.pincodeOfIncident = pincode;
    }
    
    const historicalIncidents = await Incident.find(query);
    let nearbyIncidentCount = 0;

    for (const incident of historicalIncidents) {
      // If incident has coordinates, perform fine-grained proximity validation
      if (incident.lat && incident.long) {
        const dist = calculateHaversineDistance(lat, long, incident.lat, incident.long);
        if (dist <= 1.5) { // 1.5 km radius
          nearbyIncidentCount++;
        }
      } else {
        // Fallback to coarse zip code mapping
        nearbyIncidentCount++;
      }
    }

    // Apply score scaling based on density of local threats
    score += Math.min(nearbyIncidentCount * 8, 40);

    // Normalize final score bounds
    score = Math.max(5, Math.min(score, 100));

    // 3. RISK LEVEL CATEGORIZATION & ACTIONABLE SAFETY PREVENTATIVE ADVICE
    let category = "Low";
    let recommendations = [];

    if (score < 30) {
      category = "Low";
      recommendations = [
        "Normal neighborhood activity reported.",
        "Keep AegisHer running in the background as a safeguard."
      ];
    } else if (score >= 30 && score < 60) {
      category = "Medium";
      recommendations = [
        "Be aware of surroundings and avoid checking phone continuously while walking.",
        "Stick to well-lit public main roads.",
        "Share live tracking coordinates with a friend."
      ];
    } else if (score >= 60 && score < 85) {
      category = "High";
      recommendations = [
        "High crime density registered in this zip code area.",
        "Avoid poorly lit alleys and short cuts.",
        "Walk in groups or near secure public transit terminals if possible."
      ];
    } else {
      category = "Critical";
      recommendations = [
        "Critical danger advisory: High density of recent SOS alarms.",
        "Keep hand near AegisHer panic screen or configure voice-activation.",
        "Seek a secure store or crowded public zone immediately.",
        "Consider matching with a standby Aegis volunteer to walk you home."
      ];
    }

    return {
      riskScore: score,
      riskCategory: category,
      recommendations
    };
  } catch (err) {
    console.error("Error evaluating AI risk model:", err);
    return {
      riskScore: 35,
      riskCategory: "Medium",
      recommendations: ["Ensure GPS connection is steady.", "Keep emergency contacts on quick dial."]
    };
  }
}

module.exports = { calculateRiskScore };
