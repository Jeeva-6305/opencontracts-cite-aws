#!/bin/bash
set -e

echo "Stopping old services if running..."
systemctl stop opencontracts-backend || true
systemctl stop nginx || true

echo "Cleaning old deployment..."
rm -rf /var/www/opencontracts/*
mkdir -p /var/www/opencontracts
chown -R ec2-user:ec2-user /var/www/opencontracts
