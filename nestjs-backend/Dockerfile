# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# Production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl tini \
  && addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./
RUN mkdir -p uploads/jobs uploads/identity && chown -R app:app uploads
USER app
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3001/health || exit 1
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node", "dist/main"]
