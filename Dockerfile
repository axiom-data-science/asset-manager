# Install dependencies only when needed
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install

# Rebuild the source code only when needed
FROM oven/bun:1 AS builder
# Include any necessary build tokens
ARG NEXT_PUBLIC_RWANTHRO_BACKEND_BASE_URL
ARG NEXT_PUBLIC_RWANTHRO_WORDPRESS_BASE_URL
ARG NEXT_PUBLIC_RWANTHRO_CALVING_DATA_CSV_URL
ARG NEXT_PUBLIC_RWANTHRO_INJURY_DATA_CSV_URL
ARG NEXT_PUBLIC_RWANTHRO_MORTALITY_DATA_CSV_URL
ARG NEXT_PUBLIC_RWANTHRO_POULATION_DATA_CSV_URL
WORKDIR /app
COPY package.json bun.lockb ./
COPY public  public
COPY src  src
COPY .eslintrc.json tailwind.config.ts next.config.ts postcss.config.mjs tsconfig.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN bun run build

# Production image, copy all the files and run nginx
FROM nginx:1.31.0-alpine AS nginx
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/out/ /usr/share/nginx/html

COPY ./docker/nginx/conf.d/* /etc/nginx/conf.d/

EXPOSE 80
