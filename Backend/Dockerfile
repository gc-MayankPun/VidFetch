FROM node:22-slim

RUN apt-get update && apt-get install -y ffmpeg curl python3 && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp && \
    head -1 /usr/local/bin/yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN head -1 /usr/local/bin/yt-dlp

EXPOSE 3000
CMD ["node", "server.js"]