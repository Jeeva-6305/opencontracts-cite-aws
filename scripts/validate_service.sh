#!/bin/bash
set -e

echo "Checking backend service..."
systemctl status opencontracts-backend --no-pager

echo "Checking nginx..."
systemctl status nginx --no-pager

echo "Testing backend port..."
curl -I http://127.0.0.1:8000 || true

echo "Testing frontend..."
curl -I http://127.0.0.1 || true

echo "Validation completed"
