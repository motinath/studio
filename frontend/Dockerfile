FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* bun.lock* ./

# Install dependencies (supports bun or npm)
RUN if [ -f bun.lock ]; then npm install -g bun && bun install; else npm ci; fi

# Copy application source
COPY . .

# Expose the port specified in docker-compose (3000)
EXPOSE 3000

# Start the application in development mode (which runs the SSR dev server)
CMD ["npx", "vite", "dev", "--port", "3000", "--host"]
