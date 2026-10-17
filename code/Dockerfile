FROM docker.io/oven/bun:1.4
WORKDIR /app
COPY package.json bun.lock ./
# Full install: Vite is a dev dependency and is needed to build the frontend.
RUN bun install --frozen-lockfile
COPY . .
RUN bunx --bun vite build
ENV NODE_ENV=production HOST=0.0.0.0
