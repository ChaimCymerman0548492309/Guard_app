FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY prisma ./prisma
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/risk-engine/package.json ./packages/risk-engine/
COPY packages/simulator/package.json ./packages/simulator/
RUN pnpm install --frozen-lockfile --filter @guardian/api... --filter @guardian/web... --ignore-scripts \
  && pnpm add -w tsx bcryptjs --ignore-scripts
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/web ./apps/web
COPY config ./config
RUN pnpm db:generate
RUN pnpm --filter @guardian/shared build \
  && pnpm --filter @guardian/risk-engine build \
  && pnpm --filter @guardian/simulator build \
  && pnpm --filter @guardian/ui build \
  && VITE_API_URL= pnpm --filter @guardian/web build \
  && pnpm --filter @guardian/api build

FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY prisma ./prisma
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/risk-engine/package.json ./packages/risk-engine/
COPY packages/simulator/package.json ./packages/simulator/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/packages/risk-engine/dist ./packages/risk-engine/dist
COPY --from=builder /app/packages/risk-engine/node_modules ./packages/risk-engine/node_modules
COPY --from=builder /app/packages/simulator/dist ./packages/simulator/dist
COPY --from=builder /app/packages/simulator/node_modules ./packages/simulator/node_modules
COPY --from=builder /app/apps/web/dist ./apps/web/dist
ENV SERVE_WEB_DASHBOARD=true
RUN chmod +x ./scripts/docker-entrypoint.sh
ENV NODE_ENV=production
EXPOSE 3000
CMD ["./scripts/docker-entrypoint.sh"]
