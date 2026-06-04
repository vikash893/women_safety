import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Enterprise Leaflet-based Map Component (AegisHer Safety platform)
 * Visualizes coordinates, routes, and risk heatmap zones in real-time.
 */
export function MapContainer({
  victimLocation,
  volunteerLocation,
  routeHistory = [],
  heatmapData = [], // array of { lat, lng, intensity }
  status = "active", // 'active' | 'navigating' | 'arrived'
  height = "400px"
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const victimMarkerRef = useRef(null);
  const volunteerMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const heatmapCirclesRef = useRef([]);

  // Base map coordinate falls back to New Delhi
  const defaultLat = victimLocation?.latitude || 28.6139;
  const defaultLng = victimLocation?.longitude || 77.2090;

  // Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet map instance
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false
    }).setView([defaultLat, defaultLng], 14);

    mapInstanceRef.current = map;

    // Load OpenStreetMap blueprint themed tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19
    }).addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update victim & volunteer markers + routes dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. VICTIM MARKER Setup
    if (victimLocation?.latitude && victimLocation?.longitude) {
      const victimPos = [victimLocation.latitude, victimLocation.longitude];

      // Custom pulsing SVG red anchor marker
      const victimIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background-color: rgba(244, 63, 94, 0.4); animation: pulse 1.5s infinite;"></div>
            <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #f43f5e; border: 2px solid #ffffff; z-index: 10;"></div>
          </div>
        `,
        className: "custom-victim-marker",
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      if (victimMarkerRef.current) {
        victimMarkerRef.current.setLatLng(victimPos);
      } else {
        victimMarkerRef.current = L.marker(victimPos, { icon: victimIcon }).addTo(map);
      }

      // Pan to victim on initialization or shift
      map.panTo(victimPos);
    } else {
      if (victimMarkerRef.current) {
        victimMarkerRef.current.remove();
        victimMarkerRef.current = null;
      }
    }

    // 2. VOLUNTEER MARKER Setup
    if (volunteerLocation?.latitude && volunteerLocation?.longitude) {
      const volPos = [volunteerLocation.latitude, volunteerLocation.longitude];

      // Custom green shield vector marker
      const volunteerIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.3); animation: pulse 2s infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #10b981; border: 2px solid #ffffff; z-index: 10; display: flex; align-items: center; justify-content: center;">
               <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
            </div>
          </div>
        `,
        className: "custom-volunteer-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      if (volunteerMarkerRef.current) {
        volunteerMarkerRef.current.setLatLng(volPos);
      } else {
        volunteerMarkerRef.current = L.marker(volPos, { icon: volunteerIcon }).addTo(map);
      }
    } else {
      if (volunteerMarkerRef.current) {
        volunteerMarkerRef.current.remove();
        volunteerMarkerRef.current = null;
      }
    }

    // 3. DRAW NAVIGATION POLYLINE ROUTE
    if (victimLocation && volunteerLocation) {
      const latlngs = [
        [volunteerLocation.latitude, volunteerLocation.longitude],
        [victimLocation.latitude, victimLocation.longitude]
      ];

      if (routeLineRef.current) {
        routeLineRef.current.setLatLngs(latlngs);
      } else {
        routeLineRef.current = L.polyline(latlngs, {
          color: "#10b981",
          weight: 4,
          dashArray: "10, 8",
          lineJoin: "round"
        }).addTo(map);
      }

      // Auto fit coordinates inside map viewport bounding box
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
    }
  }, [victimLocation, volunteerLocation]);

  // Update Safety Heatmaps overlays dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous heatmap layers
    heatmapCirclesRef.current.forEach((circle) => circle.remove());
    heatmapCirclesRef.current = [];

    // Render risk zones as semi-transparent circular indicators
    heatmapData.forEach((point) => {
      if (!point.lat || !point.lng) return;

      const intensity = point.intensity || 0.5; // score scale: 0 to 1
      const color = intensity > 0.7 ? "#f43f5e" : intensity > 0.4 ? "#fbbf24" : "#10b981";

      const circle = L.circle([point.lat, point.lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.25,
        radius: 120 + intensity * 150, // size scaling with risk
        weight: 1.5
      }).addTo(map);

      heatmapCirclesRef.current.push(circle);
    });
  }, [heatmapData]);

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div
        ref={mapContainerRef}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6)"
        }}
      />
      
      {/* Dynamic Network Status Indicator overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          color: "#94a3b8",
          padding: "8px 12px",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.06)",
          fontSize: "11px",
          zIndex: 1000,
          pointerEvents: "none"
        }}
      >
        🛰️ GPS Lock Secured • {status === "active" ? "Radiating Distress Beacons" : status === "navigating" ? "Volunteer En Route" : "Target Area Reached"}
      </div>
    </div>
  );
}

export default MapContainer;
