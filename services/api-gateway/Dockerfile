
FROM node:20-alpine AS build

LABEL maintainer="qzee-dev"

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY libs ./libs
COPY services ./services

RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable

COPY --from=build --chown=node:node /app /app

ENV NODE_ENV=production

USER node

EXPOSE 3000

CMD ["node", "services/api-gateway/src/index.js"]
