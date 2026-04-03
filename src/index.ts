import "./otel";
import { Hono } from "hono";
import { telemetryMiddleware } from "./middleware/telemetry";
import sampleRoutes from "./routes/sample";

const app = new Hono();

app.use("*", telemetryMiddleware);
app.route("/", sampleRoutes);

export default {
  port: 3000,
  fetch: app.fetch,
};

console.log("Server running on http://localhost:3000");
