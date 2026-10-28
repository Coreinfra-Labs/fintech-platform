FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY libs/shared-libs ./libs/shared-libs
RUN npm install --omit=dev

COPY services/ledger-service/src ./services/ledger-service/src
COPY services/ledger-service/db ./services/ledger-service/db

ENV NODE_ENV=production
ENV PORT=3008

EXPOSE 3008

CMD ["node", "services/ledger-service/src/index.js"]


