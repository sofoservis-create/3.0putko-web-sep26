import bizSdk from "facebook-nodejs-business-sdk";
import crypto from 'crypto';

const Content = bizSdk.Content;
const CustomData = bizSdk.CustomData;
const DeliveryCategory = bizSdk.DeliveryCategory;
const EventRequest = bizSdk.EventRequest;
const UserData = bizSdk.UserData;
const ServerEvent = bizSdk.ServerEvent;

let api = null;
let showDebug = process.env.SimpleNodeLogger_LogLevel === "debug";

const initApi = () => {
    const access_token = process.env.FB_ACCESS_TOKEN;
    if (access_token && !api) {
        try {
            api = bizSdk.FacebookAdsApi.init(access_token);
        } catch (e) {
            console.error("Failed to init FacebookAdsApi:", e);
        }
    }
    return api;
};

// Hash function for PII
const hashValue = (value) => {
    if (!value) return null;
    return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
};

export const sendEvent = async (eventName, eventData, userPayload, eventId = null) => {
  const pixel_id = process.env.FB_PIXEL_ID;
  const access_token = process.env.FB_ACCESS_TOKEN;

  if (!api && access_token) {
      initApi();
  }

  if (!pixel_id || !access_token) {
    console.warn("Facebook CAPI: Missing FB_PIXEL_ID or FB_ACCESS_TOKEN in env");
    return;
  }

  try {
    const current_timestamp = Math.floor(new Date() / 1000);

    const userData = new UserData();
    
    // Hash email and phone
    if (userPayload.email) {
      userData.setEmail(hashValue(userPayload.email));
    }
    
    if (userPayload.phone) {
      const cleanPhone = userPayload.phone.replace(/\D/g, '');
      userData.setPhone(hashValue(cleanPhone));
    }
    
    if (userPayload.clientIp) {
      userData.setClientIpAddress(userPayload.clientIp);
    }
    
    if (userPayload.clientUserAgent) {
      userData.setClientUserAgent(userPayload.clientUserAgent);
    }

    if (userPayload.fbp) {
      userData.setFbp(userPayload.fbp);
    }
    
    if (userPayload.fbc) {
      userData.setFbc(userPayload.fbc);
    }

    const content = new Content()
      .setId(eventData.contentId || eventData.productId || "product_123")
      .setQuantity(eventData.quantity || 1)
      .setDeliveryCategory(DeliveryCategory.HOME_DELIVERY);

    const customData = new CustomData()
      .setContents([content])
      .setCurrency(eventData.currency || "EUR")
      .setValue(eventData.value || 0.0);

    if (eventData.contentName) {
      customData.setContentName(eventData.contentName);
    }

    // Add event-specific parameters
    if (eventName === 'Lead' || eventName === 'InitiateCheckout' || eventName === 'Search' || eventName === 'ViewContent') {
      const customProps = {};
      if (eventData.checkin_date) customProps.checkin_date = eventData.checkin_date;
      if (eventData.checkout_date) customProps.checkout_date = eventData.checkout_date;
      if (eventData.num_items) customProps.num_guests = eventData.num_items;
      if (eventData.city) customProps.city = eventData.city;
      if (eventData.num_adults) customProps.num_adults = eventData.num_adults;
      if (eventData.num_children) customProps.num_children = eventData.num_children;
      if (eventData.search_string) customProps.search_string = eventData.search_string;
      
      customData.setCustomProperties(customProps);
    }
 
    const serverEvent = new ServerEvent()
      .setEventName(eventName)
      .setEventTime(current_timestamp)
      .setUserData(userData)
      .setCustomData(customData)
      .setEventSourceUrl(userPayload.eventSourceUrl || '')
      .setActionSource("website");

    // Set eventId for deduplication
    if (eventId) {
      serverEvent.setEventId(eventId);
    }

    const eventsData = [serverEvent];
    const eventRequest = new EventRequest(access_token, pixel_id).setEvents(eventsData);

    const response = await eventRequest.execute();

    if (showDebug) {
      console.log(`Facebook CAPI ${eventName} response:`, response);
    }

    return response;
  } catch (error) {
    console.error(`Facebook CAPI Error (${eventName}):`, error);
    return null;
  }
};