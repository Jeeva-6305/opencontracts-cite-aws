#!/bin/bash
set -e

echo "BeforeInstall started"

mkdir -p /var/www/opencontracts
mkdir -p /usr/share/nginx/html
mkdir -p /var/log/opencontracts

chown -R ec2-user:ec2-user /var/www/opencontracts
chown -R ec2-user:ec2-user /var/log/opencontracts

echo "BeforeInstall completed"