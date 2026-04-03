import "./otel";
import { Hono } from "hono";
// Bun.serve() は AsyncLocalStorage のコンテキスト伝搬が壊れるため、
// OTel のトレース親子関係が正しく動かない。node-server 経由で回避。
import { serve } from "@hono/node-server";
import { telemetryMiddleware } from "./middleware/telemetry";
import sampleRoutes from "./routes/sample";

const app = new Hono();

app.use("*", telemetryMiddleware);
app.route("/", sampleRoutes);

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
