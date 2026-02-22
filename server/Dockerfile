# ─── Production Dockerfile for Kagzso Backend ─────────────────────────────
# Uses node alpine for minimal image size and security
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

# Create logs directory
RUN mkdir -p logs && chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose API port
EXPOSE 5000

# Health check for orchestration (Kubernetes/Docker Swarm)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --mirror http://localhost:5000/health || exit 1

# Start with PM2 for process management and clustering
# Note: npm install -g pm2 is not needed if you run with node
CMD ["node", "server.js"]
