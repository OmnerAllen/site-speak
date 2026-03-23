FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY client/package.json client/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY client/ ./

RUN pnpm run build

FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html


CMD ["nginx", "-g", "daemon off;"]
