#!/bin/bash
# scripts/migrate.sh

echo "Running database migrations..."
npx prisma migrate deploy
echo "Generating Prisma client..."
npx prisma generate
echo "Database setup complete!"