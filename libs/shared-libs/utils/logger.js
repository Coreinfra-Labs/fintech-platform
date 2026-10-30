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

const createLogger = (serviceName) => {
  return winston.createLogger({
    defaultMeta: { service: serviceName },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format((info) => {
        const traceFields = getTraceFields();
        return {
          ...info,
          ...traceFields,
        };
      })(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console()
    ],
  });
};

module.exports = { createLogger, getTraceFields };
