FROM node:20-alpine AS build

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
ENV PORT=3005

USER node

EXPOSE 3005

CMD ["node", "services/fraud-service/src/index.js"]
