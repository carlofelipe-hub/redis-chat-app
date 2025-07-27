FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy WebSocket server
COPY websocket-server.js ./

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S websocket -u 1001

# Switch to non-root user
USER websocket

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request('http://localhost:8080/health', res => process.exit(res.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1)); req.end();"

CMD ["node", "websocket-server.js"]