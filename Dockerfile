# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (only frontend deps needed)
RUN npm ci --legacy-peer-deps

# Copy frontend source
COPY src/renderer ./src/renderer
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.cjs ./
COPY tailwind.config.cjs ./

# Build frontend
RUN npm run build:frontend

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/server

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci

# Copy server source
COPY server/src ./src
COPY server/tsconfig.json ./

# Build backend
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install only production dependencies for server
COPY server/package*.json ./
RUN npm ci --only=production && apk del python3 make g++

# Copy built backend
COPY --from=backend-builder /app/server/dist ./dist

# Copy built frontend
COPY --from=frontend-builder /app/dist/renderer ./public

# Create data directory
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV STATIC_PATH=/app/public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run the server
CMD ["node", "dist/index.js"]
