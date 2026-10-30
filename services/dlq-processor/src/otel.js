'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { resourceFromAttributes } = require('@opentelemetry/resources');

const serviceName = process.env.OTEL_SERVICE_NAME || 'dlq-processor';

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
});

const prometheusPort = Number(process.env.PROMETHEUS_METRICS_PORT || 9464);

const prometheusExporter = new PrometheusExporter(
  { startServer: true, host: '0.0.0.0', port: prometheusPort },
  () => {
    console.log(`Prometheus metrics server started on port ${prometheusPort}`);
  }
);

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    'service.name': serviceName,
    'service.namespace': 'fintech-platform',
    'deployment.environment.name': process.env.NODE_ENV || 'development',
  }),
  traceExporter,
  metricReaders: [prometheusExporter],
  instrumentations: [getNodeAutoInstrumentations()],
});

try {
  sdk.start();
} catch (err) {
  console.error('Error starting OpenTelemetry SDK', err);
  throw err;
}

const api = require('@opentelemetry/api');

module.exports = {
  api,
  prometheusExporter,
  shutdown: () => sdk.shutdown(),
};
