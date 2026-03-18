# ==========================================
#  Vapor API — Multi-stage Docker Build
#  Optimized for minimal final image size
# ==========================================

# Stage 1: Resolve dependencies (cached layer)
FROM swift:6.0-noble AS resolve
WORKDIR /app
COPY Package.swift Package.resolved* ./
RUN swift package resolve

# Stage 2: Build release binary
FROM swift:6.0-noble AS build
WORKDIR /app

# Copy resolved dependencies from previous stage
COPY --from=resolve /app/.build /app/.build
COPY --from=resolve /app/Package.resolved /app/Package.resolved
COPY Package.swift ./

# Copy source code
COPY Sources/ Sources/

# Build with static linking for portability
RUN swift build -c release \
    --static-swift-stdlib \
    -Xlinker -lstdc++

# Stage 3: Runtime (minimal Ubuntu — no Swift toolchain)
FROM ubuntu:24.04 AS runtime

# Install only required runtime dependencies
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        libcurl4 \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home --shell /bin/bash vapor
USER vapor
WORKDIR /home/vapor

# Copy the built binary
COPY --from=build --chown=vapor:vapor /app/.build/release/App /usr/local/bin/vapor-api

# Expose API port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Run the server
ENTRYPOINT ["vapor-api"]
CMD ["serve", "--env", "production", "--hostname", "0.0.0.0", "--port", "8080"]
