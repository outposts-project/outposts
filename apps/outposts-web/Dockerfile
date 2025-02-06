FROM node:22-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@10.2.0 --activate
WORKDIR /usr/src/app
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --no-frozen-lockfile
RUN --mount=type=cache,id=angular,target=/usr/src/app/.angular \
    --mount=type=cache,id=nx-cache,target=/usr/src/app/.nx \
    npm run build:outposts-web

FROM nginx:alpine
COPY ./apps/outposts-web/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /usr/src/app/dist/apps/outposts-web /usr/share/nginx/html
EXPOSE 80
