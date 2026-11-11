'use strict';

const { initTelemetry } = require('fintech-shared-libs');

module.exports = initTelemetry({ serviceName: 'payment-service' });
