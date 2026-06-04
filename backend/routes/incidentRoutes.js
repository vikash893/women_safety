const express = require('express');
const router = express.Router();
const validateToken = require('../middlewares/validateToken');
const upload = require('../middlewares/upload');
const { addIncident, getAllIncidents, acknowledgeInc } = require('../controllers/incidentCntrl');

// All incident routes require authentication
router.route('/')
  .post(validateToken, upload.single('note'), addIncident)
  .get(validateToken, getAllIncidents);

router.route('/:id')
  .patch(validateToken, acknowledgeInc);

module.exports = router;