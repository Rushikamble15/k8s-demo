# Use a lightweight Node.js image for build
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application files and build the app
COPY . .
RUN npm run build

# Use a lightweight Nginx image to serve the built app
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html

# Expose the Nginx port
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
