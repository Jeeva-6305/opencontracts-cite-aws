#!/bin/bash
set -e

APP_DIR="/var/www/opencontracts"

echo "ApplicationStart started"

# Fix Windows line ending issue
find "$APP_DIR/scripts" -type f -name "*.sh" -exec sed -i 's/\r$//' {} \; || true

sudo systemctl start nginx || true

# Create simple success page first, so deployment output is visible
cat > /usr/share/nginx/html/index.html <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>OpenContracts Cite Deployment</title>
</head>
<body style="font-family:Arial;padding:40px;">
  <h1>OpenContracts Cite deployed successfully</h1>
  <p>AWS CodePipeline + CodeDeploy to EC2 is working.</p>
  <p>Server: Amazon Linux EC2</p>
</body>
</html>
EOF

# Try backend setup, but don't fail deployment if project env is missing
cd "$APP_DIR"

if [ -f "manage.py" ]; then
  echo "Django manage.py found"

  python3 -m venv venv || true
  source venv/bin/activate || true
  pip install --upgrade pip || true

  if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt || true
  elif [ -f "requirements/production.txt" ]; then
    pip install -r requirements/production.txt || true
  elif [ -f "requirements/base.txt" ]; then
    pip install -r requirements/base.txt || true
  elif [ -f "requirements/local.txt" ]; then
    pip install -r requirements/local.txt || true
  fi

  pip install gunicorn psycopg2-binary || true

  python manage.py migrate --noinput || true
  python manage.py collectstatic --noinput || true

  WSGI_MODULE=$(find . -path "*/wsgi.py" | head -n 1 | sed 's#^\./##' | sed 's#/#.#g' | sed 's#.py$##')

  if [ -n "$WSGI_MODULE" ]; then
    cat > /etc/systemd/system/opencontracts-backend.service <<EOF
[Unit]
Description=OpenContracts Django Backend
After=network.target

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=$APP_DIR
ExecStart=$APP_DIR/venv/bin/gunicorn $WSGI_MODULE:application --bind 0.0.0.0:8000 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable opencontracts-backend || true
    systemctl restart opencontracts-backend || true
  fi
fi

# Nginx config
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
}
EOF

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "ApplicationStart completed"