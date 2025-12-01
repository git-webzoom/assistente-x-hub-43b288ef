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

ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV NODE_ENV=production

# Build
RUN npm run build

# Production Stage
FROM node:18-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve@14.2.1

# Copy built files
COPY --from=builder /app/dist ./dist

# IMPORTANTE: Porta fixa 80 para o Easypanel
EXPOSE 80

# Start na porta 80 (sem variável dinâmica)
CMD ["serve", "-s", "dist", "-l", "80", "-n"]
