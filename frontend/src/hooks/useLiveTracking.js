const { useEffect, useRef, useState, useCallback } = require("react");
const { io } = require("socket.io-client");

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:8000";

export function useLiveTracking(userId, role, activeIncidentId = null) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [location, setLocation] = useState(null);
  const [routeHistory, setRouteHistory] = useState([]);
  const [responders, setResponders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());

  const watchIdRef = useRef(null);
  const socketRef = useRef(null);

  // 1. INITIALIZE SOCKET CONNECTION
  useEffect(() => {
    if (!userId) return;

    const socketInstance = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      autoConnect: true
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("[Socket] Connected:", socketInstance.id);
      
      // Register presence on backend registry
      socketInstance.emit("register-presence", {
        userId,
        role,
        location: location || null
      });

      // Rejoin active room if connection was dropped
      if (activeIncidentId) {
        socketInstance.emit("join-incident-room", {
          incidentId: activeIncidentId,
          userId,
          role
        });
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("[Socket] Disconnected");
    });

    // Handle real-time alert updates from registry
    socketInstance.on("responder-status-change", (data) => {
      console.log("[Socket] Responder status change:", data);
      setResponders((prev) => {
        const index = prev.findIndex((r) => r.responderId === data.responderId);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data };
          return updated;
        }
        return [...prev, { responderId: data.responderId, name: data.responderName, ...data }];
      });
    });

    socketInstance.on("responder-location-update", (data) => {
      setResponders((prev) =>
        prev.map((r) =>
          r.responderId === data.responderId ? { ...r, location: data.location } : r
        )
      );
    });

    socketInstance.on("victim-location-update", (data) => {
      if (role === "volunteer") {
        setLocation(data.location);
        setRouteHistory((prev) => [...prev, data.location]);
      }
    });

    // Real-time Chat Receivers
    socketInstance.on("new-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socketInstance.on("user-typing", ({ userId: typingId, userName, isTyping }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) {
          next.add(userName);
        } else {
          next.delete(userName);
        }
        return next;
      });
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [userId, role]);

  // Sync active incident rooms when changes occur
  useEffect(() => {
    if (socketRef.current && activeIncidentId && isConnected) {
      socketRef.current.emit("join-incident-room", {
        incidentId: activeIncidentId,
        userId,
        role
      });
    }
  }, [activeIncidentId, isConnected, userId, role]);

  // 2. CONTINUOUS GEOLOCATION WATCH
  const startTracking = useCallback(() => {
    if (watchIdRef.current) return;

    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    const handleSuccess = (position) => {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyInMeters: position.coords.accuracy,
        timestamp: position.timestamp
      };

      setLocation(coords);
      setRouteHistory((prev) => [...prev, coords]);

      // Emit location updates to socket room
      if (socketRef.current && isConnected) {
        socketRef.current.emit("location-heartbeat", {
          userId,
          role,
          location: coords,
          incidentId: activeIncidentId
        });
      }
    };

    const handleError = (error) => {
      console.error("Geolocation watch error:", error);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [userId, role, activeIncidentId, isConnected]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocation(null);
    setRouteHistory([]);
    setResponders([]);
  }, []);

  // 3. BROADCAST TRIGGER DISTRESS
  const emitTriggerSOS = useCallback((incidentId, location) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("trigger-sos", {
        incidentId,
        victimId: userId,
        location
      });
    }
  }, [userId, isConnected]);

  // 4. SEND MESSAGE INTERFACES
  const sendMessage = useCallback((text, senderName) => {
    if (socketRef.current && isConnected && activeIncidentId) {
      socketRef.current.emit("send-message", {
        incidentId: activeIncidentId,
        senderId: userId,
        senderName,
        text
      });
    }
  }, [userId, activeIncidentId, isConnected]);

  const emitTypingStatus = useCallback((userName, isTyping) => {
    if (socketRef.current && isConnected && activeIncidentId) {
      socketRef.current.emit("typing", {
        incidentId: activeIncidentId,
        userId,
        userName,
        isTyping
      });
    }
  }, [userId, activeIncidentId, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    location,
    routeHistory,
    responders,
    messages,
    typingUsers: Array.from(typingUsers),
    startTracking,
    stopTracking,
    emitTriggerSOS,
    sendMessage,
    emitTypingStatus
  };
}
