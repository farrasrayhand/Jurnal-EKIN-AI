# Dockerfile Produksi E-Kinerja AI untuk Easypanel / Coolify / Docker VPS
# Otomatis menjalankan Web Server + Bot Telegram secara bersamaan!

FROM node:22-alpine AS builder

WORKDIR /app

# Salin berkas package dan install dependensi
COPY package*.json ./
RUN npm ci

# Salin kode sumber dan build frontend
COPY . .
RUN npm run build

# Stage Runner Produksi (Ringan & Cepat)
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install dependensi produksi saja
COPY package*.json ./
RUN npm ci --omit=dev

# Salin hasil build frontend dan server backend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/database ./database

# Pastikan folder database tersedia
RUN mkdir -p /app/database

# Port aplikasi
EXPOSE 3000

# Health check untuk Easypanel
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Otomatis menjalankan Web App + Bot Telegram saat kontainer dimulai
CMD ["node", "server/server.js"]
