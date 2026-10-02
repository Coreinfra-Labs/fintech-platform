require('dotenv').config();
require('./otel');
const express = require('express');
const cors = require('cors');
const { createLogger } = require('./utils/logger');
const transferRoutes = require('./routes/transfer');
const accountRoutes = require('./routes/account');

const app = express();
const logger = createLogger('NIBSS-Mock');

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'nibss-mock' });
});

app.use('/api/transfer', transferRoutes);
app.use('/api/validate-account', accountRoutes);

const PORT = process.env.PORT || 3007;

app.listen(PORT, () => {
  logger.info(`NIBSS Mock Service running on port ${PORT}`);
});

module.exports = app;
