FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/risk-engine/package.json ./packages/risk-engine/
COPY packages/simulator/package.json ./packages/simulator/
RUN pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN pnpm --filter @guardian/api build

FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
