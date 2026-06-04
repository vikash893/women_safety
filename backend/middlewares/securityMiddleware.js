const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const jwt = require("jsonwebtoken");

// 1. RATE LIMITERS FOR PRODUCTION STACKS
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 login/registration attempts per window
  message: "Too many authentication attempts from this IP, please try again after 15 minutes."
});

const emergencyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 panic triggers per minute
  message: "Distress trigger rate exceeded. Please try again or call emergency services directly."
});

// 2. INPUT VALIDATION SCHEMAS USING ZOD
const schemas = {
  register: z.object({
    uname: z.string().min(3, "Name must be at least 3 characters long"),
    email: z.string().email("Invalid email address"),
    phoneNo: z.string().min(8, "Phone number must be at least 8 digits"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    gender: z.enum(["male", "female"]),
    city: z.string().optional(),
    emergencyNo: z.number().optional(),
    emergencyMail: z.string().email().optional(),
    pinCode: z.number().optional(),
    address: z.string().optional()
  }),
  login: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required")
  }),
  sosTrigger: z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Mongo User Object ID"),
    lat: z.number().min(-90).max(90),
    long: z.number().min(-180).max(180)
  }),
  incidentReport: z.object({
    report: z.string().min(10, "Report description must be at least 10 characters"),
    pincodeOfIncident: z.string().regex(/^\d{5,8}$/, "Pincode must be between 5 and 8 digits"),
    address: z.string().min(5, "Address details are too short")
  })
};

/**
 * Express middleware helper to validate request body structures
 */
const validateBody = (schemaName) => (req, res, next) => {
  const schema = schemas[schemaName];
  if (!schema) return next();

  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: err.errors.map(e => ({ path: e.path.join("."), message: e.message }))
      });
    }
    next(err);
  }
};

// 3. ROLE-BASED ACCESS CONTROL (RBAC) GUARDS
const requireRole = (allowedRoles) => (req, res, next) => {
  // Assumes user state is loaded on req.user by validation middlewares
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized. Authentication session required." });
  }

  const role = user.role !== undefined ? user.role : 0; // fallback to User (0)
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Insufficient credentials. Required roles: ${allowedRoles.join(" or ")}`
    });
  }

  next();
};

// 4. CUSTOM CSRF DOUBLE-SUBMIT TOKEN VERIFICATION MIDDLEWARE
// Frontend sets X-CSRF-Token header matching token saved in response or state
const csrfProtection = (req, res, next) => {
  // Bypasses check for safe HTTP verbs (GET, HEAD, OPTIONS)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const csrfHeader = req.headers["x-csrf-token"];
  const csrfCookie = req.cookies ? req.cookies["_csrf"] : null;

  // Simple token matching
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return res.status(403).json({
      success: false,
      message: "CSRF token mismatch. Security request denied."
    });
  }

  next();
};

module.exports = {
  authLimiter,
  emergencyLimiter,
  validateBody,
  requireRole,
  csrfProtection
};
