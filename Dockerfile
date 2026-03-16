FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

COPY frontend/ ./

ARG VITE_API_BASE_URL=https://dev.abako.xyz
ARG VITE_KREIVO_RPC_URL=

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_KREIVO_RPC_URL=${VITE_KREIVO_RPC_URL}

RUN npm run build

FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
