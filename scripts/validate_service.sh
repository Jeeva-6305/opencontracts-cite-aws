#!/bin/bash
set -e

echo "========== ValidateService started =========="

systemctl status nginx --no-pager
systemctl status opencontracts-backend --no-pager

curl -I http://127.0.0.1
curl -I http://127.0.0.1:8000 || true

echo "========== ValidateService completed =========="