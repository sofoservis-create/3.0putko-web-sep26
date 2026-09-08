import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getTransporter } from '../utils/mailer.js';
import {
  buildPasswordResetEmail,
  buildPasswordResetSuccessEmail,
} from "../utils/passwordResetEmail.js";
import {
  buildEmailVerificationEmail,
  buildEmailVerifiedEmail,
} from "../utils/emailVerificationEmail.js";
import Host from "../models/Host.js";
import LoginHistory from "../models/LoginHistory.js";

/**
 * Look an account up by email, case-insensitively, WITHOUT building a regular
 * expression out of it.
 *
 * `new RegExp(`^${email}$`, "i")` compiled attacker input as a pattern. `.*`
 * matched the first account in the collection; `(a+)+$` is catastrophic
 * backtracking evaluated against every document, which is a single-request
 * denial of service. Mongo's case-insensitive collation does the same job with
 * no pattern involved, and unlike a regex it can use the email index.
 */
const findByEmail = (Model, email) =>
  Model.findOne({ email: String(email || "").trim() }).collation({
    locale: "en",
    strength: 2,
  });

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
  });
};

export const register = async (req, res) => {
  const { email, password, name, lastName, role, photo, gender, language, lang } = req.body;

  // Translation messages
  const messages = {
    en: {
      userExists: "User already exists",
      serverError: "Internal server error",
      success: "User successfully created",
    },
    sk: {
      userExists: "Používateľ už existuje",
      serverError: "Interná chyba servera",
      success: "Používateľ bol úspešne vytvorený",
    },
  };

  // Determine language (default to English)
  const t = messages[lang] || messages.sk;

  try {
    let existingUser = null;

    // Check for existing user in the appropriate collection
    if (role === "guest") {
      existingUser = await User.findOne({ email });
    } else if (role === "host") {
      existingUser = await findByEmail(Host, email);
    }

    if (existingUser) {
      return res.status(400).json({ message: t.userExists });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    // Create a new user or host document based on the role
    let user;
    if (role === "guest") {
      user = new User({
        name,
        lastName,
        email,
        password: hashPassword,
        photo,
        language,
        gender,
        role,
      });
    } else if (role === "host") {
      user = new Host({
        name,
        lastName,
        email,
        password: hashPassword,
        photo,
        language,
        gender,
        role,
      });
    }

    await user.save();

    // Generate verification token
    const verificationToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    // Set up transporter for sending email
    const transporter = getTransporter();

    // Verification link
    const verificationLink = `${process.env.CLIENT_SITE_URL}/verify-email/${role}/${verificationToken}`;


    // Send verification email
    const { subject, html, text, attachments } = buildEmailVerificationEmail({
      name,
      verificationUrl: verificationLink,
      // Kept in step with the verificationToken expiry above ('1h').
      expiresInHours: 1,
    });

    await transporter.sendMail({
      from: '"Putko Support" <support@putko.sk>',
      to: email,
      subject,
      html,
      text,
      attachments,
    });

    res.status(201).json({ success: true, message: t.success });
  } catch (err) {
    res.status(500).json({ success: false, message: `${t.serverError}, ${err.message}`, });
  }
};

export const login = async (req, res) => {
  const { email, password, lang } = req.body; // Get language from request body

  // Define translations
  const messages = {
    en: {
      userNotFound: "User not found",
      verifyEmail: "Please verify your email first",
      invalidCredentials: "Invalid credentials",
      loginSuccess: "Successfully logged in",
      loginFailed: "Failed to login",
    },
    sk: {
      userNotFound: "Používateľ nebol nájdený",
      verifyEmail: "Najprv si overte svoj e-mail",
      invalidCredentials: "Neplatné poverenia",
      loginSuccess: "Úspešné prihlásenie",
      loginFailed: "Nepodarilo sa prihlásiť",
    },
  };

  // Determine language (default to English)
  const t = messages[lang] || messages.en;

  try {
    let user = null;

    const guest = await findByEmail(User, email);
    const host = await findByEmail(Host, email);

    // The whole Mongoose document used to be printed here — email, phone,
    // address, date of birth and the bcrypt password HASH — into Render's log
    // stream, where it is retained and readable by anyone with dashboard access.
    // Nothing about a login needs to be logged beyond whether it succeeded.
    if (guest) user = guest;
    if (host) user = host;

    // A missing account and a wrong password answer identically. Answering 404
    // for one and 400 for the other turns this endpoint into an oracle for
    // "does this person have a Putko account", which is worth money to whoever
    // is compiling the list.
    if (!user || !user.password) {
      return res.status(400).json({ status: false, message: t.invalidCredentials });
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ status: false, message: t.invalidCredentials });
    }

    // Ensure the user is verified. Checked AFTER the password, so an unverified
    // account is not disclosed to someone who cannot sign in as them anyway.
    if (!user.isVerified) {
      return res.status(400).json({ message: t.verifyEmail });
    }

    // Save login history separately.
    //
    // `host._id` was read unconditionally, so a GUEST login threw TypeError here
    // and was caught below as "Failed to login" — every guest sign-in failed
    // after a correct password.
    if (host) {
      await LoginHistory.create({
        hostId: host._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
    }

    // Generate authentication token
    const token = generateToken(user);

    // Remove password from response
    const { password: _, role, booking, ...rest } = user._doc;

    res.status(200).json({
      status: true,
      message: t.loginSuccess,
      token,
      data: { ...rest },
      role,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(400).json({ status: false, message: t.loginFailed });
  }
};

export const requestPasswordReset = async (req, res) => {
  const { email, role } = req.body;

  try {
    let user = null;

    const guest = await findByEmail(User, email);
    const host = await findByEmail(Host, email);

    if (guest) {
      user = guest;
    }
    if (host) {
      user = host;
    }

    // Always the same answer, whether or not the address is on file — a 404 here
    // told anyone who asked which email addresses have Putko accounts.
    if (!user) {
      return res.status(200).json({ message: 'Password reset link sent to your email' });
    }

    const resetToken = generateToken(user);
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;

    await user.save();

    const transporter = getTransporter();

    const resetUrl = `${process.env.CLIENT_SITE_URL}/reset-password/${resetToken}`;
    const { subject, html, text, attachments } = buildPasswordResetEmail({
      resetUrl,
      // Kept in step with resetPasswordExpires above (Date.now() + 3600000).
      expiresInHours: 1,
    });

    await transporter.sendMail({
      from: '"Putko Support" <support@putko.sk>',
      to: email,
      subject,
      html,
      text,
      attachments,
    });

    res.status(200).json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    res.status(500).json({ message: 'Error requesting password reset' });
  }
};

const sendResetSuccessEmail = async (userEmail) => {
  const transporter = getTransporter();
  const { subject, html, text, attachments } = buildPasswordResetSuccessEmail();

  await transporter.sendMail({
    from: '"Putko Support" <support@putko.sk>',
    to: userEmail,
    subject,
    html,
    text,
    attachments,
  });
};

export const resetPassword = async (req, res) => {
  const { token, newPassword, role } = req.body;

  try {
    
    const user = role === "guest"
      ? await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } })
      : await Host.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    await sendResetSuccessEmail(user.email);

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // The account is taken from the VERIFIED token, never from the body.
  // `userId` used to be read straight off the request with no authentication at
  // all, so anyone who knew an id — and every host id is published on their own
  // listings — could set that account's password and sign in as them.
  const callerId = req.auth?.id;
  if (!callerId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ message: "New password must be at least 8 characters" });
  }

  try {
    // Which collection the caller belongs to is decided by the token's kind,
    // not by a `role` string in the body that the caller chooses.
    const user =
      req.auth.kind === "host"
        ? await Host.findById(callerId)
        : await User.findById(callerId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Knowing the current password is what proves this is the account holder and
    // not a stolen or leaked token.
    if (!user.password || !(await bcrypt.compare(String(currentPassword || ""), user.password))) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error changing password" });
  }
};

export const verifyEmail = async (req, res) => {
  const { token, role } = req.params;

  try {
     // Verify the JWT token
     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

     // Retrieve user based on role
     const user = role === "guest"
       ? await User.findById(decoded.id)
       : await Host.findById(decoded.id);
 
     // Check if user exists
     if (!user) {
       const roleMessage = role === "guest" ? 'Guest' : 'Host';
       return res.status(400).json({ message: `${roleMessage} user not found. Invalid verification link.` });
     }
 
     // Check if user is already verified
     if (user.isVerified) {
       return res.status(400).json({ message: 'User already verified' });
     }
 
     // Mark user as verified
     user.isVerified = true;
     await user.save();

    const transporter = getTransporter();

    const { subject, html, text, attachments } = buildEmailVerifiedEmail({
      name: user.name,
    });

    // Send verification success email
    await transporter.sendMail({
      from: '"Putko Support" <support@putko.sk>',
      to: user.email,
      subject,
      html,
      text,
      attachments,
    });

    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.error(err); // Log the error for debugging
    // Handle specific JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token has expired' });
    }
    res.status(500).json({ message: 'Failed to verify email' });
  }
};
