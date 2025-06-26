# Step 1: Specify the base image to build from. 
# We're using a lightweight version of Node.js 18.
FROM node:18-alpine

# Step 2: Set the working directory inside the container.
# All subsequent commands will run from this path.
WORKDIR /app

# Step 3: Copy the backend's package files.
# This is an optimization. Docker will only re-run 'npm install' if these files change.
COPY backend/package*.json ./backend/

# Step 4: Install the backend dependencies.
# The --prefix flag tells npm to install them inside the 'backend' subfolder.
RUN npm install --prefix backend

# Step 5: Copy the rest of your application code into the container.
# First, copy the backend source code.
COPY backend/ ./backend/
# Then, copy the frontend static files.
COPY frontend/ ./frontend/

# Step 6: Expose the port your app runs on.
# Your server.js listens on port 3000, so we expose it.
EXPOSE 3000

# Step 7: Define the command to start your application.
# This command runs when the container starts.
CMD ["node", "backend/server.js"]