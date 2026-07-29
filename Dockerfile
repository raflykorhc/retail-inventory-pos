# ============================================================
# TAHAP 1: BUILDER — Kompilasi & Build Frontend + Backend
# ============================================================
FROM node:20-slim AS builder

WORKDIR /app

# Install dependensi sistem untuk Prisma & native modules
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files dulu agar layer di-cache jika tidak ada perubahan deps
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma

# Install semua dependencies
RUN npm ci --legacy-peer-deps

# Generate Prisma Client
RUN npx prisma generate

# Copy seluruh source code
COPY . .

# Build: frontend (vite) + backend (esbuild) → output ke dist/
RUN npm run build


# ============================================================
# TAHAP 2: RUNNER — Image ringan untuk production
# ============================================================
FROM node:20-slim AS runner

WORKDIR /app

# Install runtime dependencies
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy hanya file yang diperlukan dari builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r$//' ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Port yang digunakan server
EXPOSE 3000

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000

# Jalankan entrypoint: migrate → seed → server
ENTRYPOINT ["sh", "./entrypoint.sh"]