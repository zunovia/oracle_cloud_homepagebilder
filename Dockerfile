FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY webstudio-project/build/package.json webstudio-project/build/package-lock.json* ./
RUN npm ci --omit=dev

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 remix

COPY --from=deps /app/node_modules ./node_modules
COPY webstudio-project/build/ .

USER remix

EXPOSE 3000

CMD ["npm", "run", "start"]
