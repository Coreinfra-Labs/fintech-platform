import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { resourceFromAttributes } from '@opentelemetry/resources';

const serviceName = process.env.REACT_APP_SERVICE_NAME || 'web';

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({
    'service.name': serviceName,
    'service.namespace': 'fintech-platform',
    'service.version': process.env.REACT_APP_SERVICE_VERSION || '1.0.0',
    'deployment.environment.name': process.env.NODE_ENV || 'development',
    'service.instance.id': `${serviceName}-${Math.random().toString(16).slice(2)}`,
  }),
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: process.env.REACT_APP_OTEL_ENDPOINT || `${window.location.origin}/otel/v1/traces`,
      })
    ),
  ],
});

provider.register({
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [new FetchInstrumentation()],
});
