import { createMiddleware } from "hono/factory";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { routePath } from "hono/route";
import { tracer, meter, logger } from "../otel";

const requestDuration = meter.createHistogram("http.server.request.duration", {
  description: "Duration of HTTP server requests",
  unit: "s",
});

const activeRequests = meter.createUpDownCounter("http.server.active_requests", {
  description: "Number of active HTTP server requests",
});

export const telemetryMiddleware = createMiddleware(async (c, next) => {
  const method = c.req.method;
  const start = performance.now();
  let status = 500;
  let route = c.req.path;

  activeRequests.add(1, { "http.method": method });

  try {
    await tracer.startActiveSpan(`${method} ${route}`, async (span) => {
      span.setAttributes({
        "http.method": method,
        "http.url": c.req.url,
        "http.route": route,
      });

      logger.emit({
        severityNumber: SeverityNumber.INFO,
        severityText: "INFO",
        body: `Incoming request: ${method} ${route}`,
        context: context.active(),
        attributes: {
          "http.method": method,
          "http.route": route,
        },
      });

      try {
        await next();

        route = routePath(c);
        status = c.res.status;
        span.updateName(`${method} ${route}`);
        span.setAttribute("http.route", route);
        span.setAttribute("http.status_code", status);

        if (status >= 400) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${status}` });
        }

        logger.emit({
          severityNumber: status >= 400 ? SeverityNumber.ERROR : SeverityNumber.INFO,
          severityText: status >= 400 ? "ERROR" : "INFO",
          body: `Response: ${method} ${route} ${status}`,
          context: context.active(),
          attributes: {
            "http.method": method,
            "http.route": route,
            "http.status_code": status,
          },
        });
      } catch (err) {
        route = routePath(c);
        span.updateName(`${method} ${route}`);
        span.setAttribute("http.route", route);
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err as Error);

        logger.emit({
          severityNumber: SeverityNumber.ERROR,
          severityText: "ERROR",
          body: `Error: ${method} ${route} - ${err}`,
          context: context.active(),
          attributes: {
            "http.method": method,
            "http.route": route,
            "error.message": String(err),
          },
        });

        throw err;
      } finally {
        span.end();
      }
    });
  } finally {
    const duration = (performance.now() - start) / 1000;
    requestDuration.record(duration, {
      "http.method": method,
      "http.route": route,
      "http.status_code": status,
    });
    activeRequests.add(-1, { "http.method": method });
  }
});
