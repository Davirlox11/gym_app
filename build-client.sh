#!/bin/bash
set -e

echo "Building client for Vercel deployment..."

# Ensure client directory exists and has necessary files
cd client

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing client dependencies..."
    npm install
fi

# Build the client
echo "Building React application..."
npm run build:vercel

echo "Client build completed successfully"