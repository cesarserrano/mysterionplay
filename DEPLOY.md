# Deploy MysterionPlay

## Caminho
/srv/mysterionplay

## Atualizar aplicacao
cd /srv/mysterionplay
git pull
APP_COMMIT=$(git rev-parse --short HEAD) APP_VERSION=0.1.0 ADMIN_TOKEN=troque-isso APP_TIMEZONE=America/Sao_Paulo docker compose up -d --build

## Verificar containers
docker ps
docker compose logs --tail=100 frontend
docker compose logs --tail=100 backend

## Verificar Nginx
nginx -t

## Dominio
mysterionplay.com.br -> Nginx -> localhost:3000 -> container mysterion_frontend

## API
Adicione no Nginx da VPS:

location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
}

## Admin
/admin usa o mesmo frontend.
Defina um ADMIN_TOKEN forte no deploy.
