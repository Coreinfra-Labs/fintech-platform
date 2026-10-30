const winston = require('winston');
const { trace, context } = require('@opentelemetry/api');

const createLogger = (serviceName) => {
  return winston.createLogger({
    defaultMeta: { service: serviceName },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format((info) => {
        const span = trace.getSpan(context.active());
        if (span) {
          const spanContext = span.spanContext();
          info.trace_id = spanContext.traceId;
          info.span_id = spanContext.spanId;
          info['trace.id'] = spanContext.traceId;
          info['span.id'] = spanContext.spanId;
        }
        return info;
      })(),
      winston.format.json()
    ),
    transports: [new winston.transports.Console()],
  });
};

module.exports = { createLogger };
