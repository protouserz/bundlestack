# @shopify/cli requires Node >=22.12 (see package.json engines)
FROM node:22-alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
# DATABASE_URL is injected by the host (Render Postgres / Fly secrets). Do not
# bake a SQLite path into the image — ephemeral container disks lose sessions.

RUN npx prisma generate && npm run build && npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "run", "docker-start"]
