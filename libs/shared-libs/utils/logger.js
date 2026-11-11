const os = require('os');
const winston = require('winston');
const { trace, context } = require('@opentelemetry/api');

const getTraceFields = () => {
  const span = trace.getSpan(context.active());
  if (!span) {
    return {};
  }

  const sc = span.spanContext();
  return {
    trace_id: sc.traceId,
    span_id: sc.spanId,
    'trace.id': sc.traceId,
    'span.id': sc.spanId,
  };
};

const getServiceMeta = (serviceName) => ({
  'service.name': serviceName,
  'service.version': process.env.OTEL_SERVICE_VERSION || process.env.npm_package_version || '1.0.0',
  'deployment.environment.name': process.env.DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV || 'development',
  'service.instance.id': process.env.OTEL_SERVICE_INSTANCE_ID || process.env.HOSTNAME || os.hostname(),
  'service.namespace': 'fintech-platform',
});

const createLogger = (serviceName) => {
  return winston.createLogger({
    defaultMeta: {
      service: serviceName,
      ...getServiceMeta(serviceName),
    },
    format: winston.format.combine(
      winston.format.timestamp({ format: 'iso' }),
      winston.format((info) => {
        const traceFields = getTraceFields();
        return {
          ...info,
          ...traceFields,
          ...getServiceMeta(serviceName),
        };
      })(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [new winston.transports.Console()],
  });
};

module.exports = { createLogger, getTraceFields, getServiceMeta };
