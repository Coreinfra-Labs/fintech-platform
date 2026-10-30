FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the built app with a lightweight web server
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy build output from builder stage
COPY --from=builder /app/build .
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for serving
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
