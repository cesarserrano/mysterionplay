# Deploy MysterionPlay

## Caminho
/srv/mysterionplay

## Atualizar site
cd /srv/mysterionplay
git pull
docker compose up -d --build

## Verificar containers
docker ps

## Verificar Nginx
nginx -t

## Domínio
mysterionplay.com.br → Nginx → localhost:3000 → container mysterion_frontend
