import express from 'express';
import { addMessage, fetchReceiversBySender, getMessages ,getMessagesBySecondUser,getReceiversBySenderId,getSendersByReceiverId,handler} from '../Controllers/messageController.js';

import { requireAdmin, requireAuth } from "../auth/authorize.js";

const router = express.Router(); // This should be correctly defined here

router.post("/addmsg", requireAuth, addMessage);
router.get("/getmsg", requireAuth, getMessages);
router.get("/getid", requireAuth, getMessagesBySecondUser)
// router.get("/receivers/:senderId" ,fetchReceiversBySender)

// POST /api/send used to accept a recipient, a subject and a raw HTML body from
// anyone on the internet and send it as "Putko Support <support@putko.sk>" —
// through Putko's own SMTP, so SPF and DKIM pass and the mail lands in the inbox
// looking authentic. That is a phishing kit with Putko's reputation attached,
// and it burns the sending domain when it is abused.
//
// Restricted to admins. If a legitimate caller needs it, give it its own
// service credential and a fixed template — not an open passthrough.
router.post("/send", requireAdmin, handler)
router.get('/receivers/:senderId', requireAuth, getReceiversBySenderId);
router.get('/senders/:receiverId', requireAuth, getSendersByReceiverId);

export default router;
