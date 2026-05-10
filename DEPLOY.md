# Deploy MysterionPlay

## Caminho
/srv/mysterionplay

## Atualizar aplicacao
cd /srv/mysterionplay
git pull
APP_COMMIT=$(git rev-parse --short HEAD) APP_VERSION=0.1.0 \
POSTGRES_DB=mysterionplay \
POSTGRES_USER=mysterion \
POSTGRES_PASSWORD=troque-por-uma-senha-forte \
DATABASE_URL=postgresql://mysterion:troque-por-uma-senha-forte@postgres:5432/mysterionplay \
ADMIN_TOKEN=troque-por-um-token-forte \
ADMIN_SESSION_SECRET=troque-por-um-segredo-forte \
APP_TIMEZONE=America/Sao_Paulo \
docker compose up -d --build

## Verificar containers
docker ps
docker compose logs --tail=100 postgres
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
O login cria uma sessao via cookie HttpOnly.

## Uploads
Imagens enviadas pelo admin saem em /api/uploads/...

## Ritual Social (Automação de Posts)

### Endpoints
- **GET /api/social/today** - Retorna plano social do dia (gera automaticamente se não existir)
- **GET /api/social/:date** - Retorna plano social de uma data específica (formato: YYYY-MM-DD)
- **POST /api/social/generate/:date** - Gera/regenera plano social de uma data (requer ADMIN_TOKEN)

### Acessar no Admin
1. Vá para /admin
2. Clique na aba "Ritual Social"
3. Visualize os posts gerados para o dia
4. Use o botão "Copiar texto" para copiar cada post
5. Indicadores mostram quais posts são obrigatórios (00:00, 09:00, 21:00)

### Estrutura de Posts
Cada post contém:
- **time**: Horário de publicação (00:00, 09:00, 21:00, etc)
- **platform**: x, instagram_feed, instagram_story, tiktok
- **type**: main, hint_1, hint_final, stat, mid_hint, ranking
- **status**: draft, ready, posted, skipped
- **text**: Conteúdo do post em tom noir/atmosférico
- **link**: URL para mysterionplay.com.br
- **imageUrl**: Opcional, para imagens

### Ritual Diário
- **00:00** (Obrigatório) - Post principal para X/Twitter e Instagram Feed
- **09:00** (Obrigatório) - Primeira dica para X/Twitter e Story
- **21:00** (Obrigatório) - Última dica para X/Twitter e Story
- **12:00** (Opcional) - Observação/estatística
- **15:00** (Opcional) - Dica intermediária
- **18:00** (Opcional) - Ranking/parcial/atmosfera

### Tone Guidelines
Os textos são gerados automaticamente com o tom do projeto:
- Frases curtas
- Seco, estranho, atmosférico
- Arquivo digital, internet antiga
- Sem CTA agressivo
- Sem "venha jogar", "viral", "desafie amigos", emojis excessivos

### Futura Integração
O sistema está pronto para integração com APIs externas:
1. Implementar conectores para X, Instagram, TikTok
2. Adicionar campo `accountId` a cada post
3. Usar endpoints POST para publicar automaticamente
4. Manter histórico em status "posted"
5. Configurar scheduler para publicar nos horários corretos
