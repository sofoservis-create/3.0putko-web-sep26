import express from 'express';
import { addMessage, fetchReceiversBySender, getMessages ,getMessagesBySecondUser,getReceiversBySenderId,getSendersByReceiverId,handler} from '../Controllers/messageController.js';

const router = express.Router(); // This should be correctly defined here

router.post("/addmsg", addMessage);
router.get("/getmsg", getMessages);
router.get("/getid" ,getMessagesBySecondUser)
// router.get("/receivers/:senderId" ,fetchReceiversBySender)

router.post("/send",handler)
router.get('/receivers/:senderId', getReceiversBySenderId);
router.get('/senders/:receiverId', getSendersByReceiverId);

export default router;
