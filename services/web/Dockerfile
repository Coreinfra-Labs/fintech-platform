FROM node:22-alpine AS builder
WORKDIR /app

COPY . .
RUN corepack enable
RUN pnpm install --frozen-lockfile --filter web...

WORKDIR /app/services/web
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm run build

# Stage 2: Serve the built app with a lightweight web server
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy build output from builder stage
COPY --from=builder /app/services/web/build .
COPY services/web/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for serving
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
