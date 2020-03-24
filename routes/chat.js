const express = require('express');

const router = express.Router();

const { chatPageContent } = require('../controller/chat');
const { checkTokenExpired } = require('../middleware/checkTokenExpired');

router.get('/', checkTokenExpired, chatPageContent);

module.exports = router;
