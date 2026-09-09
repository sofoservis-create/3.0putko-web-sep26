import express from 'express';
import passport from '../Controllers/passport.js';
import { register, login, requestPasswordReset, resetPassword, verifyEmail, changePassword } from '../Controllers/authController.js';

const router = express.Router();

// Existing routes for email/password authentication
router.post('/register', register);
router.post('/login', login);
router.post('/password-reset-request', requestPasswordReset); // New route
router.post('/reset-password', resetPassword); // New route
router.get('/verify-email/:role/:token', verifyEmail);
router.post("/change-password", changePassword);

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', passport.authenticate('google'), (req, res) => {
  // Successful authentication
  res.redirect('https://www.putko.sk/Profile'); // Redirect to your profile page or wherever you want
});

// Logout route
router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

export default router;
