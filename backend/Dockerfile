
FROM node:22-slim

WORKDIR /app

# Install runtimes and compilers for code execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    default-jdk \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies
COPY package*.json ./

RUN npm ci --omit=dev

# Copy backend source code
COPY . .

ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "server.js"]

