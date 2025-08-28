ARG BUN_VERSION=1-alpine

FROM oven/bun:${BUN_VERSION} AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json bun.lock turbo.json ./

COPY apps/api/package.json ./apps/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/constants/package.json ./packages/constants/
COPY packages/db/package.json ./packages/db/

RUN bun install

FROM oven/bun:${BUN_VERSION} AS runner

WORKDIR /app

COPY apps/api ./apps/api
COPY packages ./packages

COPY --from=deps /app/node_modules ./node_modules

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
