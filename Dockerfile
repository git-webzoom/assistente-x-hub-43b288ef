# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build arguments (Easypanel passa automaticamente as ENV vars)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG NODE_ENV=production

# Set as environment variables for the build
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV NODE_ENV=${NODE_ENV}

# Build the application
RUN npm run build

# Production Stage
FROM node:18-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve@14.2.1

# Copy built files
COPY --from=builder /app/dist ./dist

# Easypanel vai expor a porta dinamicamente
EXPOSE 3000

# Use a variável $PORT do Easypanel (padrão 3000 se não existir)
CMD sh -c "serve -s dist -l ${PORT:-3000} -n"
