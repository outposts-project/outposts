FROM node:lts-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /usr/src/app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile
RUN --mount=type=cache,id=angular,target=/usr/src/app/.angular npm run build -w outposts-web

FROM nginx:alpine
COPY ./apps/outposts-web/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /usr/src/app/dist/apps/outposts-web /usr/share/nginx/html
EXPOSE 80
