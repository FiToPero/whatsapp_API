FROM ubuntu:22.04

ARG PROJECT_NAME
ARG WWWGROUP
ARG NODE_VERSION=20.17.0

# Crear directorio de trabajo estándar
WORKDIR /app

# Variables de entorno
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC
ENV NODE_ENV=production

# Actualizar sistema y instalar dependencias básicas + Firefox dependencies
RUN apt-get update && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        gnupg \
        lsb-release \
        git \
        sqlite3 \
        nano \
        tzdata \
        dumb-init \
        xz-utils \
        # Dependencias para Puppeteer/Firefox
        libdbus-glib-1-2 \
        libgtk-3-0 \
        libx11-xcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxi6 \
        libxtst6 \
        libnss3 \
        libcups2 \
        libxss1 \
        libxrandr2 \
        libasound2 \
        libpangocairo-1.0-0 \
        libatk1.0-0 \
        libcairo-gobject2 \
        libgtk-3-0 \
        libgdk-pixbuf2.0-0 \
        libxrender1 \
        libfontconfig1 \
        fonts-liberation \
        xdg-utils \
        wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Configurar timezone
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Instalar Node.js directamente desde binarios oficiales (usando ARG NODE_VERSION)
RUN curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz -o node.tar.gz \
    && tar -xzf node.tar.gz \
    && mv node-v${NODE_VERSION}-linux-x64 /usr/local/node \
    && ln -s /usr/local/node/bin/node /usr/local/bin/node \
    && ln -s /usr/local/node/bin/npm /usr/local/bin/npm \
    && ln -s /usr/local/node/bin/npx /usr/local/bin/npx \
    && rm node.tar.gz

# Verificar instalación de Node.js y npm
RUN node --version && npm --version

# Instalar gestores de paquetes adicionales (compatible con Node 20)
RUN npm install -g npm@latest pnpm@latest

# Instalar Google Chrome para Puppeteer (evita problemas de Snap en Docker)
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario no-root para seguridad (usando UID/GID del host)
RUN groupadd --gid ${WWWGROUP:-1000} appgroup \
    && useradd --uid ${WWWGROUP:-1000} --gid appgroup --shell /bin/bash --create-home appuser

# Cambiar permisos del directorio de trabajo
RUN chown -R appuser:appgroup /app

# Cambiar al usuario no-root
USER appuser

EXPOSE 3000

# Comando por defecto para mantener el contenedor activo
CMD ["tail", "-f", "/dev/null"]

