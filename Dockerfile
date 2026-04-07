# Install dependencies only when needed
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM node:24-alpine AS builder

# RUN apk --no-cache add curl
WORKDIR /app
COPY package.json package-lock.json ./
COPY public  public
COPY index.html index.html
COPY src  src
COPY eslint.config.js vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY --from=deps /app/node_modules ./node_modules

RUN npm run build

# Production image, copy all the files and run vite
FROM nginx:1.29.3 AS nginx
WORKDIR /app

COPY --from=builder /app/dist/ /usr/share/nginx/html

COPY ./docker/nginx/conf.d/*.template /etc/nginx/templates/

# Adds the runtime envsubstr on /usr/share/nginx/html to update env vars
# passed to the container (instead of building them into the image)
COPY ./docker/nginx/env.sh /docker-entrypoint.d/env.sh
RUN chmod ug=rwx,o=rx /docker-entrypoint.d/env.sh

EXPOSE 80
