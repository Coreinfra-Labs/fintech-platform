const os = require('os');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const api = require('@opentelemetry/api');

const getServiceName = (defaultName) => process.env.OTEL_SERVICE_NAME || defaultName;

const getResourceAttributes = (serviceName) => ({
  'service.name': getServiceName(serviceName),
  'service.namespace': 'fintech-platform',
  'service.version': process.env.OTEL_SERVICE_VERSION || process.env.npm_package_version || '1.0.0',
  'deployment.environment.name': process.env.DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV || 'development',
  'service.instance.id': process.env.OTEL_SERVICE_INSTANCE_ID || process.env.HOSTNAME || os.hostname(),
  'host.name': process.env.HOSTNAME || os.hostname(),
});

const initTelemetry = ({ serviceName, metricsPort = 9464 } = {}) => {
  const resolvedServiceName = getServiceName(serviceName || 'fintech-service');
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4317',
    headers: {
      'x-otel-service-name': resolvedServiceName,
    },
  });

  const prometheusExporter = new PrometheusExporter(
    {
      startServer: true,
      host: '0.0.0.0',
      port: Number(process.env.PROMETHEUS_METRICS_PORT || metricsPort),
    },
    () => {
      console.log(`Prometheus metrics server started on port ${Number(process.env.PROMETHEUS_METRICS_PORT || metricsPort)}`);
    }
  );

  const sdk = new NodeSDK({
    resource: resourceFromAttributes(getResourceAttributes(resolvedServiceName)),
    traceExporter,
    metricReaders: [prometheusExporter],
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    sdk.start();
    console.log(`OpenTelemetry SDK started for ${resolvedServiceName}`);
  } catch (err) {
    console.error(`Error starting OpenTelemetry SDK for ${resolvedServiceName}:`, err);
    throw err;
  }

  return {
    api,
    prometheusExporter,
    shutdown: () => sdk.shutdown(),
    sdk,
  };
};

module.exports = {
  api,
  initTelemetry,
  getServiceName,
  getResourceAttributes,
};
