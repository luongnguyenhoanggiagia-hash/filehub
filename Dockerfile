# ─── FILE HUB — Dockerfile (dành cho VPS) ────────────────────────
FROM node:20-alpine

# Thư mục app
WORKDIR /app

# Cài dependencies trước (cache tốt hơn)
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Thư mục lưu file upload
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3000

# Biến môi trường mặc định
ENV NODE_ENV=production
ENV PORT=3000
ENV ADMIN_PASSWORD=ntd942010

# Chạy app
CMD ["node", "server.js"]
