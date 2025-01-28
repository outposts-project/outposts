FROM node:lts-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /usr/src/app
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    --mount=type=cache,id=node_modules,target=/usr/src/app/node_modules \
    pnpm install --no-frozen-lockfile
RUN --mount=type=cache,id=angular,target=/usr/src/app/.angular \
    --mount=type=cache,id=nx-cache,target=/usr/src/app/.nx \
    npm run build:outposts-web

FROM nginx:alpine
COPY ./apps/outposts-web/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /usr/src/app/dist/apps/outposts-web /usr/share/nginx/html
EXPOSE 80
