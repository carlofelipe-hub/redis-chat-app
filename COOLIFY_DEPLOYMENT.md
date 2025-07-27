# Coolify Deployment Guide for Redis Chat App

## Prerequisites

1. **Coolify Instance Running** on your VPS
2. **Domain Name** configured and pointing to your VPS
3. **SSH Access** to your VPS
4. **Git Repository** (GitHub/GitLab) with your code

## Step 1: Set Up Database Services in Coolify

### PostgreSQL Database

1. Go to your Coolify dashboard
2. Create a new **PostgreSQL** service:
   - Name: `redis-chat-postgres`
   - Database name: `chatdb`
   - Username: `postgres`
   - Password: Generate a strong password
   - Port: `5432` (internal)

3. Note the internal connection details:
   ```
   Host: redis-chat-postgres
   Port: 5432
   Database: chatdb
   Username: postgres
   Password: [your-generated-password]
   ```

### Redis Database

1. Create a new **Redis** service:
   - Name: `redis-chat-redis`
   - Password: Generate a strong password
   - Port: `6379` (internal)

2. Note the internal connection details:
   ```
   Host: redis-chat-redis
   Port: 6379
   Password: [your-generated-password]
   ```

## Step 2: Create Application in Coolify

1. **Create New Application**:
   - Source: Git Repository
   - Repository: Your GitHub/GitLab repo URL
   - Branch: `main`
   - Build Pack: `Dockerfile`

2. **Configure Build Settings**:
   - Root Directory: `/` (if app is in root)
   - Dockerfile: `Dockerfile`
   - Build Command: (leave empty - handled by Dockerfile)

## Step 3: Environment Variables

Add these environment variables in Coolify:

### Database Configuration
```env
# PostgreSQL (use Coolify internal service names)
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@redis-chat-postgres:5432/chatdb?schema=public
DIRECT_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@redis-chat-postgres:5432/chatdb?schema=public

# Redis
REDIS_URL=redis://default:YOUR_REDIS_PASSWORD@redis-chat-redis:6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
```

### Application Configuration
```env
# Next.js
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secret-key-here

# WebSocket Server (if running separately)
WEBSOCKET_URL=wss://your-websocket-domain.com
```

## Step 4: Update Next.js Configuration

Update your `next.config.ts` for standalone build:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
};

export default nextConfig;
```

## Step 5: Database Migration Script

Create a migration script for production deployment:

```bash
#!/bin/bash
# scripts/migrate.sh

echo "Running database migrations..."
npx prisma migrate deploy
echo "Generating Prisma client..."
npx prisma generate
echo "Database setup complete!"
```

## Step 6: Deployment Process

### 1. Push Code to Repository
```bash
git add .
git commit -m "Add Coolify deployment configuration"
git push origin main
```

### 2. Configure Domain in Coolify
1. Go to your application settings
2. Add your domain (e.g., `chat.yourdomain.com`)
3. Enable SSL (Let's Encrypt)
4. Set up automatic deployment on git push

### 3. Build and Deploy
1. Coolify will automatically detect the Dockerfile
2. It will build the image using the multi-stage Docker build
3. Run database migrations during first deployment

## Step 7: Post-Deployment Setup

### Database Initialization
After first deployment, run migrations:

```bash
# SSH into your Coolify container or run via Coolify terminal
npx prisma migrate deploy
```

### Verify Services
Check that all services are running:
- ✅ PostgreSQL database
- ✅ Redis instance  
- ✅ Next.js application
- ✅ Domain with SSL

## Step 8: WebSocket Server (Optional)

If you want to run the WebSocket server separately:

### Create WebSocket Dockerfile
```dockerfile
# websocket.Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY websocket-server.js ./
COPY lib/ ./lib/

EXPOSE 8080

CMD ["node", "websocket-server.js"]
```

### Deploy as Separate Service
1. Create another application in Coolify
2. Use `websocket.Dockerfile` 
3. Set port to `8080`
4. Add same environment variables

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify internal service names match
   - Check password correctness
   - Ensure services are running

2. **Build Failures**
   - Check Dockerfile syntax
   - Verify all dependencies in package.json
   - Review build logs in Coolify

3. **Prisma Issues**
   - Ensure DATABASE_URL is correct
   - Run migrations manually if needed
   - Check Prisma schema validity

### Monitoring

1. **Application Logs**
   - View in Coolify dashboard
   - Monitor for errors and performance

2. **Database Monitoring**
   - Use Coolify's database metrics
   - Monitor connection counts
   - Check storage usage

3. **Redis Monitoring**
   - Monitor memory usage
   - Check connection counts
   - Monitor key patterns

## Performance Optimization

### For Production

1. **Enable Redis Persistence**
   ```
   # In Redis service configuration
   REDIS_PERSISTENCE=yes
   ```

2. **PostgreSQL Tuning**
   ```
   # Increase connection limits if needed
   max_connections=200
   shared_buffers=256MB
   ```

3. **Next.js Optimization**
   - Images are automatically optimized
   - Static assets are cached
   - API routes are optimized

## Security Considerations

1. **Environment Variables**
   - Use strong passwords
   - Never commit secrets to git
   - Rotate secrets regularly

2. **Network Security**
   - Services communicate via internal network
   - Only expose necessary ports
   - Use HTTPS for all external traffic

3. **Database Security**
   - Regular backups
   - Monitor for unusual activity
   - Keep services updated

## Backup Strategy

### Database Backups
Coolify provides automated backups for PostgreSQL:
1. Enable automatic backups
2. Set retention period
3. Test restore procedures

### Application Backups
- Git repository serves as source backup
- Container images stored in registry
- Configuration backed up in Coolify

## Scaling

### Horizontal Scaling
- Multiple application instances
- Load balancer configuration
- Session management with Redis

### Vertical Scaling
- Increase CPU/Memory in Coolify
- Monitor resource usage
- Scale databases as needed