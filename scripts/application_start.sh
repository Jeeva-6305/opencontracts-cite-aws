#!/bin/bash
set -e

APP_DIR="/var/www/opencontracts"
ENV_FILE="/etc/opencontracts.env"

echo "========== ApplicationStart started =========="

cd "$APP_DIR"

echo "========== Install server packages =========="
dnf install -y gcc python3-devel postgresql15-devel || true

echo "========== Fix PostgreSQL auth =========="
PG_HBA=$(sudo -u postgres psql -tAc "SHOW hba_file;" | xargs)

echo "Using pg_hba.conf: $PG_HBA"

sed -i -E 's/^(host\s+all\s+all\s+127\.0\.0\.1\/32\s+).*/\1scram-sha-256/' "$PG_HBA" || true
sed -i -E 's/^(host\s+all\s+all\s+::1\/128\s+).*/\1scram-sha-256/' "$PG_HBA" || true
sed -i -E 's/^(local\s+all\s+all\s+).*/\1peer/' "$PG_HBA" || true

systemctl restart postgresql

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='opencontractsuser'" | grep -q 1 || sudo -u postgres psql -c "CREATE USER opencontractsuser WITH PASSWORD 'Opencontracts@123';"
sudo -u postgres psql -c "ALTER USER opencontractsuser WITH PASSWORD 'Opencontracts@123';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='opencontractserver'" | grep -q 1 || sudo -u postgres createdb -O opencontractsuser opencontractserver

sudo -u postgres psql -d opencontractserver -c "ALTER DATABASE opencontractserver OWNER TO opencontractsuser;"
sudo -u postgres psql -d opencontractserver -c "GRANT ALL ON SCHEMA public TO opencontractsuser;"

echo "========== Ensure environment file =========="
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
OPENAI_API_KEY=local-test-key
EOF

echo "========== Backend setup =========="
sed -i 's/psycopg2==2.9.12/psycopg2-binary==2.9.12/g' requirements/production.txt || true

python3 -m venv venv
source venv/bin/activate

pip install --upgrade pip wheel setuptools
pip install --no-cache-dir -r requirements/production.txt
pip install --no-cache-dir django-extensions gunicorn psycopg2-binary

set -a
source "$ENV_FILE"
set +a

echo "========== Install pgvector extension =========="

dnf install -y git gcc make postgresql15-devel postgresql15-server || true

PG_CONFIG=$(command -v pg_config || find /usr -name pg_config | head -n 1)

if [ -z "$PG_CONFIG" ]; then
  echo "ERROR: pg_config not found. PostgreSQL development package is missing."
  exit 1
fi

echo "Using PG_CONFIG=$PG_CONFIG"

if [ ! -f "/usr/share/pgsql/extension/vector.control" ]; then
  rm -rf /tmp/pgvector
  git clone https://github.com/pgvector/pgvector.git /tmp/pgvector
  cd /tmp/pgvector
  make PG_CONFIG="$PG_CONFIG"
  make install PG_CONFIG="$PG_CONFIG"
fi

sudo -u postgres psql -d opencontractserver -c "CREATE EXTENSION IF NOT EXISTS vector;"
cd "$APP_DIR"
python manage.py check || true
python manage.py migrate --noinput
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

rm -rf node_modules

npm cache clean --force || true
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