import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Host from "../models/Host.js";

export const authenticate = async (req, res, next) => {
  // Get token from headers
  const authToken = req.headers.authorization;
  // Check if token exists and starts with "Bearer"
  if (!authToken || !authToken.startsWith("Bearer")) {
    return res.status(401).json({ success: false, message: "No token, authorization denied" });
  }

  try {
    const token = authToken.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.userId = decoded.id;
    req.role = decoded.role;

    next(); // Must call the next function
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Toke is exnpired" });
    }
    return res.status(401).json({ success: false, message: "Invalid Token" });
  }
};

export const restrict = (roles) => async (req, res, next) => {
  const userId = req.userId;

  // FAILS CLOSED.
  //
  // This only ever looked in the User collection, and then let the request
  // through whenever it found nothing — `if (user && ...)` is false for a null
  // user, so the deny branch was skipped entirely. A Host token, an Admin token,
  // or a token for a deleted account all sailed past `restrict(['guest'])` and
  // `restrict(['host'])` alike: the check was decorative for every caller who
  // was not a guest.
  //
  // Hosts are a separate collection, so both are consulted, and a caller whose
  // account cannot be found is refused rather than admitted.
  const user =
    (await User.findById(userId).select("role")) ||
    (await Host.findById(userId).select("role"));

  if (!user) {
    return res.status(401).json({ success: false, message: "You're not authorized" });
  }

  const role = String(user.role || "").trim().toLowerCase();
  if (!roles.map((r) => String(r).toLowerCase()).includes(role)) {
    return res.status(403).json({ success: false, message: "You're not authorized" });
  }

  next();
};