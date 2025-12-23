FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile

COPY src ./src

# HTTP transport is disabled by default in src/index.ts unless MCP_HTTP_PORT > 0
ENV MCP_HTTP_PORT=3000
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]


