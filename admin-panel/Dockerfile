FROM node:20-alpine AS base 
 
FROM base AS deps 
RUN apk add --no-cache libc6-compat 
WORKDIR /app 
 
COPY package.json package-lock.json* ./ 
 
RUN npm install
 
FROM base AS builder 
WORKDIR /app 
COPY --from=deps /app/node_modules ./node_modules 
COPY . . 
 
RUN npm run build 
 
FROM gcr.io/distroless/nodejs20-debian12 AS production 
WORKDIR /app 

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static 
 
ENV HOSTNAME="0.0.0.0" 
CMD ["server.js"] 