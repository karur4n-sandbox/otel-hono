import { createMiddleware } from "hono/factory";
import { SpanStatusCode } from "@opentelemetry/api";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { tracer, meter, logger } from "../otel";

const requestDuration = meter.createHistogram("http.server.request.duration", {
  description: "Duration of HTTP server requests",
  unit: "ms",
});

const activeRequests = meter.createUpDownCounter("http.server.active_requests", {
  description: "Number of active HTTP server requests",
});

export const telemetryMiddleware = createMiddleware(async (c, next) => {
  const method = c.req.method;
  const path = c.req.path;
  const start = performance.now();

  activeRequests.add(1, { "http.method": method });

  return tracer.startActiveSpan(`${method} ${path}`, async (span) => {
    span.setAttributes({
      "http.method": method,
      "http.url": c.req.url,
      "http.route": path,
    });

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: "INFO",
      body: `Incoming request: ${method} ${path}`,
      attributes: {
        "http.method": method,
        "http.route": path,
      },
    });

    try {
      await next();

      const status = c.res.status;
      span.setAttribute("http.status_code", status);

      if (status >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${status}` });
      }

      logger.emit({
        severityNumber: status >= 400 ? SeverityNumber.ERROR : SeverityNumber.INFO,
        severityText: status >= 400 ? "ERROR" : "INFO",
        body: `Response: ${method} ${path} ${status}`,
        attributes: {
          "http.method": method,
          "http.route": path,
          "http.status_code": status,
        },
      });
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      span.recordException(err as Error);

      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: "ERROR",
        body: `Error: ${method} ${path} - ${err}`,
        attributes: {
          "http.method": method,
          "http.route": path,
          "error.message": String(err),
        },
      });

      throw err;
    } finally {
      const duration = performance.now() - start;
      requestDuration.record(duration, {
        "http.method": method,
        "http.route": path,
        "http.status_code": c.res.status,
      });
      activeRequests.add(-1, { "http.method": method });
      span.end();
    }
  });
});
