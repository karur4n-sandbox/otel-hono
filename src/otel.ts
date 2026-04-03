import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";
import {
  LoggerProvider,
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { metrics } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";

const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: "otel-hono-demo",
});

// --- Trace (自動計装あり) ---
const tracerProvider = new NodeTracerProvider({
  resource,
  spanProcessors: [
    new SimpleSpanProcessor(new ConsoleSpanExporter()),
    new BatchSpanProcessor(new OTLPTraceExporter({ url: `${OTLP_ENDPOINT}/v1/traces` })),
  ],
});
tracerProvider.register();

registerInstrumentations({
  tracerProvider,
  instrumentations: [new HttpInstrumentation()],
});

// --- Metrics ---
const meterProvider = new MeterProvider({
  resource,
  readers: [
    new PeriodicExportingMetricReader({
      exporter: new ConsoleMetricExporter(),
      exportIntervalMillis: 10000,
    }),
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${OTLP_ENDPOINT}/v1/metrics` }),
      exportIntervalMillis: 10000,
    }),
  ],
});
metrics.setGlobalMeterProvider(meterProvider);

// --- Logs ---
const loggerProvider = new LoggerProvider({
  resource,
  processors: [
    new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()),
    new BatchLogRecordProcessor(new OTLPLogExporter({ url: `${OTLP_ENDPOINT}/v1/logs` })),
  ],
});
logs.setGlobalLoggerProvider(loggerProvider);

export const meter = metrics.getMeter("otel-hono-demo");
export const logger = logs.getLogger("otel-hono-demo");

export function shutdown() {
  return Promise.all([
    tracerProvider.shutdown(),
    meterProvider.shutdown(),
    loggerProvider.shutdown(),
  ]);
}
