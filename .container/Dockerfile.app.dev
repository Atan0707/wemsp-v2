FROM node:24-alpine

# Enable corepack
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy package files
COPY app/package.json app/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Export port 3000
EXPOSE 3000

# Start the app
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]