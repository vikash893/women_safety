import React from 'react';
import Navbar from '../Components/Navbar/Navbar';
import Footer from '../Components/Footer/Footer';
import { useSafety } from '../context/SafetyContext';
import { MapContainer } from '../Components/MapContainer';
import { 
  FiShield, 
  FiHeart, 
  FiPhone, 
  FiCheckCircle, 
  FiNavigation, 
  FiRadio, 
  FiInfo, 
  FiAlertOctagon 
} from 'react-icons/fi';
import '../styles/AegisHer.css';

/**
 * AegisHer Volunteer & Responders Console (AegisHer Safety platform)
 * Feeds distress beacons and live coordinate tracks to online community guardians.
 */
export function AegisHerVolunteer() {
  const {
    isOnline,
    toggleOnline,
    incomingAlerts,
    activeMission,
    acceptIncident,
    resolveActiveMission
  } = useSafety();

  return (
    <div className="aegis-container">
      <Navbar />

      <div className="container py-5 flex-grow-1">
        {/* Standby Banner Status panel */}
        <div className="aegis-card p-4 mb-4 border-secondary d-flex flex-column sm-row justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-3 text-center text-sm-start">
            <div 
              className="p-3 rounded-3 text-light d-flex align-items-center justify-content-center"
              style={{ backgroundColor: isOnline ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)', border: isOnline ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.08)', color: isOnline ? '#10b981' : '#cbd5e1' }}
            >
              <FiShield size={24} className={isOnline ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div className="d-flex align-items-center justify-content-center justify-content-sm-start gap-2 flex-wrap">
                <span className="fw-black text-light" style={{ fontSize: '15px' }}>Verified Aegis Guardian Console</span>
                <span 
                  className="badge rounded-pill uppercase fw-bold" 
                  style={{ 
                    fontSize: '9px',
                    backgroundColor: isOnline ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                    color: isOnline ? '#10b981' : '#64748b',
                    border: isOnline ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  {isOnline ? 'Active Online' : 'Standby Offline'}
                </span>
              </div>
              <span className="text-muted d-block mt-0.5" style={{ fontSize: '11px' }}>
                {isOnline ? 'Broadcasting live availability to dispatch server' : 'Activate online status to intercept active local distress signals'}
              </span>
            </div>
          </div>

          <button
            onClick={toggleOnline}
            className={isOnline ? 'aegis-btn-outline px-4 py-2.5' : 'aegis-btn-primary px-4 py-2.5'}
            style={{ fontSize: '13px' }}
          >
            {isOnline ? 'Disconnect Standby' : 'Go Standby Online'}
          </button>
        </div>

        {!isOnline ? (
          // 1. GUARDIAN STANDBY OFFLINE INSTRUCTIONS
          <div className="text-center py-5 max-w-sm mx-auto d-flex flex-column align-items-center gap-3">
            <div 
              className="d-flex align-items-center justify-content-center rounded-4 shadow-inner"
              style={{ width: '64px', height: '64px', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', color: '#64748b' }}
            >
              <FiRadio size={28} />
            </div>
            <div>
              <span className="fw-bold text-light d-block" style={{ fontSize: '16px' }}>Guardian Standby Stand-down</span>
              <p className="text-muted mt-2" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                You are currently disconnected from emergency dispatch routing. Toggle online status above to scan and protect a 2.0 km vicinity radius.
              </p>
            </div>
          </div>
        ) : activeMission ? (
          // 2. ACTIVE RESCUE EMERGENCY RUNNING
          <div className="row g-4 align-items-start mt-1">
            {/* Map compass tracking */}
            <div className="col-12 col-lg-7">
              <div className="aegis-card p-4">
                <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <span className="fw-bold text-light" style={{ fontSize: '16px' }}>En Route Routing Compass</span>
                  <span className="badge bg-success rounded-pill uppercase fw-bold border border-success px-3 py-1.5" style={{ fontSize: '11px', backgroundColor: 'rgba(16,185,129,0.05)' }}>
                    {activeMission.status === 'arrived' ? 'Secured Target' : 'Assisting Target'}
                  </span>
                </div>
                
                <MapContainer
                  victimLocation={activeMission.location}
                  volunteerLocation={activeMission.volunteerCoords}
                  status={activeMission.status === 'arrived' ? 'arrived' : 'navigating'}
                  distanceKm={activeMission.distanceKm}
                  height="380px"
                />
              </div>
            </div>

            {/* Victim folders & Actions */}
            <div className="col-12 col-lg-5 d-flex flex-column gap-4">
              {/* Medical Card details */}
              <div className="aegis-card p-4">
                <h4 className="fw-bold text-danger mb-4 d-flex align-items-center gap-2 border-bottom pb-3" style={{ fontSize: '16px', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <FiAlertOctagon />
                  Victim Clinical Dossier
                </h4>

                <div className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-2" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <span className="text-muted d-block uppercase font-weight-bold" style={{ fontSize: '9px', letterSpacing: '0.05em' }}>Distressed victim</span>
                      <span className="fw-bold text-light" style={{ fontSize: '15px' }}>{activeMission.victimName}</span>
                    </div>
                    <a
                      href={`tel:${activeMission.victimPhone}`}
                      className="aegis-btn-outline p-2.5 d-flex align-items-center justify-content-center text-danger"
                      title="Initiate call"
                      style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <FiPhone size={18} />
                    </a>
                  </div>

                  <div className="row g-3">
                    <div className="col-6">
                      <div className="p-3 rounded-3 border" style={{ backgroundColor: 'rgba(3,7,18,0.5)', borderColor: 'rgba(255,255,255,0.03)' }}>
                        <span className="text-muted d-block uppercase font-weight-bold" style={{ fontSize: '8px', letterSpacing: '0.05em' }}>blood type</span>
                        <span className="text-danger fw-black d-flex align-items-center gap-1 mt-1" style={{ fontSize: '14px' }}>
                          <FiHeart />
                          {activeMission.bloodGroup}
                        </span>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="p-3 rounded-3 border" style={{ backgroundColor: 'rgba(3,7,18,0.5)', borderColor: 'rgba(255,255,255,0.03)' }}>
                        <span className="text-muted d-block uppercase font-weight-bold" style={{ fontSize: '8px', letterSpacing: '0.05em' }}>remaining range</span>
                        <span className="text-success fw-bold d-block mt-1" style={{ fontSize: '14px' }}>
                          {activeMission.distanceKm > 0 ? `${activeMission.distanceKm} km` : 'Contact Made'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-muted d-block uppercase font-weight-bold" style={{ fontSize: '9px', letterSpacing: '0.05em' }}>Medical notes</span>
                    <div className="p-3 rounded-3 border mt-1 text-light italic" style={{ backgroundColor: 'rgba(3,7,18,0.5)', borderColor: 'rgba(255,255,255,0.03)', fontSize: '12px', lineHeight: '1.5' }}>
                      "{activeMission.medicalNotes || 'No crucial records specified by victim.'}"
                    </div>
                  </div>
                </div>
              </div>

              {/* Secure Resolve controls */}
              <div className="aegis-card p-4">
                <h4 className="fw-bold text-light mb-3" style={{ fontSize: '16px' }}>Tactical Control Node</h4>
                <div className="d-flex flex-column gap-3">
                  {activeMission.status !== 'arrived' ? (
                    <div 
                      className="d-flex align-items-start gap-2.5 p-3 rounded-3 text-start" 
                      style={{ backgroundColor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.04)', fontSize: '12px', color: '#cbd5e1' }}
                    >
                      <FiNavigation className="text-success animate-pulse shrink-0 mt-0.5" size={16} />
                      <div>
                        <span className="fw-bold text-light d-block mb-0.5">Route Navigating Active</span>
                        Keep this panel open. Telemetry intervals will watch your drift coordinates and approach the victim map in real-time.
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="d-flex align-items-start gap-2.5 p-3 rounded-3 text-start" 
                      style={{ backgroundColor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', fontSize: '12px', color: '#10b981' }}
                    >
                      <FiCheckCircle className="shrink-0 mt-0.5" size={16} />
                      <div>
                        <span className="fw-bold d-block mb-0.5">Contact Established</span>
                        Confirm safety contact with Distressed Victim before marking the incident operational logs closed.
                      </div>
                    </div>
                  )}

                  <button
                    onClick={resolveActiveMission}
                    className="aegis-btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                  >
                    <FiCheckCircle size={18} />
                    Mark Secure & Resolve Mission
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 3. STANDBY SCANNING DISTRICT INCOMING distress logs
          <div className="row g-4 mt-1">
            {/* Distress alerts registry sidebar */}
            <div className="col-12 col-lg-5 d-flex flex-column gap-3">
              <h3 className="fw-bold text-light uppercase tracking-wider px-1" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>
                Local Distress Signal Feed
              </h3>

              <div className="d-flex flex-column gap-3 aegis-scroll overflow-auto" style={{ maxHeight: '420px' }}>
                {incomingAlerts.length === 0 ? (
                  <div className="aegis-card p-5 text-center d-flex flex-column align-items-center gap-2">
                    <div className="spinner-border spinner-border-sm text-success mb-2" role="status"></div>
                    <span className="fw-bold text-light d-block" style={{ fontSize: '13.5px' }}>Scanning distress sweep...</span>
                    <span className="text-muted" style={{ fontSize: '11px' }}>No active distress vectors identified inside local vicinity zones.</span>
                  </div>
                ) : (
                  incomingAlerts.map((alert) => (
                    <div key={alert.incidentId} className="aegis-card-glow p-4 text-start">
                      <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="d-flex flex-column gap-1">
                          <span 
                            className="text-uppercase fw-extrabold rounded-pill text-danger px-2.5 py-0.5 border align-self-start" 
                            style={{ fontSize: '8px', letterSpacing: '0.05em', backgroundColor: 'rgba(244,63,94,0.05)', borderColor: 'rgba(244,63,94,0.2)' }}
                          >
                            Active Distress Signals
                          </span>
                          <span className="fw-bold text-light mt-2" style={{ fontSize: '16px' }}>{alert.victimName}</span>
                        </div>
                        <div className="text-end">
                          <span className="text-danger fw-black d-block animate-pulse" style={{ fontSize: '1.25rem' }}>{alert.distanceKm} km</span>
                          <span className="text-muted uppercase font-weight-bold" style={{ fontSize: '8px', letterSpacing: '0.05em' }}>Vicinity range</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-3 mb-3 border text-light" style={{ backgroundColor: 'rgba(3,7,18,0.4)', borderColor: 'rgba(255,255,255,0.03)', fontSize: '12px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="text-muted">Blood Index</span>
                          <span className="fw-bold text-danger">{alert.bloodGroup}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-start border-top pt-1.5 mt-1.5" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                          <span className="text-muted shrink-0 me-4">Clinical note</span>
                          <span className="fw-semibold text-end truncate italic" style={{ maxWidth: '160px' }}>
                            "{alert.medicalNotes || 'None'}"
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => acceptIncident(alert.incidentId)}
                        className="aegis-btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                        style={{ fontSize: '13px' }}
                      >
                        <FiShield size={16} />
                        Accept Request & Assist
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Static Radar sweep coverage dashboard */}
            <div className="col-12 col-lg-7">
              <div className="aegis-card p-4 h-100 d-flex flex-column justify-content-between gap-4">
                <h4 className="fw-bold text-light" style={{ fontSize: '16px' }}>Local Coverage Radar</h4>

                <div 
                  className="position-relative overflow-hidden rounded-4 d-flex align-items-center justify-content-center shadow-inner"
                  style={{ height: '300px', backgroundColor: '#030712', border: '1px solid rgba(255,255,255,0.03)' }}
                >
                  <div 
                    className="position-absolute w-100 h-100 opacity-15"
                    style={{
                      backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                      inset: 0
                    }}
                  ></div>

                  {/* Concentric scan arcs */}
                  <div className="position-absolute rounded-circle border d-flex align-items-center justify-content-center" style={{ width: '220px', height: '220px', borderColor: 'rgba(16,185,129,0.08)' }}>
                    <div className="position-absolute rounded-circle border d-flex align-items-center justify-content-center" style={{ width: '150px', height: '150px', borderColor: 'rgba(16,185,129,0.08)' }}>
                      <div className="position-absolute rounded-circle border" style={{ width: '80px', height: '80px', borderColor: 'rgba(16,185,129,0.08)' }}></div>
                    </div>
                  </div>

                  {/* Programmatic sweeping line */}
                  <div 
                    className="position-absolute border-top border-left rounded-tl-full origin-bottom-right" 
                    style={{ 
                      width: '130px', 
                      height: '130px', 
                      borderColor: 'rgba(16,185,129,0.22)',
                      borderTopWidth: '2px',
                      borderLeftWidth: '2px',
                      bottom: '50%',
                      right: '50%',
                      animation: 'spin 6s linear infinite'
                    }}
                  ></div>

                  {/* Responders glowing green core */}
                  <div className="position-relative z-10 bg-success text-light p-2.5 rounded-circle shadow-lg border border-success animate-pulse">
                    <FiShield size={20} />
                  </div>

                  <span 
                    className="position-absolute text-muted px-4 py-2 border rounded-3 text-center fw-bold"
                    style={{ bottom: '16px', left: '16px', right: '16px', backgroundColor: 'rgba(15,23,42,0.92)', borderColor: 'rgba(255,255,255,0.04)', fontSize: '11px' }}
                  >
                    Coverage Scanning • Radius Scope: 2.0 km² • GPS locked
                  </span>
                </div>

                <div className="d-flex align-items-start gap-2 px-1 text-start" style={{ fontSize: '12px', color: '#94a3b8' }}>
                  <FiInfo className="text-success mt-0.5 shrink-0" size={16} />
                  <span>
                    When an active emergency alarm initiates within your local vicinity boundary, telemetry channels automatically dispatch to your inbox.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
export default AegisHerVolunteer;
