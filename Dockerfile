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
COPY --from=deps /app/package.json ./
COPY --from=deps /app/bun.lock ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/turbo.json ./turbo.json

WORKDIR /app

ARG DATABASE_URL
ARG APP_URL
ARG API_USERNAME
ARG API_PASSWORD
ARG API_URL
ARG REDIS_URL

ENV DATABASE_URL=${DATABASE_URL}
ENV APP_URL=${APP_URL}
ENV API_USERNAME=${API_USERNAME}
ENV API_PASSWORD=${API_PASSWORD}
ENV API_URL=${API_URL}
ENV REDIS_URL=${REDIS_URL}

EXPOSE 3000

CMD ["bun", "run", "start"]
