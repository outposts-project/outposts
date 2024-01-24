FROM node:lts-slim as builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /usr/src/app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile
RUN npm run build -w outposts-web

FROM nginx:alpine
COPY ./apps/outposts-web/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /usr/src/app/dist/outposts-web /usr/share/nginx/html
EXPOSE 80
