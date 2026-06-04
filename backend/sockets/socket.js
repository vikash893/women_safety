const { Server } = require("socket.io");
const { Chat } = require("../models/chatVictimModel");

// Simple in-memory maps to track active socket presences
// In a distributed production cluster, this would be backed by Redis
const onlineUsers = new Map(); // userId -> { socketId, role, location, activeEmergencyId }
const activeIncidents = new Map(); // incidentId -> { victimId, location, responders: Map(responderId -> location) }

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  console.log("Socket.IO infrastructure initialized.");

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // 1. REGISTER USER PRESENCE
    socket.on("register-presence", ({ userId, role, location }) => {
      if (!userId) return;
      
      // Clean up previous socket if the same user logged in again (reconnection handler)
      for (const [uid, udata] of onlineUsers.entries()) {
        if (uid === userId && udata.socketId !== socket.id) {
          onlineUsers.delete(uid);
        }
      }

      onlineUsers.set(userId, {
        socketId: socket.id,
        role: role || "victim",
        location: location || null,
        activeEmergencyId: null
      });

      console.log(`Presence registered: User=${userId}, Role=${role}, Socket=${socket.id}`);
      
      // If volunteer, join the global volunteer channel
      if (role === "volunteer") {
        socket.join("volunteers-channel");
      }
    });

    // 2. TRIGGER SOS (SOCKET INITIATED)
    socket.on("trigger-sos", ({ incidentId, victimId, location }) => {
      if (!incidentId || !victimId) return;

      console.log(`SOS Socket Trigger: Incident=${incidentId}, Victim=${victimId}`);

      // Register the incident locally
      activeIncidents.set(incidentId, {
        victimId,
        location,
        responders: new Map()
      });

      // Update victim's presence state
      const victimData = onlineUsers.get(victimId);
      if (victimData) {
        victimData.activeEmergencyId = incidentId;
        victimData.location = location;
      }

      // Add victim's socket to their unique incident room
      socket.join(`incident-${incidentId}`);

      // Broadcast distress signal to all online volunteers
      io.to("volunteers-channel").emit("distress-alert", {
        incidentId,
        victimId,
        location,
        timestamp: Date.now()
      });
    });

    // 3. JOIN EMERGENCY ROOM
    socket.on("join-incident-room", ({ incidentId, userId, role }) => {
      socket.join(`incident-${incidentId}`);
      console.log(`Socket ${socket.id} (User=${userId}, Role=${role}) joined room: incident-${incidentId}`);
    });

    // 4. VOLUNTEER ACCEPT SOS DISPATCH
    socket.on("accept-sos", ({ incidentId, responderId, responderName, location }) => {
      const incident = activeIncidents.get(incidentId);
      if (!incident) {
        socket.emit("error-message", { message: "Incident not active or already resolved." });
        return;
      }

      // Track responder coordinate
      incident.responders.set(responderId, location);

      // Join the volunteer to this incident room
      socket.join(`incident-${incidentId}`);

      // Notify the victim that a responder is en route
      io.to(`incident-${incidentId}`).emit("responder-status-change", {
        incidentId,
        responderId,
        responderName,
        status: "navigating",
        location
      });

      console.log(`Volunteer ${responderId} accepted distress dispatch ${incidentId}`);
    });

    // 5. HEARTBEAT LOCATION UPDATES
    socket.on("location-heartbeat", ({ userId, role, location, incidentId }) => {
      if (!userId || !location) return;

      // Update in memory presence mapping
      const userData = onlineUsers.get(userId);
      if (userData) {
        userData.location = location;
      }

      if (incidentId) {
        const incident = activeIncidents.get(incidentId);
        if (incident) {
          if (role === "volunteer") {
            incident.responders.set(userId, location);
            // Broadcast en-route volunteer tracking to this room
            io.to(`incident-${incidentId}`).emit("responder-location-update", {
              responderId: userId,
              location
            });
          } else {
            incident.location = location;
            // Broadcast updated victim tracking coordinates
            io.to(`incident-${incidentId}`).emit("victim-location-update", {
              victimId: userId,
              location
            });
          }
        }
      }
    });

    // 6. VOLUNTEER ARRIVAL STATUS CHANGE
    socket.on("responder-arrived", ({ incidentId, responderId }) => {
      io.to(`incident-${incidentId}`).emit("responder-status-change", {
        incidentId,
        responderId,
        status: "arrived"
      });
      console.log(`Responder ${responderId} arrived at distress site ${incidentId}`);
    });

    // 7. REAL-TIME CHAT PROPAGATION (EMERGENCY ROOM CHAT)
    socket.on("send-message", async ({ incidentId, senderId, senderName, text }) => {
      if (!incidentId || !senderId || !text) return;

      try {
        // Broadcast in real-time to everyone in the room
        const messageData = {
          incidentId,
          senderId,
          senderName,
          text,
          timestamp: new Date()
        };

        io.to(`incident-${incidentId}`).emit("new-message", messageData);

        // Persist message in background database
        await Chat.create({
          sender: senderId,
          textChat: text,
          emergency: incidentId
        });
      } catch (err) {
        console.error("Failed to propagate and persist chat message:", err);
      }
    });

    // Typing Indicators & Read receipts
    socket.on("typing", ({ incidentId, userId, userName, isTyping }) => {
      socket.to(`incident-${incidentId}`).emit("user-typing", { userId, userName, isTyping });
    });

    socket.on("mark-read", ({ incidentId, userId }) => {
      socket.to(`incident-${incidentId}`).emit("messages-read", { userId });
    });

    // 8. RESOLVE / CANCEL SOS
    socket.on("resolve-sos", ({ incidentId }) => {
      const incident = activeIncidents.get(incidentId);
      if (incident) {
        // Set all active user statuses back to null
        const victimData = onlineUsers.get(incident.victimId);
        if (victimData) {
          victimData.activeEmergencyId = null;
        }
        for (const resId of incident.responders.keys()) {
          const resData = onlineUsers.get(resId);
          if (resData) resData.activeEmergencyId = null;
        }

        // Notify client nodes
        io.to(`incident-${incidentId}`).emit("sos-resolved", { incidentId });
        
        // Cleanup memory state
        activeIncidents.delete(incidentId);
        console.log(`Incident ${incidentId} resolved and closed.`);
      }
    });

    // 9. CLEAN DISCONNECTS
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Identify who disconnected
      let disconnectedUserId = null;
      for (const [uid, udata] of onlineUsers.entries()) {
        if (udata.socketId === socket.id) {
          disconnectedUserId = uid;
          break;
        }
      }

      if (disconnectedUserId) {
        onlineUsers.delete(disconnectedUserId);
        console.log(`Removed user registry: ${disconnectedUserId}`);
      }
    });
  });

  return io;
}

module.exports = { initSocketServer, onlineUsers, activeIncidents };
