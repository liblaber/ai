ARG BASE=node:20.18.0
FROM ${BASE} AS base

WORKDIR /app

# Install cloudflared (trycloudflare quick tunnels)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /etc/apt/trusted.gpg.d/cloudflare-main.gpg >/dev/null && \
    echo "deb [signed-by=/etc/apt/trusted.gpg.d/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main" | tee /etc/apt/sources.list.d/cloudflared.list && \
    apt-get update && apt-get install -y cloudflared && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install dependencies (this step is cached as long as the dependencies don't change)
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install

# Copy Prisma schema first
COPY prisma ./prisma/

# Generate Prisma client
RUN pnpm prisma generate

# Copy the rest of your app's source code
COPY . .

# Production image
FROM base AS production

WORKDIR /app

RUN mkdir -p ${WORKDIR}/run

RUN pnpm run build

CMD ["pnpm", "run", "start"]
