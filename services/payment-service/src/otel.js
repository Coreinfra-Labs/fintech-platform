'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const serviceName = process.env.OTEL_SERVICE_NAME || 'payment-service';

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
});

const otlpMetricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_METRICS_ENDPOINT || 'http://otel-collector:4317',
});

const prometheusPort = Number(process.env.PROMETHEUS_METRICS_PORT || 9464);
const prometheusExporter = new PrometheusExporter({ startServer: true, port: prometheusPort }, () => {});
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  }),
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start().catch((err) => {
  console.error('Error starting OpenTelemetry SDK', err);
});

const api = require('@opentelemetry/api');

module.exports = {
  api,
  prometheusExporter,
  otlpMetricExporter,
};
