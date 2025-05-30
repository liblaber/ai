ARG BASE=node:20.18.0
FROM ${BASE} AS base

WORKDIR /app

# Install dependencies (this step is cached as long as the dependencies don't change)
COPY package.json pnpm-lock.yaml ./

#RUN npm install -g corepack@latest

#RUN corepack enable pnpm && pnpm install
RUN npm install -g pnpm && pnpm install

# Copy Prisma schema first
COPY prisma ./prisma/

# Generate Prisma client
RUN pnpm prisma generate

# Copy the rest of your app's source code
COPY . .

# Production image
FROM base AS production

ENV RUNNING_IN_DOCKER=true

RUN NODE_OPTIONS="--max_old_space_size=4096" pnpm run build

RUN mkdir -p ${WORKDIR}/run

CMD ["pnpm", "run", "serve"]
