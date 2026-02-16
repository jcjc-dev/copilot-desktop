# Stage 1: Frontend dependencies
FROM node:22-alpine AS frontend-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Frontend build
FROM frontend-deps AS frontend-build
COPY . .
RUN npm run build && rm -rf node_modules

# Stage 3: Test runner
FROM rust:1.88-bookworm AS test
RUN rustup component add clippy rustfmt && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
WORKDIR /app
COPY . .
RUN npm ci
RUN cd src-tauri && cargo fetch
RUN groupadd -g 1001 appuser && useradd -u 1001 -g appuser -m appuser && \
    chown -R appuser:appuser /app /usr/local/cargo
USER appuser
CMD ["make", "test"]
