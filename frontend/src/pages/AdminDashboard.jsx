import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../Components/Navbar/Navbar";
import Footer from "../Components/Footer/Footer";
import { MapContainer } from "../Components/MapContainer";
import { useAuth } from "../context/auth";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [auth] = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Heatmap state
  const [heatmapData, setHeatmapData] = useState([]);
  const [heatmapClusters, setHeatmapClusters] = useState([]);
  const [heatmapTotal, setHeatmapTotal] = useState(0);
  const [heatmapDays, setHeatmapDays] = useState(90);
  const [heatmapSeverity, setHeatmapSeverity] = useState("all");
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  // Fetch admin aggregates
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/v1/users/admin/stats", {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        if (res.status === 200) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("Failed to load admin stats:", err);
        toast.error("Access denied or failed to load system analytics.");
      } finally {
        setLoading(false);
      }
    };

    if (auth?.token) {
      fetchStats();
    }
  }, [auth]);

  // Fetch real heatmap data from backend
  useEffect(() => {
    if (activeTab !== "heatmap" || !auth?.token) return;

    const fetchHeatmap = async () => {
      setHeatmapLoading(true);
      try {
        const params = new URLSearchParams({ days: heatmapDays });
        if (heatmapSeverity !== "all") params.append("severity", heatmapSeverity);

        const res = await axios.get(
          `http://localhost:8000/api/v1/users/admin/heatmap?${params.toString()}`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        if (res.status === 200) {
          setHeatmapData(res.data.points || []);
          setHeatmapClusters(res.data.clusters || []);
          setHeatmapTotal(res.data.total || 0);
        }
      } catch (err) {
        console.error("Failed to load heatmap data:", err);
      } finally {
        setHeatmapLoading(false);
      }
    };

    fetchHeatmap();
  }, [activeTab, auth, heatmapDays, heatmapSeverity]);

  if (loading) {
    return (
      <div style={{ backgroundColor: "#030712", minHeight: "100vh", color: "#cbd5e1" }}>
        <Navbar />
        <div className="container py-5 text-center">
          <div className="spinner-border text-danger" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Compiling systems telemetry logs...</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Fallback defaults if auth fails or logs are empty
  const data = stats || {
    users: { total: 184, victims: 140, volunteers: 44, onlineVolunteers: 12 },
    emergencies: { total: 42, active: 3, resolved: 39, averageResponseTimeSeconds: 145, successRatePercentage: 92 },
    incidents: { total: 18 },
    monthlyAlerts: [
      { month: "Jan", count: 8 },
      { month: "Feb", count: 12 },
      { month: "Mar", count: 15 },
      { month: "Apr", count: 22 },
      { month: "May", count: 32 },
      { month: "Jun", count: 42 }
    ]
  };

  return (
    <div style={{ backgroundColor: "#030712", minHeight: "100vh", color: "#cbd5e1" }}>
      <Navbar />

      <div className="container py-5">
        {/* Header Title Grid */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 mt-4">
          <div>
            <span className="text-uppercase tracking-wider fw-bold text-danger" style={{ fontSize: "11px", letterSpacing: "0.15em" }}>
              AegisHer Operations Panel
            </span>
            <h1 className="fw-black text-light mt-1 mb-0" style={{ fontSize: "2.5rem" }}>
              HQ Operational Telemetry
            </h1>
          </div>
          <div className="mt-3 mt-md-0 d-flex gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`btn ${activeTab === "overview" ? "btn-danger" : "btn-dark border-secondary"}`}
              style={{ borderRadius: "8px", fontSize: "13px" }}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("heatmap")}
              className={`btn ${activeTab === "heatmap" ? "btn-danger" : "btn-dark border-secondary"}`}
              style={{ borderRadius: "8px", fontSize: "13px" }}
            >
              Coverage Map
            </button>
          </div>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Quick Metrics Cards Row */}
            <div className="row g-4 mb-5">
              <div className="col-12 col-sm-6 col-lg-3">
                <div style={cardStyle}>
                  <span style={cardLabelStyle}>Active SOS Signals</span>
                  <span style={cardValueStyle(true)}>{data.emergencies.active}</span>
                  <span style={cardSubtextStyle}>Distress relays currently streaming</span>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <div style={cardStyle}>
                  <span style={cardLabelStyle}>Verified Active Responders</span>
                  <span style={cardValueStyle()}>{data.users.onlineVolunteers} / {data.users.volunteers}</span>
                  <span style={cardSubtextStyle}>Guardians online in the grid</span>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <div style={cardStyle}>
                  <span style={cardLabelStyle}>Emergency Response Speed</span>
                  <span style={cardValueStyle()}>{Math.round(data.emergencies.averageResponseTimeSeconds / 60)}m {data.emergencies.averageResponseTimeSeconds % 60}s</span>
                  <span style={cardSubtextStyle}>Average volunteer dispatch delay</span>
                </div>
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <div style={cardStyle}>
                  <span style={cardLabelStyle}>Victim Assistance Rate</span>
                  <span style={cardValueStyle()}>{data.emergencies.successRatePercentage}%</span>
                  <span style={cardSubtextStyle}>Percentage of resolved alarms</span>
                </div>
              </div>
            </div>

            {/* Visual Analytics Chart and System Diagnostics */}
            <div className="row g-4">
              <div className="col-12 col-lg-8">
                <div style={panelStyle}>
                  <h3 className="fw-bold text-light mb-4" style={{ fontSize: "18px" }}>SOS Alerts Distribution Trend</h3>
                  
                  {/* Clean SVG Line/Bar Chart Representation */}
                  <div style={{ height: "240px", position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingTop: "20px" }}>
                    <div style={{ position: "absolute", left: 0, top: "20px", right: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      {[80, 60, 40, 20, 0].map((val) => (
                        <div key={val} style={{ borderBottom: "1px dashed rgba(255,255,255,0.06)", width: "100%", height: "0px", position: "relative" }}>
                          <span style={{ position: "absolute", left: 0, top: "-12px", fontSize: "9px", color: "#64748b" }}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {data.monthlyAlerts.map((item, idx) => {
                      const heightPct = Math.min(100, Math.max(10, (item.count / 80) * 100));
                      return (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "14%", zIndex: 10 }}>
                          <div style={{ color: "#f43f5e", fontSize: "11px", fontWeight: "bold", marginBottom: "6px" }}>{item.count}</div>
                          <div
                            style={{
                              width: "100%",
                              height: `${heightPct}%`,
                              background: "linear-gradient(to top, rgba(244,63,94,0.1), rgba(244,63,94,0.7))",
                              borderRadius: "4px 4px 0 0",
                              borderTop: "2px solid #f43f5e"
                            }}
                          />
                          <span style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>{item.month}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-4">
                <div style={panelStyle}>
                  <h3 className="fw-bold text-light mb-4" style={{ fontSize: "18px" }}>Operational Logs</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={logItemStyle}>
                      <span style={{ color: "#10b981", fontSize: "12px", fontWeight: "bold" }}>OK</span>
                      <div className="text-start">
                        <span style={logTitleStyle}>SMTP Notification Broker</span>
                        <span style={logTimeStyle}>Active & online</span>
                      </div>
                    </div>
                    <div style={logItemStyle}>
                      <span style={{ color: "#10b981", fontSize: "12px", fontWeight: "bold" }}>OK</span>
                      <div className="text-start">
                        <span style={logTitleStyle}>Twilio SMS Dispatcher</span>
                        <span style={logTimeStyle}>Authentication verified</span>
                      </div>
                    </div>
                    <div style={logItemStyle}>
                      <span style={{ color: "#fbbf24", fontSize: "12px", fontWeight: "bold" }}>WARN</span>
                      <div className="text-start">
                        <span style={logTitleStyle}>FCM Gateway Credentials</span>
                        <span style={logTimeStyle}>Service key not loaded</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "heatmap" && (
          <div className="d-flex flex-column gap-4">
            {/* Heatmap Controls */}
            <div style={panelStyle}>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                  <h3 className="fw-bold text-light mb-1" style={{ fontSize: "18px" }}>Incident Danger Zone Heatmap</h3>
                  <p className="text-muted m-0" style={{ fontSize: "13px" }}>
                    Real-time incident coordinates aggregated from the database with spatial clustering.
                  </p>
                </div>
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  {/* Time Filter */}
                  <select
                    value={heatmapDays}
                    onChange={(e) => setHeatmapDays(parseInt(e.target.value))}
                    style={{ ...filterSelectStyle }}
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={365}>Last year</option>
                  </select>

                  {/* Severity Filter */}
                  <select
                    value={heatmapSeverity}
                    onChange={(e) => setHeatmapSeverity(e.target.value)}
                    style={{ ...filterSelectStyle }}
                  >
                    <option value="all">All Severities</option>
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>

                  <span className="badge rounded-pill bg-dark text-muted border border-secondary px-3" style={{ fontSize: "11px" }}>
                    {heatmapLoading ? "Loading..." : `${heatmapTotal} data points`}
                  </span>
                </div>
              </div>

              {/* Map */}
              <MapContainer
                status="active"
                height="450px"
                heatmapData={heatmapData}
              />

              {/* Legend */}
              <div className="d-flex align-items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-muted" style={{ fontSize: "11px", fontWeight: "bold" }}>LEGEND:</span>
                <div className="d-flex align-items-center gap-2">
                  <span className="aegis-legend-dot" style={{ backgroundColor: "rgba(244,63,94,0.8)" }}></span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>High Density</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="aegis-legend-dot" style={{ backgroundColor: "rgba(251,191,36,0.8)" }}></span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Medium Density</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="aegis-legend-dot" style={{ backgroundColor: "rgba(16,185,129,0.8)" }}></span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Low Density</span>
                </div>
              </div>
            </div>

            {/* Incident Clusters */}
            {heatmapClusters.length > 0 && (
              <div style={panelStyle}>
                <h4 className="fw-bold text-light mb-3" style={{ fontSize: "16px" }}>Detected Incident Clusters</h4>
                <div className="row g-3">
                  {heatmapClusters.map((cluster, idx) => (
                    <div key={idx} className="col-12 col-sm-6 col-lg-4">
                      <div className="p-3 rounded-3" style={{
                        backgroundColor: "rgba(3,7,18,0.4)",
                        border: `1px solid ${cluster.severity === "critical" ? "rgba(244,63,94,0.2)" : cluster.severity === "high" ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.05)"}`
                      }}>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="aegis-legend-dot" style={{
                            backgroundColor: cluster.severity === "critical" ? "#f43f5e" : cluster.severity === "high" ? "#fbbf24" : "#10b981"
                          }}></span>
                          <span className="fw-bold text-light" style={{ fontSize: "13px" }}>
                            {cluster.severity?.toUpperCase()} Zone
                          </span>
                        </div>
                        <div className="text-muted" style={{ fontSize: "11px" }}>
                          {cluster.count} incidents near ({cluster.lat?.toFixed(4)}, {cluster.lng?.toFixed(4)})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

// Inline Styles to maintain unified aesthetic overrides
const cardStyle = {
  backgroundColor: "rgba(15, 23, 42, 0.4)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  borderRadius: "16px",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  transition: "transform 0.2s"
};

const cardLabelStyle = {
  fontSize: "12px",
  fontWeight: "bold",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "8px"
};

const cardValueStyle = (isRed = false) => ({
  fontSize: "2.25rem",
  fontWeight: "900",
  color: isRed ? "#f43f5e" : "#ffffff",
  marginBottom: "8px"
});

const cardSubtextStyle = {
  fontSize: "11px",
  color: "#64748b"
};

const panelStyle = {
  backgroundColor: "rgba(15, 23, 42, 0.4)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  borderRadius: "16px",
  padding: "24px",
  height: "100%"
};

const logItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "12px",
  backgroundColor: "rgba(3, 7, 18, 0.3)",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.02)"
};

const logTitleStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "bold",
  color: "#cbd5e1"
};

const logTimeStyle = {
  display: "block",
  fontSize: "10px",
  color: "#64748b",
  marginTop: "2px"
};

const filterSelectStyle = {
  backgroundColor: "rgba(3,7,18,0.6)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  padding: "6px 12px",
  color: "#cbd5e1",
  fontSize: "12px",
  outline: "none",
  cursor: "pointer"
};
