# Build stage
FROM node:25-alpine AS builder

WORKDIR /build

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code (includes pre-generated API client in src/api/)
COPY . .

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:1.29-alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --from=builder /build/dist /usr/share/nginx/html

# Copy environment variable injection script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create conf.d directory and empty TLS config placeholder
RUN mkdir -p /etc/nginx/conf.d && echo "# placeholder" > /etc/nginx/conf.d/tls.conf

# Create certbot webroot for ACME challenges
RUN mkdir -p /var/www/certbot

# Create non-root user for nginx
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx || true

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Use custom entrypoint to inject env vars
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
