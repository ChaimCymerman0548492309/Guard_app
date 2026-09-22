FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.3 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/risk-engine/package.json ./packages/risk-engine/
COPY packages/simulator/package.json ./packages/simulator/
RUN pnpm install --frozen-lockfile --filter @guardian/web... --ignore-scripts
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY apps/web ./apps/web
RUN pnpm --filter @guardian/shared build && pnpm --filter @guardian/ui build
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @guardian/web build

FROM nginx:1.27-alpine
COPY apps/web/nginx.default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
