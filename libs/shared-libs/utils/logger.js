const winston = require('winston');
const { trace, context } = require('@opentelemetry/api');

const getTraceFields = () => {
  try {
    const span = trace.getSpan(context.active());
    if (!span) {
      return {};
    }
    const sc = span.context();
    return {
      trace_id: sc.traceId,
      span_id: sc.spanId,
    };
  } catch (error) {
    return {};
  }
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
