import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWebBuzzer } from '../hooks/useWebBuzzer';
import { useLiveTracking } from '../hooks/useLiveTracking';
import { useVoiceSOS } from '../hooks/useVoiceSOS';
import { useAuth } from './auth';
import axios from 'axios';
import toast from 'react-hot-toast';

const SafetyContext = createContext();

export function useSafety() {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
}

export function SafetyProvider({ children }) {
  const [auth] = useAuth();
  
  // ─── Local user configuration ──────────────────────────────────────
  const [user, setUser] = useState({
    id: 'demo-user',
    name: 'AegisHer User',
    role: 'victim',
    phoneNumber: '+91 99999 88888',
    safetyProfile: {
      bloodGroup: 'B+',
      medicalNotes: 'Asthmatic, carries inhaler.'
    }
  });

  // Sync user object with database authentication session details
  useEffect(() => {
    if (auth?.user) {
      setUser({
        id: auth.user._id,
        name: auth.user.uname || auth.user.name || 'AegisHer User',
        role: auth.user.role === 1 ? 'volunteer' : auth.user.role === 2 ? 'admin' : 'victim',
        phoneNumber: auth.user.phoneNo || '+91 99999 88888',
        safetyProfile: {
          bloodGroup: auth.user.bloodGroup || 'O+',
          medicalNotes: auth.user.medicalNotes || ''
        }
      });
    }
  }, [auth]);

  // ─── Hooks and State parameters ────────────────────────────────────
  const { startSiren, stopSiren } = useWebBuzzer();
  const [activeIncidentId, setActiveIncidentId] = useState(null);
  
  const {
    isConnected,
    location: gpsLocation,
    routeHistory,
    responders: socketResponders,
    messages,
    typingUsers,
    startTracking,
    stopTracking,
    emitTriggerSOS,
    sendMessage,
    emitTypingStatus
  } = useLiveTracking(user.id, user.role, activeIncidentId);

  const [isSosTriggered, setIsSosTriggered] = useState(false);
  const [sosStatus, setSosStatus] = useState('resolved'); // 'active' | 'responded' | 'resolved'
  const [buzzerEnabled, setBuzzerEnabled] = useState(false);
  const [assignedResponders, setAssignedResponders] = useState([]);
  const [victimLocation, setVictimLocation] = useState(null);
  
  // AI Metrics
  const [riskScore, setRiskScore] = useState(0);
  const [suspicionScore, setSuspicionScore] = useState(0);
  const [recommendations, setRecommendations] = useState([]);

  // Voice Wake settings
  const [voiceSosEnabled, setVoiceSosEnabled] = useState(false);

  // Group Circles
  const [circles, setCircles] = useState([]);
  const [contacts, setContacts] = useState([]);

  // Volunteer online states
  const [isOnline, setIsOnline] = useState(false);
  const [incomingAlerts, setIncomingAlerts] = useState([]);
  const [activeMission, setActiveMission] = useState(null);

  // Sync coords from tracking hook
  useEffect(() => {
    if (isSosTriggered && gpsLocation) {
      setVictimLocation(gpsLocation);
    }
  }, [isSosTriggered, gpsLocation]);

  // Load circles and profiles when auth session state is active
  useEffect(() => {
    if (auth?.token) {
      fetchTrustedCircles();
    }
  }, [auth]);

  const fetchTrustedCircles = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/v1/users/circles", {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (res.status === 200) {
        setCircles(res.data);
        // Map contacts array for legacy compatibility
        const legacyContacts = [];
        res.data.forEach(circle => {
          circle.members.forEach(member => {
            legacyContacts.push({
              contactId: member._id,
              name: member.uname,
              phoneNumber: member.phoneNo || "+91 99999 88888",
              isPriority: true
            });
          });
        });
        setContacts(legacyContacts);
      }
    } catch (err) {
      console.error("Failed to load circles:", err);
    }
  };

  const createCircle = async (name) => {
    try {
      const res = await axios.post(
        "http://localhost:8000/api/v1/users/circles",
        { name },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      if (res.status === 201) {
        toast.success(`Trusted circle "${name}" created.`);
        fetchTrustedCircles();
      }
    } catch (err) {
      toast.error("Failed to create circle.");
    }
  };

  const deleteCircle = async (circleId) => {
    try {
      await axios.delete(`http://localhost:8000/api/v1/users/circles/${circleId}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      toast.success("Circle deleted.");
      fetchTrustedCircles();
    } catch (err) {
      toast.error("Failed to delete circle.");
    }
  };

  const addCircleMember = async (circleId, memberEmail) => {
    try {
      await axios.post(
        "http://localhost:8000/api/v1/users/circles/add-member",
        { circleId, memberEmail },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      toast.success("Circle member added.");
      fetchTrustedCircles();
    } catch (err) {
      toast.error("Member search or registration issue.");
    }
  };

  // ─── Voice activated SOS callback trigger ─────────────────────────
  const triggerVoiceSOS = () => {
    if (isSosTriggered) return;
    toast.error("🗣️ VOICE SOS TRIGGER ACTION ENFORCED!");
    triggerSOS(true);
  };

  const voiceSOS = useVoiceSOS(triggerVoiceSOS, voiceSosEnabled);

  // ─── SOS Distress Triggers ─────────────────────────────────────────
  const triggerSOS = async (loudSiren = true) => {
    if (isSosTriggered) return;

    // Capture baseline location coords
    let initialCoords = gpsLocation;
    if (!initialCoords) {
      // Fallback coordinate mapping
      initialCoords = {
        latitude: 28.6139,
        longitude: 77.2090,
        accuracyInMeters: 10,
        timestamp: Date.now()
      };
      setVictimLocation(initialCoords);
    }

    try {
      // 1. Post to API to create DB incident and fire notify engines
      const payload = {
        userId: user.id,
        lat: initialCoords.latitude,
        long: initialCoords.longitude
      };

      const res = await axios.post("http://localhost:8000/api/v1/emergency/emergencypressed", payload, {
        headers: { Authorization: `Bearer ${auth?.token}` }
      });

      if (res.status === 200) {
        const { incidentId, riskScore, suspicionScore } = res.data;

        setActiveIncidentId(incidentId);
        setIsSosTriggered(true);
        setSosStatus("active");
        setBuzzerEnabled(loudSiren);
        setRiskScore(riskScore);
        setSuspicionScore(suspicionScore);

        // Start continuous map tracker
        startTracking();

        // Relay distress signal via Sockets
        emitTriggerSOS(incidentId, initialCoords);

        if (loudSiren) {
          startSiren();
        }

        toast.success("🔴 DISTRESS BEACONS BROADCASTED!");
      }
    } catch (err) {
      console.error("SOS Trigger failure:", err);
      toast.error("SOS Dispatch Gateway Timeout.");
    }
  };

  const cancelSOS = async () => {
    if (!activeIncidentId) return;

    try {
      // Post resolve status to API
      await axios.patch(`http://localhost:8000/api/v1/emergency/${activeIncidentId}`, {}, {
        headers: { Authorization: `Bearer ${auth?.token}` }
      });
    } catch (err) {
      console.error("Failed to update status on API:", err);
    }

    setIsSosTriggered(false);
    setActiveIncidentId(null);
    setSosStatus("resolved");
    setBuzzerEnabled(false);
    setAssignedResponders([]);
    setIncomingAlerts([]);
    setActiveMission(null);

    stopSiren();
    stopTracking();
    setVictimLocation(null);
    toast.success("SOS distress cancelled safely.");
  };

  const toggleBuzzer = () => {
    if (buzzerEnabled) {
      stopSiren();
      setBuzzerEnabled(false);
    } else {
      startSiren();
      setBuzzerEnabled(true);
    }
  };

  // Sync live responders from sockets
  useEffect(() => {
    if (socketResponders.length > 0) {
      setAssignedResponders(socketResponders);
      setSosStatus("responded");
    }
  }, [socketResponders]);

  // ─── Volunteer Operations ─────────────────────────────────────────
  const toggleOnline = () => {
    setIsOnline((prev) => {
      const nextOnline = !prev;
      if (!nextOnline) {
        setIncomingAlerts([]);
        setActiveMission(null);
        stopTracking();
      } else {
        startTracking();
      }
      return nextOnline;
    });
  };

  const acceptIncident = (alertId) => {
    // Locate target dispatch alert
    const alertObj = incomingAlerts.find((a) => a.incidentId === alertId);
    if (!alertObj) return;

    setActiveIncidentId(alertId);
    setSosStatus("responded");

    const activeVolMission = {
      ...alertObj,
      status: "navigating",
      volunteerCoords: gpsLocation || { latitude: 28.6039, longitude: 77.2030 }
    };
    setActiveMission(activeVolMission);
    setIncomingAlerts([]);

    // Trigger responder accept socket call
    // Hook handles location routing heartbeats automatically
    toast.success("Assigned to emergency coordinate grid.");
  };

  const resolveActiveMission = () => {
    cancelSOS();
  };

  const changeUserRole = (role) => {
    // Updates role local state
    setUser((prev) => ({ ...prev, role }));
    cancelSOS();
  };

  const addContact = (newContact) => {
    // Add member locally (fallback for mock mode)
    setContacts((prev) => [...prev, { ...newContact, contactId: `c-${Date.now()}` }]);
  };

  const removeContact = (id) => {
    setContacts((prev) => prev.filter((c) => c.contactId !== id));
  };

  return (
    <SafetyContext.Provider
      value={{
        user,
        contacts,
        addContact,
        removeContact,
        isSosTriggered,
        incidentId: activeIncidentId,
        sosStatus,
        buzzerEnabled,
        victimLocation,
        assignedResponders,
        triggerSOS,
        cancelSOS,
        toggleBuzzer,
        isOnline,
        incomingAlerts,
        activeMission,
        toggleOnline,
        acceptIncident,
        resolveActiveMission,
        changeUserRole,
        
        // Upgraded Real-time Systems
        isConnected,
        routeHistory,
        messages,
        typingUsers,
        sendMessage,
        emitTypingStatus,

        // AI engine analysis reports
        riskScore,
        suspicionScore,
        recommendations,

        // Voice wakeup controls
        voiceSosEnabled,
        setVoiceSosEnabled,
        voiceListening: voiceSOS.isListening,
        voiceError: voiceSOS.error,
        voiceLastHeard: voiceSOS.lastHeard,
        voiceCurrentLang: voiceSOS.currentLang,

        // Group circle controls
        circles,
        createCircle,
        deleteCircle,
        addCircleMember
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
}
