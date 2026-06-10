#!/bin/bash
set -e

APP_DIR="/var/www/opencontracts"
ENV_FILE="/etc/opencontracts.env"

echo "========== ApplicationStart started =========="

cd "$APP_DIR"

echo "========== Server dependency check =========="
dnf install -y gcc python3-devel postgresql15-devel || true

echo "========== Ensure environment file =========="
if [ ! -f "$ENV_FILE" ]; then
  SECRET=$(python3 -c 'import secrets; print("django-insecure-"+secrets.token_urlsafe(50))')

  cat > "$ENV_FILE" <<EOF
SECRET_KEY=$SECRET
DJANGO_SECRET_KEY=$SECRET
DEBUG=False
ALLOWED_HOSTS=65.0.107.153,localhost,127.0.0.1
DJANGO_ALLOWED_HOSTS=65.0.107.153,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://65.0.107.153
CORS_ALLOWED_ORIGINS=http://65.0.107.153
DATABASE_URL=postgres://opencontractsuser:Opencontracts%40123@127.0.0.1:5432/opencontractserver
POSTGRES_DB=opencontractserver
POSTGRES_USER=opencontractsuser
POSTGRES_PASSWORD=Opencontracts@123
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
REDIS_URL=redis://127.0.0.1:6379/0
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
EOF
fi

echo "========== Fix psycopg dependency =========="
sed -i 's/psycopg2==2.9.12/psycopg2-binary==2.9.12/g' requirements/production.txt || true

echo "========== Backend setup =========="
python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip wheel setuptools
pip install --no-cache-dir -r requirements/production.txt
pip install --no-cache-dir django-extensions gunicorn psycopg2-binary

set -a
source "$ENV_FILE"
set +a

python manage.py check || true
python manage.py migrate --noinput || true
python manage.py collectstatic --noinput || true

echo "========== Create backend service =========="
cat > /etc/systemd/system/opencontracts-backend.service <<EOF
[Unit]
Description=OpenContracts Django Backend
After=network.target postgresql.service redis6.service

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=/var/www/opencontracts
EnvironmentFile=/etc/opencontracts.env
ExecStart=/var/www/opencontracts/venv/bin/gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable opencontracts-backend
systemctl restart opencontracts-backend

echo "========== Frontend setup =========="
cd /var/www/opencontracts/frontend

cat > .env.production <<EOF
REACT_APP_USE_AUTH0=false
REACT_APP_USE_ANALYZERS=true
REACT_APP_ALLOW_IMPORTS=true
REACT_APP_API_ROOT_URL=http://65.0.107.153
VITE_API_ROOT_URL=http://65.0.107.153
VITE_USE_AUTH0=false
VITE_USE_ANALYZERS=true
VITE_ALLOW_IMPORTS=true
EOF

npm install --legacy-peer-deps
npm run build

echo "========== Copy frontend build =========="
rm -rf /usr/share/nginx/html/*

if [ -d dist ]; then
  cp -r dist/* /usr/share/nginx/html/
elif [ -d build ]; then
  cp -r build/* /usr/share/nginx/html/
else
  echo "ERROR: frontend build output not found"
  exit 1
fi

echo "========== Nginx setup =========="
cat > /etc/nginx/conf.d/opencontracts.conf <<EOF
server {
    listen 80;
    server_name 65.0.107.153;

    root /usr/share/nginx/html;
    index index.html;

    client_max_body_size 100M;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:8000/admin/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /graphql/ {
        proxy_pass http://127.0.0.1:8000/graphql/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "========== ApplicationStart completed =========="