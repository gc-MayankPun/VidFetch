FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    python3 \
    ca-certificates \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install deno (system-wide, accessible by all users including app)
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh
RUN deno --version

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp
RUN yt-dlp --version

# Create non-root user
RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN chown -R app:app /app

USER app

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "server.js"]