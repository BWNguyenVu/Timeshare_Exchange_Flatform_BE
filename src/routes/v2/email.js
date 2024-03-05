const express = require('express');
const router = express.Router();
const CheckAuth = require('../../middlewares/auth');
const emailController = require('../../controllers/v2/email.controller');


router.get('/send-verification-email', CheckAuth, emailController.SendVerificationCode);
router.get('/verify-email', emailController.VerifyEmailVerification);
router.post('/request-password-reset', emailController.SendPasswordRecoveryEmail);
router.post('/reset-password', emailController.VerifyPasswordReset);


module.exports = router;