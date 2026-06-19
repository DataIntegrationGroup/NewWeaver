# syntax=docker/dockerfile:1

# --- Build the static SPA -------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
# Install deps against the committed lockfile first for layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# --- Serve with nginx -----------------------------------------------------
FROM nginx:1.27-alpine AS runtime
# Cloud Run injects PORT (default 8080); the nginx image envsubst's templates
# in /etc/nginx/templates/*.template into /etc/nginx/conf.d at startup.
ENV PORT=8080
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
# Inherit the base image entrypoint/cmd (runs envsubst, then `nginx -g daemon off`).
