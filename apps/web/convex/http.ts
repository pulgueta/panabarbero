import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { polar } from "./polar";
import { twilio } from "./twilio";

const http = httpRouter();

twilio.registerRoutes(http);
authComponent.registerRoutes(http, createAuth);
polar.registerRoutes(http);

export default http;
