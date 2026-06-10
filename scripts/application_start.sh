#!/bin/bash
set -e

echo "ApplicationStart started"

# Make sure nginx html folder exists
mkdir -p /usr/share/nginx/html

# Create deployment success page
cat > /usr/share/nginx/html/index.html <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>OpenContracts Cite Deployment</title>
</head>
<body style="font-family: Arial; padding: 40px;">
  <h1>OpenContracts Cite deployed successfully</h1>
  <p>AWS CodePipeline + CodeDeploy to EC2 is working.</p>
  <p>GitHub source connected successfully.</p>
  <p>Server: Amazon Linux EC2 + Nginx</p>
</body>
</html>
EOF

# Configure nginx
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