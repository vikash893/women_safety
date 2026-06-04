const express = require("express");
const router = express.Router();
const { addChats, getChats } = require('../controllers/chatCntrl');
const validateToken = require('../middlewares/validateToken');

// All chat routes require authentication
router.route('/').post(validateToken, addChats);
router.route('/:id/emergncye/:emerg').get(validateToken, getChats);

module.exports = router;