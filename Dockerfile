# Use the official Microsoft Playwright image containing Node.js and pre-configured browser dependencies
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

# Set working directory inside the container
WORKDIR /app

# Copy dependency configuration files
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy all application source files
COPY . .

# Expose backend port 5001
EXPOSE 5001

# Start the Express automation server
CMD ["npm", "start"]
