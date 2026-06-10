#!/bin/bash
set -e

APP_DIR="/var/www/opencontracts"

echo "Finding backend folder..."
BACKEND_DIR=$(find "$APP_DIR" -maxdepth 4 -name manage.py -printf '%h\n' | head -n 1)

if [ -z "$BACKEND_DIR" ]; then
  echo "ERROR: manage.py not found"
  exit 1
fi

echo "Backend found at $BACKEND_DIR"
cd "$BACKEND_DIR"

echo "Creating Python venv..."
python3 -m venv venv
source venv/bin/activate

echo "Installing backend requirements..."
pip install --upgrade pip
if [ -f requirements.txt ]; then
  pip install -r requirements.txt
else
  REQ_FILE=$(find "$APP_DIR" -maxdepth 4 -name requirements.txt | head -n 1)
  pip install -r "$REQ_FILE"
fi

pip install gunicorn psycopg2-binary

echo "Running Django migrations..."
python manage.py migrate || true
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
EnvironmentFile=-/var/www/opencontracts/.env
ExecStart=$BACKEND_DIR/venv/bin/gunicorn $WSGI_MODULE:application --bind 0.0.0.0:8000 --workers 3
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable opencontracts-backend
systemctl restart opencontracts-backend

echo "Finding frontend folder..."
FRONTEND_DIR=$(find "$APP_DIR" -maxdepth 4 -name package.json -not -path "*/node_modules/*" -printf '%h\n' | head -n 1)

if [ -n "$FRONTEND_DIR" ]; then
  echo "Frontend found at $FRONTEND_DIR"
  cd "$FRONTEND_DIR"

  cat > .env.production <<EOF
REACT_APP_USE_AUTH0=false
REACT_APP_USE_ANALYZERS=true
REACT_APP_ALLOW_IMPORTS=true
REACT_APP_API_ROOT_URL=http://65.0.107.153
VITE_API_ROOT_URL=http://65.0.107.153
EOF

  npm install
  npm run build

  rm -rf /usr/share/nginx/html/*
  if [ -d dist ]; then
    cp -r dist/* /usr/share/nginx/html/
  elif [ -d build ]; then
    cp -r build/* /usr/share/nginx/html/
  fi
else
  echo "Frontend package.json not found, skipping frontend build"
fi

cat > /etc/nginx/conf.d/opencontracts.conf <<EOF
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /static/ {
        alias /var/www/opencontracts/staticfiles/;
    }

    location /media/ {
        alias /var/www/opencontracts/media/;
    }
}
EOF

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "Deployment started successfully"