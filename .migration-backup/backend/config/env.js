// config/env.js
//
// Loads the environment before anything else can read it.
//
// ES module imports are hoisted and evaluated BEFORE any statement in the
// importing module's body, so a `dotenv.config()` sitting in index.js runs
// after every imported module has already initialised. Any module that reads
// process.env at import time — or caches something built from it, as the mail
// transporter does — therefore saw an empty environment.
//
// Importing this module first, before any application import, is what makes the
// ordering correct. Keep it as the first line of index.js.
import dotenv from "dotenv";

dotenv.config();

export default process.env;
