ARG BUN_VERSION=1-alpine

FROM oven/bun:${BUN_VERSION} AS deps

WORKDIR /app

# Repository root
COPY package.json bun.lock turbo.json ./
# Repository packages
COPY packages ./packages
# Repository app(s)
COPY apps ./apps

RUN apk add --no-cache python3 make g++

RUN set -e; \
    for dir in packages/*; do \
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then \
    echo "📦 Installing dependencies in $dir"; \
    cd "$dir" || exit 1; \
    bun install || exit 1; \
    echo "✅ Completed $dir"; \
    cd /app || exit 1; \
    else \
    echo "⏭️  Skipping $dir (not a package)"; \
    fi; \
    done

RUN echo "📦 Installing API dependencies" && \
    cd apps/api && \
    bun install && \
    echo "✅ API dependencies installed" && \
    cd /app

FROM oven/bun:${BUN_VERSION} AS runner

WORKDIR /app

COPY --from=deps /app/apps/api/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/api .

CMD ["bun", "run", "src/index.ts"]
