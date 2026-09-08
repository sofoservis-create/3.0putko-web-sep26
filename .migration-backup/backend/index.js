// MUST be first: ES module imports are evaluated before any statement in this
// file's body, so `dotenv.config()` further down would run only after every
// module below had already initialised — with an empty process.env.
import "./config/env.js";

import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import passport from './Controllers/passport.js';
import session from 'express-session';
import { Server } from "socket.io";
import http from 'http';
import authRoutes from './Routes/auth.js';
import adminRoutes from './Routes/adminRoutes.js';
import userRoutes from "./Routes/user.js";
import HostRoutes from './Routes/hostRoutes.js';
import accommodationRoutes from './Routes/AccommodationRoutes.js';
import messageRoutes from './Routes/message.js';
import Message from './models/messageModel.js';
import reviewRoutes from './Routes/ReviewRoutes.js';
import EmailRoutes from './Routes/EmailRoutes.js';
import ReservationRoutes from './Routes/ReservationRoutes.js';
import FavoriteRoutes from './Routes/FavoriteRoutes.js'
import bodyParser from 'body-parser';
import CalendarRoutes from './Routes/CalendarRoutes.js'
import ChatRoutes from "./Routes/ChatRoutes.js";
import './utils/cleanupJob.js';
import { importHostsFromExcel } from "./utils/importHost.js";
import cron from "node-cron";
import './utils/reviewJob.js'
import uploadRoutes from "./Routes/uploadRoutes.js"
import { syncBookings } from "./Controllers/AccommodationController.js";
import { expireStaleBookingRequests } from "./Controllers/ReservationController.js";
import { backfillListingStatuses } from "./utils/hostStripeSync.js";
import LoginHistory from "./Routes/LoginHistory.js"
import compression from "compression";
import BlogRoutes from "./Routes/BlogRoutes.js"
import BlogCommentRoutes from "./Routes/BlogCommentRoutes.js"
// import { startReviewJob } from "./utils/reviewJob.js";
import paymentRoutes from "./Routes/paymentRoutes.js"
import { handleStripeWebhook } from "./Controllers/PaymentController.js";
import facebookEventsRoutes from "./Routes/facebookEventsRoutes.js"
import { connectRedis } from "./utils/redis.js";
import cancellationRoutes from "./Routes/cancellationRoutes.js";
import receiptRoutes from "./Routes/receiptRoutes.js";
import dac7Routes from "./Routes/dac7Routes.js";
import { startPayoutJob } from "./utils/payoutJob.js";
import { startInvoiceJob } from "./utils/invoiceJob.js";
import { sweepExpiredHolds } from "./utils/calendarHold.js";
import invoiceRoutes from "./Routes/invoiceRoutes.js";
import icoRoutes from "./Routes/icoRoutes.js";

dotenv.config();

const app = express();
const Port = process.env.Port || 8000;

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

app.use(bodyParser.json({ limit: '10mb' })); // Adjust the limit as necessary
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// ✅ Enable GZIP compression before routes
app.use(compression());

// CORS Options
const corsOptions = {
  // origin: "https://putko-main.vercel.app", // Frontend origin
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Create the HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
const io = new Server(server, {
  cors: {
    origin: "https://www.putko.sk",
    credentials: true,
  },
});

// Session and passport configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {});
    console.log("MongoDB is connected");

    // Give listings written before `listingStatus` existed a real value. Only
    // touches listings that have none, so this is a no-op on every boot after
    // the first. Not awaited into the request path — a slow backfill must not
    // delay the server accepting traffic.
    backfillListingStatuses();
  } catch (err) {
    console.log("MongoDB connection failed", err.message);
  }
};

cron.schedule("*/1 * * * *", async () => {
  console.log("🔄 Running scheduled host import...");
  await importHostsFromExcel("uploads/latest_hosts.xlsx");
});

cron.schedule("0 */3 * * *", () => {
  console.log(`[${new Date().toISOString()}] Running booking sync...`);
  syncBookings();
});

// Clear out checkout holds whose guest never came back. Holds already expire
// logically the moment holdExpiresAt passes, so this is housekeeping to stop
// the calendar accumulating dead rows.
cron.schedule("*/15 * * * *", async () => {
  try {
    await sweepExpiredHolds();
  } catch (err) {
    console.error("[calendar-hold] sweep failed:", err.message);
  }
});

// Close out booking requests the host never answered. Hourly is fine: the
// window is 48 hours, so an hour of slack is invisible to the guest, and this
// touches every open request each pass.
cron.schedule("0 * * * *", async () => {
  try {
    await expireStaleBookingRequests();
  } catch (err) {
    console.error("[request-to-book] expiry sweep failed:", err.message);
  }
});

//  startReviewJob();

// Test route to check if the API is working
app.get('/', (req, res) => {
  res.json({ message: "API is working" });
});

app.set('trust proxy', true);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hosts', HostRoutes);
app.use('/api', icoRoutes);
app.use('/api', accommodationRoutes);
app.use('/api', messageRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/subscribe", EmailRoutes);
app.use("/api/reservation", ReservationRoutes);
app.use("/api/favorite", FavoriteRoutes);
app.use("/api/blog", BlogRoutes);
app.use("/api/blog-comments", BlogCommentRoutes);
app.use("/api", CalendarRoutes); 
app.use("/api", ChatRoutes);
app.use("/api", uploadRoutes);
app.use("/api", LoginHistory);
app.use('/api/payments', paymentRoutes);
app.use('/api', facebookEventsRoutes);
app.use('/api', cancellationRoutes);
app.use('/api', receiptRoutes);
app.use('/api', dac7Routes);
app.use('/api', invoiceRoutes);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('send_message', async (msg) => {
    try {
      const newMessage = new Message({
        message: msg.message,
        sender: msg.sender,
        reciver: msg.reciver,
        users: msg.users,
      });
      
      // Save the message to the database
      // await newMessage.save();

      // Emit the message to all clients
      io.emit('receive_message', newMessage);

      // Log the sender and receiver IDs for notification
      console.log(`Notification: User ID: ${msg.sender}, Host ID: ${msg.reciver}`);

      // Emit a notification event
      io.to(socket.id).emit('notification', {
        message: 'New message received',
        sender: msg.sender,
        reciver: msg.reciver,
      });

    } catch (error) {
      console.error('Error saving message to database:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// ✅ Start server **after Redis and MongoDB are connected**
const startServer = async () => {
  try {
    await connectRedis();
    console.log("Redis connected 🔐");

    await connectDB();

    // Daily host payout sweep. Registered after the DB connection so the first
    // run cannot fire against an unconnected mongoose.
    startPayoutJob();
    startInvoiceJob();

    server.listen(Port, () => {
      console.log("Server is running on port " + Port);
    });

  } catch (err) {
    console.error("Startup error:", err);
  }
};

startServer();
