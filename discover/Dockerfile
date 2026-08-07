FROM oven/bun:1-alpine

WORKDIR /app

# Copy package manifest and lockfile
COPY package.json bun.lock ./

# Install dependencies inside the container
RUN bun install

# Copy application source code
COPY . .

# Set environment variables for container network binding
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Expose Next.js port
EXPOSE 3000

# Start Next.js dev server listening on all host interfaces
CMD ["bun", "run", "dev", "--", "-H", "0.0.0.0"]
