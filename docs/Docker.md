
# Use a supported Node.js LTS version
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy dependency files first for better Docker layer caching
COPY services/wallet-service/package.json ./
COPY services/wallet-service/package-lock.json ./

# Copy shared library if wallet-service depends on it
COPY libs/shared-libs ./libs/shared-libs

# Install exactly what's in the lockfile
RUN npm ci --omit=dev

# Copy application source
COPY services/wallet-service/src ./src

# Run as the non-root Node user
USER node

# Application port
EXPOSE 3002

# Container health check
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=10s \
            --retries=3 \
            CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the wallet service
CMD ["node", "src/index.js"]
=========
PROCESS
=========
1. Give me Linux + Node.js 22
             ↓
2. Work inside /app
             ↓
3. Copy wallet-service package.json
             ↓
4. Copy package-lock.json
             ↓
5. Copy the shared libraries
             ↓
6. Install the exact dependencies from package-lock.json
   and skip development dependencies
             ↓
7. Copy wallet-service source code
             ↓
8. Tell Docker the app uses port 3002
             ↓
9. Run the application as the non-root "node" user
             ↓
10. Every 30 seconds check /health
             ↓
11. If /health returns 200 → container is healthy
             ↓
12. If the health check fails 3 times → container becomes unhealthy
             ↓
13. Start node src/index.js
