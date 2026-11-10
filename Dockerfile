# syntax=docker/dockerfile:1.7
# Souk — catalogue Selys Africa : application Angular rendue côté serveur (Node) + base SQLite.
#   docker build -t souk .

FROM node:24-alpine AS build
ENV NG_CLI_ANALYTICS=false CI=true
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

FROM node:24-alpine AS runtime
# SQLite natif de Node (node:sqlite) : aucune dépendance à compiler.
ENV NODE_ENV=production PORT=4000 SOUK_DB=/app/data/souk.db
WORKDIR /app
RUN addgroup -S selys && adduser -S selys -G selys \
  && mkdir -p /app/data && chown selys:selys /app/data
COPY --from=build --chown=selys:selys /app/dist/souk ./dist
USER selys
# La base vit dans un volume : elle survit aux reconstructions de l'image.
VOLUME ["/app/data"]
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/catalog >/dev/null || exit 1
CMD ["node", "dist/server/server.mjs"]
