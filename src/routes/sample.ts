import { Hono } from "hono";
import { tracer } from "../otel";

const app = new Hono();

app.get("/hello", (c) => {
  return c.json({ message: "Hello, OTel!" });
});

app.get("/slow", async (c) => {
  const delay = 1000 + Math.random() * 1000; // 1-2 秒
  await tracer.startActiveSpan("slow-operation", async (span) => {
    span.setAttribute("delay_ms", delay);
    await new Promise((resolve) => setTimeout(resolve, delay));
    span.end();
  });
  return c.json({ message: "Done", delay_ms: Math.round(delay) });
});

app.get("/error", () => {
  throw new Error("Intentional error for testing");
});

export default app;
