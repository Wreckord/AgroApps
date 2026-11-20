FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Berlin

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       php-cli php-pgsql tzdata ca-certificates \
    && ln -snf /usr/share/zoneinfo/Europe/Berlin /etc/localtime \
    && echo Europe/Berlin > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev

COPY database.ts read_openmeteo.ts ./
COPY php/ ./php/

RUN mkdir -p /var/log/weather

CMD ["php", "/app/php/scheduler.php"]
