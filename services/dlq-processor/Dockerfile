FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY libs/shared-libs ./libs/shared-libs

RUN npm install --omit=dev

COPY services/dlq-processor/src ./services/dlq-processor/src

ENV NODE_ENV=production
ENV PORT=3009

EXPOSE 3009

CMD ["node", "services/dlq-processor/src/index.js"]

