# Build stage for MS Cable Tracker Electron app
FROM node:20-bullseye AS builder

# Install dependencies required for Electron builds
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libnotify-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    xauth \
    xvfb \
    wine64 \
    rpm \
    fakeroot \
    dpkg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Build Electron distributables (Linux by default)
# For Windows builds, you may need additional configuration
RUN npm run build:electron -- --linux

# The built application will be in the /app/release directory
# You can copy it out using docker cp or mount a volume

# Output stage - minimal image with just the built artifacts
FROM alpine:latest AS artifacts
WORKDIR /output
COPY --from=builder /app/release /output/

# Default command shows available builds
CMD ["ls", "-la", "/output"]
