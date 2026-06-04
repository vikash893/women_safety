const asyncHandler = require('express-async-handler');
const { Incident } = require('../models/incidentRptModel');
const { User } = require('../models/userModel');

const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
require('dotenv').config();

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'us-east-2'
});

const s3 = new AWS.S3();

const addIncident = asyncHandler(async (req, res) => {
    const { user, report, pincodeOfIncident, mimeType, address } = req.body;

    // Validate required fields
    if (!user || !report) {
        return res.status(400).json({ message: "User ID and report description are required." });
    }

    // Check if file was uploaded
    if (req.file && req.file.path) {
        const note = req.file.path;

        // Validate file size (max 10MB)
        if (req.file.size > 10 * 1024 * 1024) {
            // Clean up uploaded file
            fs.unlink(note, () => {});
            return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
        }

        // Validate MIME type
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/wav', 'application/pdf'];
        const fileMime = req.file.mimetype || mimeType;
        if (fileMime && !allowedMimes.includes(fileMime)) {
            fs.unlink(note, () => {});
            return res.status(400).json({ message: `File type '${fileMime}' is not allowed.` });
        }

        // Upload to S3 if credentials are configured
        if (process.env.AWS_ACCESS_KEY && process.env.AWS_BUCKET_NAME) {
            try {
                const params = {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: `incidents/${Date.now()}-${path.basename(note)}`,
                    Body: fs.createReadStream(note),
                    ContentType: fileMime || 'application/octet-stream'
                };
                const s3Response = await s3.upload(params).promise();

                const incident = await Incident.create({
                    user,
                    report,
                    pincodeOfIncident,
                    address,
                    meidaSt: s3Response.Location
                });

                // Clean up local file after S3 upload
                fs.unlink(note, () => {});

                return res.status(201).json({ message: "Incident reported successfully", incidentId: incident._id });
            } catch (s3Err) {
                console.error("S3 upload failed, storing local path:", s3Err.message);
                // Fallback: store local path
            }
        }

        // Fallback: store with local file path
        const incident = await Incident.create({
            user,
            report,
            pincodeOfIncident,
            address,
            meidaSt: note
        });

        return res.status(201).json({ message: "Incident reported successfully", incidentId: incident._id });

    } else {
        // No file uploaded — create incident without media
        const incident = await Incident.create({
            user,
            report,
            address,
            pincodeOfIncident
        });

        if (incident) {
            return res.status(201).json({ message: "Incident reported successfully", incidentId: incident._id });
        } else {
            return res.status(500).json({ message: "Failed to create incident report" });
        }
    }
});


const getAllIncidents = asyncHandler(async (req, res) => {
    const incidents = await Incident.find({}).sort({ createdAt: -1 });
    const data = [];

    for (const x of incidents) {
        const user = await User.findById(x.user);
        if (user) {
            data.push({
                _id: x._id,
                uname: user.uname,
                address: x.address,
                pincode: x.pincodeOfIncident,
                report: x.report,
                isSeen: x.isSeen,
                image: x.meidaSt || "empty",
                createdAt: x.createdAt,
                updatedAt: x.updatedAt
            });
        }
    }
    res.status(200).json(data);
});

const acknowledgeInc = asyncHandler(async (req, res) => {
    const inc = req.params.id;
    const incident = await Incident.findById(inc);

    if (incident) {
        incident.isSeen = true;
        await incident.save();
        res.status(200).json({ message: "Incident acknowledged successfully", incidentId: incident._id });
    } else {
        res.status(404).json({ message: "Incident not found" });
    }
});

module.exports = { addIncident, getAllIncidents, acknowledgeInc };