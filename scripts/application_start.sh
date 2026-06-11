#!/bin/bash
set -e

APP_DIR="/var/www/opencontracts"
ENV_FILE="/etc/opencontracts.env"
EC2_IP="65.0.107.153"

echo "========== ApplicationStart started =========="
cd "$APP_DIR"

echo "========== Install base packages =========="
dnf install -y git gcc make nginx redis6

dnf install -y python3.11 python3.11-devel python3.11-pip || dnf install -y python3 python3-devel python3-pip

systemctl enable --now redis6
systemctl enable --now nginx

echo "========== Install Node 22 =========="
CURRENT_NODE=$(node -v 2>/dev/null || echo "none")

if [[ "$CURRENT_NODE" != v22* ]]; then
  dnf remove -y nodejs npm nodejs18 || true
  curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
  dnf install -y nodejs
fi

node -v
npm -v

echo "========== Install PostgreSQL 15 with pgvector =========="

if [ ! -x "/usr/pgsql-15/bin/psql" ]; then
  systemctl stop postgresql || true
  systemctl disable postgresql || true

  dnf remove -y postgresql15 postgresql15-server postgresql15-devel postgresql15-private-devel || true

  dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
  dnf install -y postgresql15-server postgresql15-devel pgvector_15
fi

if [ ! -f "/var/lib/pgsql/15/data/PG_VERSION" ]; then
  /usr/pgsql-15/bin/postgresql-15-setup initdb
fi

systemctl enable --now postgresql-15

echo "========== Configure PostgreSQL auth =========="
PG_HBA="/var/lib/pgsql/15/data/pg_hba.conf"

sed -i -E 's/^(host\s+all\s+all\s+127\.0\.0\.1\/32\s+).*/\1scram-sha-256/' "$PG_HBA"
sed -i -E 's/^(host\s+all\s+all\s+::1\/128\s+).*/\1scram-sha-256/' "$PG_HBA"

systemctl restart postgresql-15

echo "========== Create database and pgvector =========="
sudo -u postgres /usr/pgsql-15/bin/psql -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'CREATE USER opencontractsuser WITH PASSWORD ''Opencontracts@123'''
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='opencontractsuser')\gexec

ALTER USER opencontractsuser WITH PASSWORD 'Opencontracts@123';

SELECT 'CREATE DATABASE opencontractserver OWNER opencontractsuser'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='opencontractserver')\gexec

\c opencontractserver

CREATE EXTENSION IF NOT EXISTS vector;
ALTER DATABASE opencontractserver OWNER TO opencontractsuser;
GRANT ALL ON SCHEMA public TO opencontractsuser;
SQL

echo "========== Create environment file =========="
cat > "$ENV_FILE" <<EOF
SECRET_KEY=django-insecure-opencontracts-ec2-deploy-key
DJANGO_SECRET_KEY=django-insecure-opencontracts-ec2-deploy-key
DEBUG=False
ALLOWED_HOSTS=$EC2_IP,localhost,127.0.0.1
DJANGO_ALLOWED_HOSTS=$EC2_IP,localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://$EC2_IP
CORS_ALLOWED_ORIGINS=http://$EC2_IP
DATABASE_URL=postgres://opencontractsuser:Opencontracts%40123@127.0.0.1:5432/opencontractserver
POSTGRES_DB=opencontractserver
POSTGRES_USER=opencontractsuser
POSTGRES_PASSWORD=Opencontracts@123
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
REDIS_URL=redis://127.0.0.1:6379/0
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
OPENAI_API_KEY=local-test-key
EOF

echo "========== Backend setup =========="
sed -i 's/psycopg2==2.9.12/psycopg2-binary==2.9.12/g' requirements/production.txt

PYBIN=$(command -v python3.11 || command -v python3)

$PYBIN -m venv venv
source venv/bin/activate

pip install --upgrade pip wheel setuptools
pip install --no-cache-dir -r requirements/production.txt
pip install --no-cache-dir django-extensions gunicorn psycopg2-binary

set -a
source "$ENV_FILE"
set +a

python manage.py check
python manage.py migrate --noinput
python manage.py collectstatic --noinput

echo "========== Backend service =========="
cat > /etc/systemd/system/opencontracts-backend.service <<EOF
[Unit]
Description=OpenContracts Django Backend
After=network.target postgresql-15.service redis6.service

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$APP_DIR/venv/bin/gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable opencontracts-backend
systemctl restart opencontracts-backend

echo "========== Frontend setup =========="
cd "$APP_DIR/frontend"

cat > .env.production <<EOF
REACT_APP_USE_AUTH0=false
REACT_APP_USE_ANALYZERS=true
REACT_APP_ALLOW_IMPORTS=true
REACT_APP_API_ROOT_URL=http://$EC2_IP
VITE_API_ROOT_URL=http://$EC2_IP
VITE_USE_AUTH0=false
VITE_USE_ANALYZERS=true
VITE_ALLOW_IMPORTS=true
EOF

cat > .npmrc <<EOF
legacy-peer-deps=true
engine-strict=false
fund=false
audit=false
EOF

rm -rf node_modules
npm cache clean --force

export NODE_OPTIONS="--max-old-space-size=2048"
export npm_config_legacy_peer_deps=true
export npm_config_include=dev
export CI=false

npm install --legacy-peer-deps --include=dev
npm install typescript vite --save-dev --legacy-peer-deps
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

echo "========== Nginx config =========="
cat > /etc/nginx/conf.d/opencontracts.conf <<EOF
server {
    listen 80;
    server_name $EC2_IP;

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
        alias $APP_DIR/staticfiles/;
    }

    location /media/ {
        alias $APP_DIR/media/;
    }
}
EOF

nginx -t
systemctl restart nginx

echo "========== Final check =========="
systemctl is-active --quiet postgresql-15
systemctl is-active --quiet redis6
systemctl is-active --quiet opencontracts-backend
systemctl is-active --quiet nginx

curl -I http://127.0.0.1
curl -I http://127.0.0.1:8000

echo "========== ApplicationStart completed =========="
