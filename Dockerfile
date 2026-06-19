# syntax=docker/dockerfile:1

# --- Build the static SPA -------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
# Install deps against the committed lockfile first for layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# PostHog config is inlined into the bundle at build time by Vite, so it must
# be present here — there is no .env in the image. Passed as build args from CI
# (the client key is a public, write-only ingestion key).
ARG VITE_POSTHOG_KEY=""
ARG VITE_POSTHOG_HOST="https://us.i.posthog.com"
ENV VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY
ENV VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST
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
