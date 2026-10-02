
# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /build

# Dependencies
COPY services/wallet-service/package*.json ./
RUN npm ci

# Source
COPY services/wallet-service/src ./src
COPY libs/shared-libs ./libs/shared-libs

# Bundle → single production artifact
RUN npx esbuild src/index.js \
    --bundle \
    --platform=node \
    --target=node22 \
    --outfile=dist/wallet-service.js


# ─────────────────────────────────────────────
# Runtime
# ─────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Single application artifact
COPY --from=build /build/dist/wallet-service.js .

# Security: never run as root
USER node

EXPOSE 3002

# Health
HEALTHCHECK \
    --interval=30s \
    --timeout=10s \
    --start-period=10s \
    --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Start
CMD ["node", "wallet-service.js"]

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
