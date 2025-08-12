ARG BASE=node:24
FROM ${BASE} AS base

WORKDIR /app

# Install ngrok
RUN apt-get update && apt-get install -y curl && \
    curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
    echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | tee /etc/apt/sources.list.d/ngrok.list && \
    apt-get update && apt-get install -y ngrok && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    apt-get update && apt-get install -y locales

# Install dependencies (this step is cached as long as the dependencies don't change)
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install

# Last supported deno version for netlify is 2.2.4
RUN npm install -g deno@2.2.4

RUN echo "LC_ALL=en_US.UTF-8" >> /etc/environment
RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
RUN echo "LANG=en_US.UTF-8" > /etc/locale.conf
RUN locale-gen en_US.UTF-8

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
