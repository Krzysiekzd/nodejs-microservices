#!/bin/bash

cd "$(dirname "$0")"

mkdir -p logs
touch logs/product-service.log logs/product-event-listener.log logs/order-service.log logs/user-service.log logs/inventory-service.log logs/api-gateway.log logs/notification-service.log

echo "Starting Docker containers..."
docker-compose up -d

# Start all Node/NestJS services in the background and log output
echo "Starting product-service..."
(cd product-service && npm run start > ../logs/product-service.log 2>&1 &)

echo "Starting product-event-listener..."
(cd product-event-listener && node index.js > ../logs/product-event-listener.log 2>&1 &)

echo "Starting order-service..."
(cd order-service && npm run start > ../logs/order-service.log 2>&1 &)

echo "Starting user-service..."
(cd user-service && npm run start > ../logs/user-service.log 2>&1 &)

echo "Starting inventory-service..."
(cd inventory-service && npm run start > ../logs/inventory-service.log 2>&1 &)

echo "Starting api-gateway..."
(cd api-gateway && npm run start > ../logs/api-gateway.log 2>&1 &)

echo "Starting notification-service..."
(cd notification-service && npm run start > ../logs/notification-service.log 2>&1 &)

echo "All services started. Tailing logs..."
tail -f logs/*.log