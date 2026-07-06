# @shopify/cli requires Node >=22.12 (see package.json engines)
FROM node:22-alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
# Render free tier has no persistent volume — DB file lives in container (resets on redeploy)
ENV DATABASE_URL=file:./prisma/production.sqlite

RUN npx prisma generate && npm run build && npm prune --omit=dev
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "docker-start"]
