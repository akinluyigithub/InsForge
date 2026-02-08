FROM node:20-alpine

# Install netcat for database readiness check
RUN apk add --no-cache netcat-openbsd

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy child package.json files for workspace installation
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY auth/package.json ./auth/
COPY shared-schemas/package.json ./shared-schemas/

# Install dependencies (generating non-Windows lock file if necessary)
RUN npm install

# Copy the rest of the source code
COPY . .

# Build arguments for Vite environment variables
ARG VITE_API_BASE_URL
ARG VITE_PUBLIC_POSTHOG_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PUBLIC_POSTHOG_KEY=$VITE_PUBLIC_POSTHOG_KEY

# Build all workspace projects
RUN npm run build

# Expose main backend port
EXPOSE 7130

# Use entrypoint script to wait for DB and start app
RUN chmod +x ./deploy/docker-entrypoint.sh
ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
