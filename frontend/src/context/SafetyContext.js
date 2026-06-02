import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWebBuzzer } from '../hooks/useWebBuzzer';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from './auth';

const SafetyContext = createContext();

export function useSafety() {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
}

export function SafetyProvider({ children }) {
  // --- 1. Load User Session from Auth context ---
  const [auth] = useAuth();
  const { startBuzzer, stopBuzzer } = useWebBuzzer();
  const { location: gpsLocation, error: gpsError, startTracking, stopTracking } = useGeolocation();

  // A. User Session State (Syncs with user's real context if logged in, otherwise mock)
  const [user, setUser] = useState({
    id: 'usr-demo',
    name: 'Vishnu Singh',
    role: 'victim',
    phoneNumber: '+91 98765 43210',
    safetyProfile: {
      bloodGroup: 'O+',
      medicalNotes: 'Asthmatic, carries inhaler.'
    }
  });

  useEffect(() => {
    if (auth?.user) {
      setUser({
        id: auth.user._id || 'usr-database',
        name: auth.user.username || auth.user.name || 'AegisHer User',
        role: auth.user.role || 'victim',
        phoneNumber: auth.user.emergencyNo || '+91 99999 88888',
        safetyProfile: {
          bloodGroup: auth.user.bloodGroup || 'B+',
          medicalNotes: auth.user.medicalNotes || 'Crucial health details.'
        }
      });
    }
  }, [auth]);

  // B. Emergency Contacts State
  const [contacts, setContacts] = useState([
    { contactId: 'c1', name: 'Rohan Sharma (Brother)', phoneNumber: '+91 99999 88888', isPriority: true },
    { contactId: 'c2', name: 'Pooja Verma (Best Friend)', phoneNumber: '+91 88888 77777', isPriority: true }
  ]);

  // C. Active SOS State
  const [isSosTriggered, setIsSosTriggered] = useState(false);
  const [incidentId, setIncidentId] = useState(null);
  const [sosStatus, setSosStatus] = useState('resolved'); // 'active' | 'responded' | 'resolved'
  const [buzzerEnabled, setBuzzerEnabled] = useState(false);
  const [assignedResponders, setAssignedResponders] = useState([]);
  const [victimLocation, setVictimLocation] = useState(null);

  // D. Volunteer State
  const [isOnline, setIsOnline] = useState(false);
  const [incomingAlerts, setIncomingAlerts] = useState([]);
  const [activeMission, setActiveMission] = useState(null);

  const simulationIntervalRef = useRef(null);
  const autoResponderTimeoutRef = useRef(null);

  // Sync Location Coordinates
  useEffect(() => {
    if (isSosTriggered && gpsLocation) {
      setVictimLocation(gpsLocation);
    }
  }, [isSosTriggered, gpsLocation]);

  useEffect(() => {
    return () => {
      stopBuzzer();
      stopTracking();
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      if (autoResponderTimeoutRef.current) clearTimeout(autoResponderTimeoutRef.current);
    };
  }, [stopBuzzer, stopTracking]);

  // --- 2. Action Logic ---
  const addContact = (newContact) => {
    setContacts((prev) => [
      ...prev,
      { ...newContact, contactId: `c-${Date.now()}` }
    ]);
  };

  const removeContact = (id) => {
    setContacts((prev) => prev.filter((c) => c.contactId !== id));
  };

  // SOS Distress Triggers
  const triggerSOS = (loudSiren = true) => {
    if (isSosTriggered) return;

    const newIncidentId = `inc-${Math.floor(100000 + Math.random() * 900000)}`;
    setIncidentId(newIncidentId);
    setIsSosTriggered(true);
    setSosStatus('active');
    setBuzzerEnabled(loudSiren);
    setAssignedResponders([]);

    startTracking();

    if (loudSiren) {
      startBuzzer();
    }

    const initialLocation = gpsLocation || {
      latitude: 28.6139,
      longitude: 77.2090,
      accuracyInMeters: 12,
      timestamp: Date.now(),
      isMocked: true
    };
    setVictimLocation(initialLocation);

    // Propagate alarm alerts to Volunteer network
    const newAlert = {
      incidentId: newIncidentId,
      victimName: user.name,
      victimPhone: user.phoneNumber,
      bloodGroup: user.safetyProfile.bloodGroup,
      medicalNotes: user.safetyProfile.medicalNotes,
      location: initialLocation,
      distanceKm: 1.4,
      timestamp: Date.now()
    };

    setIncomingAlerts([newAlert]);

    // Dispatch Simulator fallbacks (nearby responders respond after 4s)
    autoResponderTimeoutRef.current = setTimeout(() => {
      simulateAutoResponderAcceptance();
    }, 4500);
  };

  const cancelSOS = () => {
    setIsSosTriggered(false);
    setIncidentId(null);
    setSosStatus('resolved');
    setBuzzerEnabled(false);
    setAssignedResponders([]);
    setIncomingAlerts([]);
    setActiveMission(null);

    stopBuzzer();
    stopTracking();
    setVictimLocation(null);

    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if (autoResponderTimeoutRef.current) {
      clearTimeout(autoResponderTimeoutRef.current);
      autoResponderTimeoutRef.current = null;
    }
  };

  const toggleBuzzer = () => {
    if (buzzerEnabled) {
      stopBuzzer();
      setBuzzerEnabled(false);
    } else {
      startBuzzer();
      setBuzzerEnabled(true);
    }
  };

  // Volunteer operations
  const toggleOnline = () => {
    setIsOnline((prev) => {
      const nextOnline = !prev;
      if (!nextOnline) {
        setIncomingAlerts([]);
        setActiveMission(null);
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
      } else {
        if (isSosTriggered && incidentId) {
          setIncomingAlerts([
            {
              incidentId,
              victimName: user.name,
              victimPhone: user.phoneNumber,
              bloodGroup: user.safetyProfile.bloodGroup,
              medicalNotes: user.safetyProfile.medicalNotes,
              location: victimLocation || { latitude: 28.6139, longitude: 77.2090 },
              distanceKm: 1.4,
              timestamp: Date.now()
            }
          ]);
        }
      }
      return nextOnline;
    });
  };

  const acceptIncident = (alertId) => {
    const alertObj = incomingAlerts.find((a) => a.incidentId === alertId);
    if (!alertObj) return;

    if (autoResponderTimeoutRef.current) {
      clearTimeout(autoResponderTimeoutRef.current);
      autoResponderTimeoutRef.current = null;
    }

    setSosStatus('responded');
    
    const activeVolMission = {
      ...alertObj,
      status: 'navigating',
      volunteerCoords: {
        latitude: alertObj.location.latitude - 0.01,
        longitude: alertObj.location.longitude - 0.006
      }
    };
    setActiveMission(activeVolMission);
    setIncomingAlerts([]);

    const humanVolunteer = {
      responderId: 'vol-aegis',
      name: 'Sneha Rao (Aegis Guardian)',
      phoneNumber: '+91 96111 54321',
      distanceKm: 1.4,
      isAutoSimulated: false
    };
    setAssignedResponders([humanVolunteer]);

    startLiveRouteSimulation('vol-aegis', 1.4);
  };

  const resolveActiveMission = () => {
    cancelSOS();
  };

  const simulateAutoResponderAcceptance = () => {
    if (sosStatus !== 'active') return;

    setSosStatus('responded');

    const botVolunteer = {
      responderId: 'vol-bot',
      name: 'Vikram Singh (Aegis Guardian)',
      phoneNumber: '+91 98888 22112',
      distanceKm: 0.9,
      isAutoSimulated: true
    };

    setAssignedResponders([botVolunteer]);
    startLiveRouteSimulation('vol-bot', 0.9);
  };

  const startLiveRouteSimulation = (responderId, startDistance) => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }

    let currentDistance = startDistance;

    simulationIntervalRef.current = setInterval(() => {
      currentDistance = Math.max(0, currentDistance - 0.15);

      setActiveMission((prev) => {
        if (!prev) return null;
        const lerpFactor = (startDistance - currentDistance) / startDistance;
        const newLat = prev.location.latitude - 0.01 * (1 - lerpFactor);
        const newLng = prev.location.longitude - 0.006 * (1 - lerpFactor);
        
        return {
          ...prev,
          distanceKm: parseFloat(currentDistance.toFixed(2)),
          volunteerCoords: { latitude: newLat, longitude: newLng }
        };
      });

      setAssignedResponders((prevList) =>
        prevList.map((res) =>
          res.responderId === responderId
            ? { ...res, distanceKm: parseFloat(currentDistance.toFixed(2)) }
            : res
        )
      );

      if (currentDistance <= 0) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
        
        setActiveMission((prev) => prev ? { ...prev, status: 'arrived', distanceKm: 0 } : null);
      }
    }, 2500);
  };

  const changeUserRole = (role) => {
    setUser((prev) => ({ ...prev, role }));
    cancelSOS();
  };

  return (
    <SafetyContext.Provider value={{
      user,
      contacts,
      addContact,
      removeContact,
      isSosTriggered,
      incidentId,
      sosStatus,
      buzzerEnabled,
      victimLocation,
      assignedResponders,
      triggerSOS,
      cancelSOS,
      toggleBuzzer,
      gpsError,
      isOnline,
      incomingAlerts,
      activeMission,
      toggleOnline,
      acceptIncident,
      resolveActiveMission,
      changeUserRole
    }}>
      {children}
    </SafetyContext.Provider>
  );
}
