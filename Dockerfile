ARG NODE_IMAGE=node:24-bookworm-slim

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.client.json vite.config.ts index.html ./
COPY src/client ./src/client
COPY public ./public
RUN npm run build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    SETRAI_HOST=0.0.0.0 \
    SETRAI_PORT=3000 \
    SETRAI_DATA_DIR=/data
WORKDIR /app
LABEL org.opencontainers.image.title="Setrai" \
      org.opencontainers.image.description="Self-hosted training, workouts, and recovery" \
      org.opencontainers.image.source="https://github.com/sette7blo/setrai"
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts \
    && npm cache clean --force \
    && mkdir -p /data \
    && chown node:node /data
COPY src/server ./src/server
COPY scripts/docker-healthcheck.mjs ./scripts/docker-healthcheck.mjs
COPY --from=build /app/dist/client ./dist/client
USER node
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "scripts/docker-healthcheck.mjs"]
CMD ["node", "src/server/index.js"]
