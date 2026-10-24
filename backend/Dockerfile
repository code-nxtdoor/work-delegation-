# API tier. Build from the repository root so the db/ folder (migrations, seed) is included:
#   docker build -f backend/Dockerfile -t delegation-api .
FROM node:22-alpine
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/src ./src
COPY db /app/db
ENV NODE_ENV=production PORT=8080 DB_DIR=/app/db
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/api/health || exit 1
CMD ["node", "src/index.js"]
