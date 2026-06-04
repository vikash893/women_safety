const twilio = require("twilio");
const admin = require("firebase-admin");
const { sendHelpEmail, sendHelpEmailContacts } = require("./email");

// 1. Initialize Twilio client if keys are present
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;

let twilioClient = null;
if (twilioSid && twilioAuthToken) {
  twilioClient = twilio(twilioSid, twilioAuthToken);
} else {
  console.warn("[Notifications] Twilio credentials missing. SMS messages will be logged to console.");
}

// 2. Initialize Firebase Cloud Messaging if service account is provided
let fcmEnabled = false;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    fcmEnabled = true;
    console.log("[Notifications] Firebase Cloud Messaging initialized.");
  } else {
    console.warn("[Notifications] Firebase Service Account JSON missing. FCM alerts disabled.");
  }
} catch (err) {
  console.error("[Notifications] Failed to initialize Firebase Admin SDK:", err);
}

/**
 * Dispatch SMS alerts to emergency contacts or volunteers
 */
async function sendSMS({ to, body }) {
  if (!to) return;
  if (twilioClient) {
    try {
      const message = await twilioClient.messages.create({
        body,
        from: twilioFromNumber,
        to
      });
      console.log(`[Notifications] SMS dispatched successfully. SID: ${message.sid}`);
    } catch (err) {
      console.error(`[Notifications] Failed to send Twilio SMS to ${to}:`, err);
    }
  } else {
    console.log(`[Notifications] [MOCK SMS TO ${to}] Message: ${body}`);
  }
}

/**
 * Dispatch FCM Push Notifications
 */
async function sendPushNotification({ token, title, body, data = {} }) {
  if (!token) return;
  if (fcmEnabled) {
    try {
      const message = {
        notification: { title, body },
        data,
        token
      };
      const response = await admin.messaging().send(message);
      console.log(`[Notifications] FCM Push notification dispatched. Msg ID: ${response}`);
    } catch (err) {
      console.error("[Notifications] FCM push dispatch failed:", err);
    }
  } else {
    console.log(`[Notifications] [MOCK PUSH TO ${token}] Title: ${title} | Body: ${body}`);
  }
}

/**
 * Orchestrates multi-channel notifications on SOS execution
 */
async function dispatchEmergencyNotifications({
  alertId,
  victimName,
  lat,
  long,
  address,
  pincode,
  contactsList,
  volunteerEmails = [],
  volunteerPhones = [],
  volunteerPushTokens = []
}) {
  const timestamp = new Date().toLocaleString();
  const liveLocationLink = `https://maps.google.com/maps?q=${lat},${long}&hl=en&z=14`;
  
  const smsBody = `AegisHer EMERGENCY SOS!\nName: ${victimName}\nLocation: ${address}\nCoords: ${lat}, ${long}\nMap Link: ${liveLocationLink}\nTime: ${timestamp}\nID: ${alertId}`;

  // 1. Dispatch SMS to primary Emergency Contacts
  for (const contact of contactsList) {
    if (contact.phoneNumber) {
      await sendSMS({ to: contact.phoneNumber, body: smsBody });
    }
  }

  // 2. Dispatch SMS to matched Volunteers
  for (const volPhone of volunteerPhones) {
    if (volPhone) {
      await sendSMS({ to: volPhone, body: `AegisHer Active Dispatch Alert!\nVictim: ${victimName} is in immediate danger. Map: ${liveLocationLink}` });
    }
  }

  // 3. Dispatch FCM Push alerts to volunteers
  for (const token of volunteerPushTokens) {
    if (token) {
      await sendPushNotification({
        token,
        title: "AegisHer EMERGENCY SOS IN RADIUS",
        body: `${victimName} needs assistance nearby! Tap to navigate.`,
        data: { alertId, lat: String(lat), long: String(long) }
      });
    }
  }

  // 4. Dispatch Email alerts via Nodemailer (Gmail templates)
  const contactEmails = contactsList.map(c => c.email).filter(Boolean);
  if (contactEmails.length > 0) {
    try {
      await sendHelpEmail(contactEmails, lat, long, victimName, pincode, address);
    } catch (err) {
      console.error("[Notifications] Email delivery failed:", err);
    }
  }

  if (volunteerEmails.length > 0) {
    try {
      await sendHelpEmailContacts(volunteerEmails, lat, long, victimName, pincode, address);
    } catch (err) {
      console.error("[Notifications] Volunteer email delivery failed:", err);
    }
  }
}

module.exports = {
  sendSMS,
  sendPushNotification,
  dispatchEmergencyNotifications
};
