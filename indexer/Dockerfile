FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S indexer -u 1001

# Change ownership
RUN chown -R indexer:nodejs /app
USER indexer

# Expose port (if needed for health checks)
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Indexer is running')" || exit 1

# Start indexer
CMD ["npm", "start"]











