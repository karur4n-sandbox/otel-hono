import "./otel";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { telemetryMiddleware } from "./middleware/telemetry";
import sampleRoutes from "./routes/sample";

const app = new Hono();

app.use("*", telemetryMiddleware);
app.route("/", sampleRoutes);

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
