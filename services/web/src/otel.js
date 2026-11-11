import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { randomUUID } from 'node:crypto';

const serviceName = process.env.REACT_APP_SERVICE_NAME || 'web';

const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({
    'service.name': serviceName,
    'service.namespace': 'fintech-platform',
    'service.version': process.env.REACT_APP_SERVICE_VERSION || '1.0.0',
    'deployment.environment.name': process.env.NODE_ENV || 'development',
    'service.instance.id': randomUUID(),
  }),

  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: process.env.REACT_APP_OTLP_ENDPOINT,
      }),
    ),
  ],
});

provider.register({
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [],
});
