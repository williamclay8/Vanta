#!/bin/zsh

set -e

RENDER="/opt/homebrew/bin/render"

echo "=== Vanta Website Deployment Script ==="

# Install Render CLI if missing
if ! command -v $RENDER &> /dev/null; then
    echo "Installing Render CLI..."
    brew install render
fi

# Login
echo "Please complete login in your browser when prompted..."
$RENDER login

# Set workspace (correct ID)
echo "Setting Vanta workspace..."
$RENDER workspace set tea-d7j37af7f7vs739ii8rg

# Deploy
echo "Triggering deployment for Vanta (srv-d7j3ggqqqhas739for80)..."
$RENDER deploys create srv-d7j3ggqqqhas739for80 --wait

echo "✅ Deployment completed."