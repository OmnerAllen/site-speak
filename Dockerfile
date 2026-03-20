# Stage 1: Build the React/Vite app
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package management files first for better caching
COPY client/package.json client/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the client source code
COPY client/ ./

# Build the project (Vite outputs to 'dist' by default)
RUN pnpm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Copy built assets from the builder stage to Nginx's serving directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for the server
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
