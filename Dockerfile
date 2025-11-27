# 1. Use an official Node.js runtime as a parent image
FROM node:18-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# 4. Install dependencies (production only)
RUN npm install --only=production

# 5. Copy the rest of the application code
COPY . .

# 6. Expose the port the app runs on (Cloud Run expects 8080 by default)
ENV PORT=8080
EXPOSE 8080

# 7. Command to run the app
CMD ["node", "index.mjs"]