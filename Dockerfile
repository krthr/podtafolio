FROM node:25-slim AS base

RUN apt-get update && apt-get install -y ffmpeg curl wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
