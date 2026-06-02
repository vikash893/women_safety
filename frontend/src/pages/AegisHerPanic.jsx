import React, { useState } from 'react';
import Navbar from '../Components/Navbar/Navbar';
import Footer from '../Components/Footer/Footer';
import { useSafety } from '../context/SafetyContext';
import { MapContainer } from '../Components/MapContainer';
import { 
  FiAlertOctagon, 
  FiPhone, 
  FiVolume2, 
  FiVolumeX, 
  FiNavigation, 
  FiUsers, 
  FiXCircle, 
  FiInfo 
} from 'react-icons/fi';
import '../styles/AegisHer.css';

/**
 * AegisHer Panic Board (AegisHer Safety platform)
 * Prominent SOS red button panel designed for instant accessibility under high distress.
 */
export function AegisHerPanic() {
  const {
    isSosTriggered,
    incidentId,
    sosStatus,
    buzzerEnabled,
    victimLocation,
    assignedResponders,
    triggerSOS,
    cancelSOS,
    toggleBuzzer,
    contacts
  } = useSafety();

  const [silentMode, setSilentMode] = useState(false);

  const handlePanicClick = () => {
    triggerSOS(!silentMode);
  };

  return (
    <div className="aegis-container">
      <Navbar />

      <div className="container py-5 flex-grow-1">
        {!isSosTriggered ? (
          // 1. SOS IDLE PANIC TRIGGER SCREEN
          <div className="text-center py-5 max-w-lg mx-auto d-flex flex-column align-items-center gap-4">
            <div className="d-flex flex-column align-items-center gap-2">
              <div 
                className="d-flex align-items-center justify-content-center p-3 rounded-circle"
                style={{ backgroundColor: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)', color: '#f43f5e', animation: 'pulse 1.5s infinite' }}
              >
                <FiAlertOctagon size={32} />
              </div>
              <h1 className="fw-black text-light mt-2 mb-1" style={{ fontSize: '2.5rem' }}>
                AegisHer Emergency SOS
              </h1>
              <p className="text-muted" style={{ fontSize: '14px', maxWidth: '400px' }}>
                In immediate danger or distress? Push the button below. AegisHer will instantly notify your emergency circles and active responders in your radius.
              </p>
            </div>

            {/* Massive Glowing Red Panic Button */}
            <div className="py-4 position-relative d-flex align-items-center justify-content-center">
              <button
                className="aegis-btn-panic aegis-animate-pulse"
                onClick={handlePanicClick}
                aria-label="SOS Distress Trigger"
              >
                SOS
              </button>
            </div>

            {/* Loud vs Silent SOS configuration */}
            <div className="aegis-card p-3 w-100" style={{ maxWidth: '420px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div className="text-start">
                  <span className="fw-bold text-light d-block" style={{ fontSize: '13.5px' }}>Audio Siren Settings</span>
                  <span className="text-muted" style={{ fontSize: '11px' }}>
                    {silentMode ? 'Silent SOS (Alarm muted, location broadcasted)' : 'Loud SOS (Programmatic high pitch alarm sound)'}
                  </span>
                </div>
                
                <div className="form-check form-switch m-0">
                  <input
                    type="checkbox"
                    checked={silentMode}
                    onChange={(e) => setSilentMode(e.target.checked)}
                    className="form-check-input bg-secondary border-none"
                    style={{ width: '2.5em', height: '1.25em', cursor: 'pointer', accentColor: '#f43f5e' }}
                  />
                </div>
              </div>
            </div>

            {contacts.length === 0 && (
              <div 
                className="d-flex align-items-start gap-2 text-start p-3 rounded-3 mt-2" 
                style={{ backgroundColor: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', color: '#fbbf24', fontSize: '12px', maxWidth: '420px' }}
              >
                <FiInfo className="mt-0.5 shrink-0" size={16} />
                <div>
                  <span className="fw-bold d-block mb-0.5">Warning: Emergency Circle Empty</span>
                  Head to the Profile Settings view to add contact numbers so they get telemetry maps immediately!
                </div>
              </div>
            )}
          </div>
        ) : (
          // 2. ACTIVE DISTRESS TELEMETRY CONTROL PANEL
          <div className="d-flex flex-column gap-4">
            {/* Header Distress Notification */}
            <div 
              className="rounded-4 p-4 d-flex flex-column sm-row justify-content-between align-items-center gap-3"
              style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', animation: 'pulse 3s infinite' }}
            >
              <div className="d-flex align-items-center gap-3 text-center text-sm-start">
                <div className="bg-danger text-light p-2.5 rounded-3 d-flex align-items-center justify-content-center">
                  <FiAlertOctagon size={24} style={{ animation: 'bounce 1.5s infinite' }} />
                </div>
                <div>
                  <div className="d-flex align-items-center justify-content-center justify-content-sm-start gap-2 flex-wrap">
                    <span className="fw-black text-danger text-uppercase tracking-wider" style={{ fontSize: '14px' }}>Distress Signal Dispatched</span>
                    <span className="badge bg-danger rounded-pill uppercase fw-bold" style={{ fontSize: '9px', border: '1px solid rgba(255,255,255,0.15)' }}>Live Broadcasting</span>
                  </div>
                  <span className="text-muted d-block mt-0.5" style={{ fontSize: '11px' }}>
                    Incident ID: {incidentId} • Relaying active coordinates to local guardians
                  </span>
                </div>
              </div>

              {/* Siren Alarm Controller */}
              <button
                onClick={toggleBuzzer}
                className="aegis-btn-outline px-3 py-2 d-flex align-items-center gap-2"
                style={{ 
                  fontSize: '13px', 
                  border: buzzerEnabled ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  color: buzzerEnabled ? '#f43f5e' : '#94a3b8',
                  backgroundColor: buzzerEnabled ? 'rgba(244,63,94,0.05)' : 'transparent'
                }}
              >
                {buzzerEnabled ? (
                  <>
                    <FiVolumeX size={16} />
                    Mute Local Alarm
                  </>
                ) : (
                  <>
                    <FiVolume2 size={16} style={{ animation: 'bounce 1s infinite' }} />
                    Activate Siren
                  </>
                )}
              </button>
            </div>

            {/* Blueprint Vector Map tracking */}
            <div className="aegis-card p-4">
              <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="fw-bold text-light" style={{ fontSize: '16px' }}>Active Geocoverage Vector Grid</span>
                <span className="badge rounded-pill bg-dark border border-secondary text-danger fw-bold" style={{ fontSize: '11px' }}>
                  {sosStatus === 'active' ? 'Scanning Circle' : sosStatus === 'responded' ? 'Guardian En Route' : 'Arrived'}
                </span>
              </div>
              
              <MapContainer
                victimLocation={victimLocation}
                status={sosStatus === 'active' ? 'active' : assignedResponders[0]?.distanceKm === 0 ? 'arrived' : 'navigating'}
                distanceKm={assignedResponders[0]?.distanceKm || 1.4}
                height="320px"
              />
            </div>

            {/* Diagnostics grid */}
            <div className="row g-4">
              {/* Dispatched defenders log */}
              <div className="col-12 col-md-7 d-flex">
                <div className="aegis-card p-4 w-100 d-flex flex-column justify-content-between">
                  <h4 className="fw-bold text-light mb-3 d-flex align-items-center gap-2" style={{ fontSize: '16px' }}>
                    <FiUsers className="text-danger" />
                    Assigned Aegis Responders
                  </h4>

                  <div className="flex-grow-1 d-flex flex-column justify-content-center">
                    {assignedResponders.length === 0 ? (
                      <div className="text-center py-4">
                        <div className="spinner-border spinner-border-sm text-danger mb-3" role="status"></div>
                        <span className="fw-bold text-light d-block" style={{ fontSize: '13.5px' }}>Scanning Local Channels...</span>
                        <span className="text-muted" style={{ fontSize: '11px' }}>Relaying distress waves to community guardians within 2.0 km.</span>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3 py-2">
                        {assignedResponders.map((res) => (
                          <div 
                            key={res.responderId}
                            className="p-3 rounded-4 d-flex align-items-center justify-content-between gap-3 border"
                            style={{ backgroundColor: 'rgba(3,7,18,0.4)', borderColor: 'rgba(255,255,255,0.03)' }}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div className="bg-success text-light p-2 rounded-circle d-flex align-items-center justify-content-center">
                                <FiNavigation size={18} style={{ animation: 'pulse 1.5s infinite' }} />
                              </div>
                              <div className="text-start">
                                <span className="fw-bold text-light d-block" style={{ fontSize: '14px' }}>{res.name}</span>
                                <a 
                                  href={`tel:${res.phoneNumber}`} 
                                  className="text-danger text-decoration-none fw-semibold d-flex align-items-center gap-1 mt-1"
                                  style={{ fontSize: '12px' }}
                                >
                                  <FiPhone />
                                  {res.phoneNumber}
                                </a>
                              </div>
                            </div>

                            <div className="text-end">
                              {res.distanceKm === 0 ? (
                                <span className="badge bg-success rounded-pill uppercase fw-bold" style={{ fontSize: '10px' }}>Arrived</span>
                              ) : (
                                <>
                                  <span className="text-success fw-black d-block" style={{ fontSize: '1.25rem' }}>{res.distanceKm} km</span>
                                  <span className="text-muted uppercase font-weight-bold" style={{ fontSize: '8px', letterSpacing: '0.05em' }}>live range</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Coordinates log & Cancel panel */}
              <div className="col-12 col-md-5 d-flex">
                <div className="aegis-card p-4 w-100 d-flex flex-col justify-content-between gap-4">
                  <div className="w-100">
                    <h4 className="fw-bold text-light mb-3" style={{ fontSize: '16px' }}>Telemetry Logs</h4>
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex justify-content-between align-items-center p-2.5 rounded-3 border" style={{ backgroundColor: 'rgba(3,7,18,0.5)', borderColor: 'rgba(255,255,255,0.02)', fontSize: '12px' }}>
                        <span className="text-muted">Latitude</span>
                        <code className="text-danger font-monospace fw-bold">{victimLocation?.latitude ? victimLocation.latitude.toFixed(6) : '--'}</code>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2.5 rounded-3 border" style={{ backgroundColor: 'rgba(3,7,18,0.5)', borderColor: 'rgba(255,255,255,0.02)', fontSize: '12px' }}>
                        <span className="text-muted">Longitude</span>
                        <code className="text-danger font-monospace fw-bold">{victimLocation?.longitude ? victimLocation.longitude.toFixed(6) : '--'}</code>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2.5 rounded-3 border" style={{ backgroundColor: 'rgba(3,7,18,0.5)', borderColor: 'rgba(255,255,255,0.02)', fontSize: '12px' }}>
                        <span className="text-muted">Scope Error</span>
                        <span className="text-light fw-bold">±{victimLocation?.accuracyInMeters ? Math.round(victimLocation.accuracyInMeters) : 12}m</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-100 pt-3 border-top" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <button
                      onClick={cancelSOS}
                      className="aegis-btn-primary bg-danger hover-bg-red w-100 d-flex align-items-center justify-content-center gap-2"
                    >
                      <FiXCircle size={18} />
                      Cancel SOS distress
                    </button>
                    <span className="text-center text-muted d-block mt-2" style={{ fontSize: '9px' }}>
                      Cancellation resets alarms and releases active responders from dispatch loops.
                    </span>
                  </div>
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
export default AegisHerPanic;
