# SAJA — production image: one Node process serves the API (/api) and the built web app.
# Build:  docker build -t saja .
# Run:    docker run -p 8787:8787 -v saja-data:/data --env-file .env saja
# Without DATABASE_URL the embedded database lives in the /data volume (single instance; back it up).

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    SAJA_ENV=production \
    PORT=8787 \
    STATIC_DIR=/app/dist \
    PGLITE_DIR=/data/pglite \
    UPLOAD_DIR=/data/uploads
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
# The server is TypeScript run by tsx and imports shared domain/content code from src/.
COPY server ./server
COPY src ./src
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY --from=build /app/dist ./dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/system/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node_modules/.bin/tsx", "--tsconfig", "server/tsconfig.json", "server/index.ts"]
