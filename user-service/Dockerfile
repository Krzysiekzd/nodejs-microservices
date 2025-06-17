# Use official Node.js base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Build the app (NestJS needs this if using TypeScript)
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/main"]
