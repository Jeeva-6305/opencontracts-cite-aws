#!/bin/bash
set -e

echo "ValidateService started"

systemctl status nginx --no-pager

curl -I http://127.0.0.1 || true
curl -I http://127.0.0.1:8000 || true

echo "ValidateService completed"