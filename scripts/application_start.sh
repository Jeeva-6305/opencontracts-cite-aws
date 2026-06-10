#!/bin/bash
set -e

APP_DIR="/var/www/opencontracts"
ENV_FILE="/etc/opencontracts.env"

echo "========== ApplicationStart started =========="

# Load environment variables
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# Fix Windows line endings
find "$APP_DIR/scripts" -type f -name "*.sh" -exec sed -i 's/\r$//' {} \; || true

echo "========== Backend setup =========="

BACKEND_DIR=$(find "$APP_DIR" -maxdepth 5 -name manage.py -printf '%h\n' | head -n 1)

if [ -z "$BACKEND_DIR" ]; then
  echo "ERROR: manage.py not found"
  exit 1
fi

echo "Backend directory: $BACKEND_DIR"
cd "$BACKEND_DIR"

python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip wheel setuptools

if [ -f "requirements/production.txt" ]; then
  pip install -r requirements/production.txt
elif [ -f "requirements/local.txt" ]; then
  pip install -r requirements/local.txt
elif [ -f "requirements/base.txt" ]; then
  pip install -r requirements/base.txt
elif [ -f "requirements.txt" ]; then
  pip install -r requirements.txt
else
  echo "ERROR: requirements file not found"
  exit 1
fi

pip install gunicorn psycopg2-binary whitenoise django-cors-headers || true

echo "Running Django migrations..."
python manage.py migrate --noinput || true

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

WSGI_MODULE=$(find . -path "*/wsgi.py" | head -n 1 | sed 's#^\./##' | sed 's#/#.#g' | sed 's#.py$##')

if [ -z "$WSGI_MODULE" ]; then
  echo "ERROR: wsgi.py not found"
  exit 1
fi

echo "WSGI module: $WSGI_MODULE"

cat > /etc/systemd/system/opencontracts-backend.service <<EOF
[Unit]
Description=OpenContracts Django Backend
After=network.target postgresql.service redis6.service

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$BACKEND_DIR/venv/bin/gunicorn $WSGI_MODULE:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable opencontracts-backend
systemctl restart opencontracts-backend

echo "========== Frontend setup =========="

FRONTEND_DIR=$(find "$APP_DIR" -path "*/node_modules" -prune -o -name package.json -printf '%h\n' | while read dir; do
  if grep -q '"build"' "$dir/package.json"; then
    echo "$dir"
    break
  fi
done)

if [ -z "$FRONTEND_DIR" ]; then
  echo "ERROR: frontend package.json with build script not found"
  exit 1
fi

echo "Frontend directory: $FRONTEND_DIR"
cd "$FRONTEND_DIR"

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

npm install
npm run build

rm -rf /usr/share/nginx/html/*

if [ -d "dist" ]; then
  cp -r dist/* /usr/share/nginx/html/
elif [ -d "build" ]; then
  cp -r build/* /usr/share/nginx/html/
else
  echo "ERROR: frontend build output folder not found"
  exit 1
fi

echo "========== Nginx setup =========="

rm -f /etc/nginx/conf.d/default.conf || true

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

    location /static/ {
        alias $BACKEND_DIR/staticfiles/;
    }

    location /media/ {
        alias $BACKEND_DIR/media/;
    }
}
EOF

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "========== ApplicationStart completed =========="