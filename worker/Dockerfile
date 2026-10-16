# Storyling background worker. Build from the repository root:
#   docker build -f worker/Dockerfile -t storyling-worker .
# The Playwright base image ships Chromium + fonts needed for PDF rendering.
FROM mcr.microsoft.com/playwright:v1.64.1-noble

ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
COPY worker ./worker
COPY public/fonts ./public/fonts

USER pwuser
CMD ["pnpm", "worker"]
