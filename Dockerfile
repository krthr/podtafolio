FROM node:25-slim AS base

RUN apt-get update && apt-get install -y ffmpeg curl wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (cached unless package files change)
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source
COPY . .

# Build (cache Nuxt/Nitro build artifacts)
RUN --mount=type=cache,target=/app/node_modules/.cache npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx drizzle-kit migrate && node .output/server/index.mjs"]
