# Stage 1: Frontend dependencies
FROM node:22-alpine AS frontend-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Frontend build
FROM frontend-deps AS frontend-build
COPY . .
RUN npm run build

# Stage 3: Test runner
FROM rust:1.85-bookworm AS test
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
WORKDIR /app
COPY . .
RUN npm ci
RUN cd src-tauri && cargo fetch
CMD ["make", "test"]
