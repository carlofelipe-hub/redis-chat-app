FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy WebSocket server and required libs
COPY websocket-server.js ./
COPY lib/ ./lib/

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "websocket-server.js"]