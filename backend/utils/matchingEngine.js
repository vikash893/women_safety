const { User } = require("../models/userModel");

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Matches and ranks the top nearest online volunteers for an emergency dispatch.
 * 
 * @param {number} victimLat - Victim's latitude coordinate
 * @param {number} victimLong - Victim's longitude coordinate
 * @param {number} maxRadiusKm - Max distance radius in kilometers (default: 3km)
 * @returns {Promise<Array>} List of matched volunteer objects with distances
 */
async function findNearestVolunteers(victimLat, victimLong, maxRadiusKm = 3.0) {
  try {
    // Retrieve all volunteers currently online
    const onlineVolunteers = await User.find({
      role: 1, // Volunteer role code
      isOnline: true
    });

    const matches = [];

    for (const volunteer of onlineVolunteers) {
      if (
        !volunteer.currentCoords ||
        volunteer.currentCoords.latitude === undefined ||
        volunteer.currentCoords.longitude === undefined
      ) {
        continue;
      }

      const distance = calculateHaversineDistance(
        victimLat,
        victimLong,
        volunteer.currentCoords.latitude,
        volunteer.currentCoords.longitude
      );

      if (distance <= maxRadiusKm) {
        matches.push({
          volunteer,
          distance: parseFloat(distance.toFixed(3))
        });
      }
    }

    // Sort by distance (closest first)
    matches.sort((a, b) => a.distance - b.distance);

    // Return the top 3 nearest responders
    return matches.slice(0, 3);
  } catch (err) {
    console.error("Error running volunteer matching engine:", err);
    return [];
  }
}

module.exports = { calculateHaversineDistance, findNearestVolunteers };
