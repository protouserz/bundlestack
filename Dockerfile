# @shopify/cli requires Node >=22.12 (see package.json engines)
FROM node:22-alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
# Runtime DATABASE_URL comes from Render Postgres. Force a valid postgres URL
# for `prisma generate` so Docker builds succeed even if the dashboard still
# has a leftover SQLite file: URL from the free-tier config.
RUN DATABASE_URL="postgresql://prisma:prisma@127.0.0.1:5432/prisma" \
  npx prisma generate && npm run build && npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "run", "docker-start"]
