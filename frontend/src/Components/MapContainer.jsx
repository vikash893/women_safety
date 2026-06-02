import React, { useEffect, useState } from 'react';
import { FiShield, FiNavigation, FiRadio } from 'react-icons/fi';

/**
 * Animated SVG Vector Blueprint Map (AegisHer Safety platform)
 * Visualizes emergency distress signals, volunteer routes, and location drift in real-time.
 */
export function MapContainer({
  victimLocation,
  volunteerLocation,
  status = 'active', // 'active' | 'navigating' | 'arrived'
  distanceKm = 1.4,
  height = '350px'
}) {
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScale((prev) => (prev === 1 ? 1.15 : 1));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const vicX = 200;
  const vicY = 150;

  const factor = Math.min(1, Math.max(0, distanceKm / 1.4));
  const volX = vicX - 100 * factor;
  const volY = vicY + 100 * factor;

  return (
    <div 
      className="position-relative w-100 rounded-4 overflow-hidden shadow-inner d-flex align-items-center justify-content-center"
      style={{ 
        height, 
        backgroundColor: '#030712', 
        border: '1px solid rgba(255,255,255,0.08)' 
      }}
    >
      {/* 1. Blueprint Grid Background */}
      <div 
        className="position-absolute w-100 h-100 opacity-25"
        style={{
          backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          inset: 0
        }}
      ></div>
      
      {/* Radial glowing circular safety aura */}
      <div 
        className="position-absolute rounded-circle transition-all duration-1000" 
        style={{ 
          width: '260px',
          height: '260px',
          backgroundColor: 'rgba(244, 63, 94, 0.04)',
          filter: 'blur(40px)',
          transform: `scale(${pulseScale})` 
        }}
      ></div>

      {/* SVG Layer */}
      <svg
        viewBox="0 0 400 300"
        className="w-100 h-100 position-absolute"
        style={{ inset: 0, userSelect: 'none', zIndex: 10 }}
      >
        {/* Radar concentric reference rings */}
        <circle cx={vicX} cy={vicY} r="60" fill="none" stroke="#e11d48" strokeWidth="0.5" strokeDasharray="3 6" className="opacity-25" />
        <circle cx={vicX} cy={vicY} r="120" fill="none" stroke="#e11d48" strokeWidth="0.5" strokeDasharray="4 8" className="opacity-15" />

        {/* 2. Responders Routing Path */}
        {status === 'navigating' && (
          <>
            <path
              d={`M ${volX} ${volY} Q ${(volX + vicX)/2 + 20} ${(volY + vicY)/2 - 20} ${vicX} ${vicY}`}
              fill="none"
              stroke="#0f172a"
              strokeWidth="4"
            />
            <path
              d={`M ${volX} ${volY} Q ${(volX + vicX)/2 + 20} ${(volY + vicY)/2 - 20} ${vicX} ${vicY}`}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              className="aegis-route-dash"
            />
          </>
        )}

        {/* 3. Pulsing rescue signal ripples */}
        {status !== 'arrived' && (
          <>
            <circle cx={vicX} cy={vicY} r="25" fill="rgba(244, 63, 94, 0.06)" className="aegis-animate-ripple" style={{ transformOrigin: `${vicX}px ${vicY}px` }} />
            <circle cx={vicX} cy={vicY} r="50" fill="rgba(244, 63, 94, 0.04)" className="aegis-animate-ripple" style={{ animationDelay: '1s', transformOrigin: `${vicX}px ${vicY}px` }} />
            <circle cx={vicX} cy={vicY} r="75" fill="rgba(244, 63, 94, 0.02)" className="aegis-animate-ripple" style={{ animationDelay: '2s', transformOrigin: `${vicX}px ${vicY}px` }} />
          </>
        )}

        {/* 4. Distress Pin Beacon */}
        <g transform={`translate(${vicX - 10}, ${vicY - 22})`}>
          <circle cx="10" cy="22" r="4" fill="#000" className="opacity-50" />
          <path
            d="M10 0 C4.5 0 0 4.5 0 10 C0 17.5 10 24 10 24 C10 24 20 17.5 20 10 C20 4.5 15.5 0 10 0 Z"
            fill="#e11d48"
            stroke="#fecdd3"
            strokeWidth="1"
          />
          <circle cx="10" cy="10" r="4.5" fill="#ffffff" />
        </g>

        {/* 5. Responders Shield Icon */}
        {status === 'navigating' && (
          <g transform={`translate(${volX - 12}, ${volY - 12})`} style={{ transition: 'all 1s ease-out' }}>
            <circle cx="12" cy="12" r="14" fill="rgba(16, 185, 129, 0.2)" className="aegis-animate-ripple" style={{ transformOrigin: '12px 12px', animationDuration: '2s' }} />
            <circle cx="12" cy="12" r="12" fill="#10b981" stroke="#a7f3d0" strokeWidth="1.5" />
            <path
              d="M12 6.5 L7.5 8.5 V12 C7.5 15.2 12 17.5 12 17.5 C12 17.5 16.5 15.2 16.5 12 V8.5 L12 6.5 Z"
              fill="#ffffff"
            />
          </g>
        )}

        {/* 6. Overlapping success secured badge */}
        {status === 'arrived' && (
          <g transform={`translate(${vicX - 25}, ${vicY - 45})`}>
            <circle cx="25" cy="25" r="22" fill="rgba(16, 185, 129, 0.15)" className="aegis-animate-ripple" style={{ transformOrigin: '25px 25px' }} />
            <path
              d="M25 5 L10 12 V24 C10 33 25 39 25 39 C25 39 40 33 40 24 V12 L25 5 Z"
              fill="#10b981"
              stroke="#a7f3d0"
              strokeWidth="2"
            />
            <path
              d="M20 22 L23 25 L30 18"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )}
      </svg>

      {/* 7. Bottom Overlay Metadata widget */}
      <div 
        className="position-absolute z-20 d-flex justify-content-between align-items-center rounded-3 p-3 shadow"
        style={{ 
          bottom: '16px', 
          left: '16px', 
          right: '16px', 
          backgroundColor: 'rgba(15, 23, 42, 0.92)', 
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '13px'
        }}
      >
        <div className="d-flex align-items-center gap-2">
          {status === 'active' ? (
            <>
              <FiRadio className="text-danger" style={{ animation: 'pulse 1s infinite' }} />
              <span className="fw-bold text-danger">Distress Telemetry Transmitting</span>
            </>
          ) : status === 'navigating' ? (
            <>
              <FiNavigation className="text-success" style={{ animation: 'spin 4s linear infinite' }} />
              <span className="fw-bold text-success">Guardian Dispatch Approaching</span>
            </>
          ) : (
            <>
              <FiShield className="text-success" />
              <span className="fw-bold text-success">Rescue Security Made contact</span>
            </>
          )}
        </div>
        <div className="text-end">
          <span className="text-muted d-block text-uppercase font-weight-bold" style={{ fontSize: '9px', letterSpacing: '0.05em' }}>Radius Tracking</span>
          <span className="fw-bold text-light">
            {status === 'active' ? 'Scanning 2.0 km' : status === 'navigating' ? `${distanceKm} km away` : 'Target Secured'}
          </span>
        </div>
      </div>

      {/* Accuracy bubble */}
      {status === 'active' && (
        <div 
          className="position-absolute rounded-pill px-3 py-1 text-light border"
          style={{ 
            top: '16px', 
            left: '16px', 
            backgroundColor: 'rgba(15, 23, 42, 0.8)', 
            borderColor: 'rgba(255,255,255,0.06)',
            fontSize: '10px',
            zIndex: 20
          }}
        >
          Accuracy: ±{victimLocation?.accuracyInMeters ? Math.round(victimLocation.accuracyInMeters) : 12}m
        </div>
      )}
    </div>
  );
}
export default MapContainer;
