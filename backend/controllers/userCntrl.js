const asyncHandler = require('express-async-handler');
const { User } = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateverificationToken, sendVerificationEmail } = require('../utils/email');
const { successFullVerification } = require('../utils/emailTemplate');

// Access Token secret & Refresh Token secret
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret_123";
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh_secret_456";

const userInfo = asyncHandler(async (req, res) => {
    res.json(req.user);
});

const registerUser = asyncHandler(async (req, res) => {
    const { uname, email, password, phone, emergencyNo, emergencyMail, pincode, gender, role } = req.body;

    if (!uname || !email || !password) {
        res.status(400);
        throw new Error("All fields are mandatory");
    }

    const userAvailable = await User.findOne({ email });
    if (userAvailable) {
        return res.status(400).json({ message: "Email already exists" });
    }

    const verificationToken = generateverificationToken(email);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
        uname,
        email,
        password: hashedPassword,
        verificationToken,
        phoneNo: phone,
        emergencyMail,
        emergencyNo,
        pinCode: pincode,
        gender: gender || "female",
        role: role !== undefined ? role : 0, // 0: victim, 1: volunteer
        isVerified: true // auto-verify for easier local development
    });

    try {
        await sendVerificationEmail(email, verificationToken);
    } catch (emailErr) {
        console.error("Email send failed:", emailErr);
    }

    if (user) {
        res.status(201).json({ message: "User registered successfully" });
    } else {
        res.status(500);
        throw new Error("Something went wrong");
    }
});

const verifyemail = async (req, res) => {
    try {
        const tokenId = req.params.tokenId;
        const user = await User.findOne({ verificationToken: tokenId });

        if (!user) {
            return res.status(404).json({ error: 'Invalid verification token.' });
        }

        user.isVerified = true;
        user.verificationToken = null;
        await user.save();

        const congratulationContent = successFullVerification();
        res.status(200).send(congratulationContent);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred during email verification.' });
        console.log(error);
    }
};

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400);
        throw new Error("All fields are mandatory");
    }

    const user = await User.findOne({ email });
    if (!user) {
        res.status(404);
        throw new Error(`User with email ${email} does not exist`);
    }

    if (!user.isVerified) {
        res.status(403).json({ message: "Your email is not verified" });
        return;
    }

    if (user && (await bcrypt.compare(password, user.password))) {
        // Access Token (Expires in 15 minutes in production; long default for testing if env not set)
        const accessToken = jwt.sign(
            {
                user: {
                    username: user.uname,
                    email: user.email,
                    id: user._id,
                    role: user.role
                }
            },
            ACCESS_SECRET,
            { expiresIn: "15m" }
        );

        // Refresh Token (Expires in 7 days)
        const refreshToken = jwt.sign(
            { id: user._id },
            REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        // Save refresh token to database
        user.refreshToken = refreshToken;
        await user.save();

        // Create a random double-submit CSRF token
        const csrfToken = require("crypto").randomBytes(24).toString("hex");

        // Send refresh token & CSRF token in HTTP-only secure cookies
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.cookie("_csrf", csrfToken, {
            httpOnly: false, // Accessible to front-end JS for header extraction
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            user: {
                _id: user._id,
                uname: user.uname,
                email: user.email,
                phoneNo: user.phoneNo,
                role: user.role,
                bloodGroup: user.bloodGroup,
                medicalNotes: user.medicalNotes,
                isOnline: user.isOnline,
                currentCoords: user.currentCoords,
                trustedCircles: user.trustedCircles
            },
            token: accessToken,
            csrfToken
        });
    } else {
        res.status(400);
        throw new Error("Password is not valid");
    }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) {
        return res.status(401).json({ message: "Refresh token missing" });
    }

    const user = await User.findOne({ refreshToken: token });
    if (!user) {
        return res.status(403).json({ message: "Invalid refresh session" });
    }

    jwt.verify(token, REFRESH_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Expired refresh session" });
        }

        const newAccessToken = jwt.sign(
            {
                user: {
                    username: user.uname,
                    email: user.email,
                    id: user._id,
                    role: user.role
                }
            },
            ACCESS_SECRET,
            { expiresIn: "15m" }
        );

        res.status(200).json({ token: newAccessToken });
    });
});

const logoutUser = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken;
    if (token) {
        const user = await User.findOne({ refreshToken: token });
        if (user) {
            user.refreshToken = null;
            await user.save();
        }
    }
    
    res.clearCookie("refreshToken");
    res.clearCookie("_csrf");
    res.status(200).json({ message: "Logged out successfully" });
});

const profileUpdate = asyncHandler(async (req, res) => {
    const { uid, uname, email, phoneNo, address, pincode, emergencyMail, emergencyNo, extraEmail1, extraEmail2, extraPhone1, extraPhone2 } = req.body;
    const user = await User.findById(uid);
    if (user) {
        user.uname = uname;
        user.email = email;
        user.phoneNo = phoneNo;
        user.address = address;
        user.pinCode = pincode;
        user.emergencyMail = emergencyMail;
        user.emergencyNo = emergencyNo;
        user.extraEmail1 = extraEmail1;
        user.extraEmail2 = extraEmail2;
        user.extraphone1 = extraPhone1;
        user.extraphone2 = extraPhone2;

        await user.save();
        res.status(200).json({ message: "User updated successfully" });
    } else {
        res.status(404).json({ message: "User not found" });
    }
});

// Update Blood and Medical logs
const updateSafetyProfile = asyncHandler(async (req, res) => {
    const { userId, bloodGroup, medicalNotes } = req.body;
    const user = await User.findById(userId);
    if (user) {
        user.bloodGroup = bloodGroup || user.bloodGroup;
        user.medicalNotes = medicalNotes || user.medicalNotes;
        await user.save();
        res.status(200).json({
            message: "Safety profile successfully updated",
            user: {
                bloodGroup: user.bloodGroup,
                medicalNotes: user.medicalNotes
            }
        });
    } else {
        res.status(404).json({ message: "User not found" });
    }
});

// TRUSTED CIRCLES GROUP CONTROLLERS
const getTrustedCircles = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).populate("trustedCircles.members", "uname email phoneNo");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user.trustedCircles);
});

const createTrustedCircle = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: "Circle name is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    user.trustedCircles.push({ name, members: [user._id] }); // includes self as creator
    await user.save();
    res.status(201).json({ message: "Trusted circle created", circles: user.trustedCircles });
});

const deleteTrustedCircle = asyncHandler(async (req, res) => {
    const { circleId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    user.trustedCircles = user.trustedCircles.filter(c => c._id.toString() !== circleId);
    await user.save();
    res.status(200).json({ message: "Trusted circle deleted", circles: user.trustedCircles });
});

const addMemberToCircle = asyncHandler(async (req, res) => {
    const { circleId, memberEmail } = req.body;
    if (!memberEmail) {
        return res.status(400).json({ message: "Member email required" });
    }

    const memberUser = await User.findOne({ email: memberEmail });
    if (!memberUser) {
        return res.status(404).json({ message: "User with this email not found" });
    }

    const user = await User.findById(req.user.id);
    const circle = user.trustedCircles.id(circleId);
    if (!circle) {
        return res.status(404).json({ message: "Trusted circle not found" });
    }

    if (circle.members.includes(memberUser._id)) {
        return res.status(400).json({ message: "User already in circle" });
    }

    circle.members.push(memberUser._id);
    await user.save();
    res.status(200).json({ message: "Member added to circle", circle });
});

module.exports = {
    userInfo,
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    verifyemail,
    profileUpdate,
    updateSafetyProfile,
    getTrustedCircles,
    createTrustedCircle,
    deleteTrustedCircle,
    addMemberToCircle
};