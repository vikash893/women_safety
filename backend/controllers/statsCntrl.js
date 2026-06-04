const asyncHandler = require("express-async-handler");
const { User } = require("../models/userModel");
const { Emergency } = require("../models/emergencyModel");
const { Incident } = require("../models/incidentRptModel");

const getAdminStats = asyncHandler(async (req, res) => {
  try {
    // 1. Total User Breakdown
    const totalUsers = await User.countDocuments();
    const victimsCount = await User.countDocuments({ role: 0 });
    const volunteersCount = await User.countDocuments({ role: 1 });
    const onlineVolunteers = await User.countDocuments({ role: 1, isOnline: true });

    // 2. SOS Metrics
    const totalSOS = await Emergency.countDocuments();
    const activeSOS = await Emergency.countDocuments({ isResolved: false });
    const resolvedSOS = await Emergency.countDocuments({ isResolved: true });

    // 3. Incident Reports
    const totalIncidents = await Incident.countDocuments();

    // 4. Calculate Real Average Response Time from timestamp deltas
    const respondedEmergencies = await Emergency.find({
      status: { $in: ["responded", "resolved"] },
      updatedAt: { $exists: true }
    });

    let totalDelayMs = 0;
    let counted = 0;

    respondedEmergencies.forEach((emerg) => {
      if (emerg.createdAt && emerg.updatedAt) {
        const diffMs = new Date(emerg.updatedAt).getTime() - new Date(emerg.createdAt).getTime();
        if (diffMs > 0 && diffMs < 86400000) { // Only count if under 24 hours (filter data anomalies)
          totalDelayMs += diffMs;
          counted++;
        }
      }
    });

    const averageResponseTimeSec = counted > 0 ? Math.round((totalDelayMs / counted) / 1000) : 0;

    // 5. Real Monthly Alerts Aggregation from database
    const currentYear = new Date().getFullYear();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const monthlyPipeline = await Emergency.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(currentYear, 0, 1) }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Build full 12-month array (fill zero for months without data)
    const monthlyAlerts = monthNames.map((name, index) => {
      const found = monthlyPipeline.find(m => m._id === index + 1);
      return { month: name, count: found ? found.count : 0 };
    });

    // Filter to only show months up to current month
    const currentMonth = new Date().getMonth();
    const filteredMonthlyAlerts = monthlyAlerts.slice(0, currentMonth + 1);

    res.status(200).json({
      users: {
        total: totalUsers,
        victims: victimsCount,
        volunteers: volunteersCount,
        onlineVolunteers
      },
      emergencies: {
        total: totalSOS,
        active: activeSOS,
        resolved: resolvedSOS,
        averageResponseTimeSeconds: averageResponseTimeSec,
        successRatePercentage: totalSOS > 0 ? Math.round((resolvedSOS / totalSOS) * 100) : 100
      },
      incidents: {
        total: totalIncidents
      },
      monthlyAlerts: filteredMonthlyAlerts
    });
  } catch (err) {
    console.error("Failed to generate admin statistics:", err);
    res.status(500).json({ message: "Failed to compile admin dashboard analytics." });
  }
});

/**
 * Heatmap Data Aggregation Controller
 * Returns real Emergency lat/long coordinates for danger zone visualization.
 */
const getHeatmapData = asyncHandler(async (req, res) => {
  try {
    const { days = 90, severity } = req.query;

    // Build query filter
    const dateFilter = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    const query = { createdAt: { $gte: dateFilter } };

    if (severity === "high") {
      query.riskScore = { $gte: 60 };
    } else if (severity === "medium") {
      query.riskScore = { $gte: 30, $lt: 60 };
    } else if (severity === "low") {
      query.riskScore = { $lt: 30 };
    }

    const emergencies = await Emergency.find(query, {
      lat: 1, long: 1, riskScore: 1, status: 1, createdAt: 1
    }).sort({ createdAt: -1 }).limit(500);

    const heatmapPoints = emergencies
      .filter(e => e.lat && e.long)
      .map(e => ({
        lat: e.lat,
        lng: e.long,
        intensity: Math.min(1, (e.riskScore || 30) / 100),
        status: e.status,
        timestamp: e.createdAt
      }));

    // Cluster analysis — group nearby points
    const clusters = [];
    const processed = new Set();

    for (let i = 0; i < heatmapPoints.length; i++) {
      if (processed.has(i)) continue;
      const cluster = { center: heatmapPoints[i], count: 1 };
      processed.add(i);

      for (let j = i + 1; j < heatmapPoints.length; j++) {
        if (processed.has(j)) continue;
        const dist = Math.sqrt(
          Math.pow(heatmapPoints[i].lat - heatmapPoints[j].lat, 2) +
          Math.pow(heatmapPoints[i].lng - heatmapPoints[j].lng, 2)
        );
        if (dist < 0.01) { // ~1km clustering threshold
          cluster.count++;
          processed.add(j);
        }
      }

      if (cluster.count > 1) {
        clusters.push({
          lat: cluster.center.lat,
          lng: cluster.center.lng,
          count: cluster.count,
          severity: cluster.count >= 5 ? "critical" : cluster.count >= 3 ? "high" : "medium"
        });
      }
    }

    res.status(200).json({
      points: heatmapPoints,
      clusters,
      total: heatmapPoints.length,
      dateRange: {
        from: dateFilter,
        to: new Date()
      }
    });
  } catch (err) {
    console.error("Failed to generate heatmap data:", err);
    res.status(500).json({ message: "Failed to compile heatmap analytics." });
  }
});

module.exports = { getAdminStats, getHeatmapData };
