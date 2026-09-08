import { sendEvent } from "../utils/FacebookCAPI.js";

export const handleFacebookEvent = async (req, res) => {
  try {
    const { eventName, eventData, userPayload, eventId } = req.body;
    
    // Get IP and User Agent from request
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';
    
    // Send to Facebook CAPI
    await sendEvent(eventName, eventData, {
      ...userPayload,
      clientIp: ip,
      clientUserAgent: userAgent,
      eventSourceUrl: req.headers['referer'] || ''
    }, eventId);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Facebook events error:', error);
    res.status(500).json({ error: 'Failed to send event' });
  }
};