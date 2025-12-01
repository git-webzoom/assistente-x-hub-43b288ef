# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build arguments
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG NODE_ENV=production

ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV NODE_ENV=${NODE_ENV}

# Build
RUN npm run build

# Production Stage
FROM node:18-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve@14.2.1

# Copy built files
COPY --from=builder /app/dist ./dist

# Default port
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start - sem healthcheck
CMD ["sh", "-c", "serve -s dist -l ${PORT} -n --no-port-switching"]
