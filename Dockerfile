FROM node:20-alpine

WORKDIR /app

RUN corepack enable

# This Dockerfile should be built from the repository root with:
# docker build -f indexflow-backend/Dockerfile -t indexflow-backend .

# Copy monorepo files from root context
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy monorepo packages
COPY packages ./packages
COPY indexflow-backend ./indexflow-backend

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile

# Build the backend
RUN pnpm --filter indexflow-backend run build

EXPOSE 4000
CMD ["node", "indexflow-backend/dist/server.js"]
