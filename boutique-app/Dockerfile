FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM dependencies AS migrator

WORKDIR /app
COPY . .
RUN npx prisma generate
CMD ["node", "prisma/migrate.mjs"]

FROM node:22-alpine AS production-dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=production-dependencies --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nextjs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nextjs /app/src/lib/auth/password.ts ./src/lib/auth/password.ts
USER nextjs

EXPOSE 3000
CMD ["sh", "-c", "if [ -z \"$SESSION_SECRET\" ] || [ ${#SESSION_SECRET} -lt 32 ] || [ \"$SESSION_SECRET\" = \"replace-with-a-random-secret\" ]; then echo 'Set a strong SESSION_SECRET (>=32 chars) in environment variables' >&2; exit 1; fi; exec npm run start"]
