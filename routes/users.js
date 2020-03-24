const express = require('express');

const router = express.Router();
const {
  userSignin,
  signupUser,
  getUserProfile,
  updateAvatar,
  updateUserSelectNamespace,
} = require('../controller/users');
const { checkExistedUser } = require('../middleware/checkExistedUser');
const { checkTokenExpired } = require('../middleware/checkTokenExpired');

router.post('/signin', userSignin);

router.post('/signup', checkExistedUser, signupUser);

router.get('/profile', checkTokenExpired, getUserProfile);

router.put('/userAvatar', updateAvatar);

router.put('/selectedNamespace', updateUserSelectNamespace);

module.exports = router;
