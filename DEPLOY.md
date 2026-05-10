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
- **PUT /api/social/:id** - Atualiza status/informações de um post (requer ADMIN_TOKEN)

### Acessar no Admin
1. Vá para /admin
2. Clique na aba "Ritual Social"
3. Visualize os posts gerados para o dia
4. Use o botão "Copiar" para copiar cada post
5. Clique em "Status" para mudar o status e registrar publicação

### Gerenciamento Manual de Status

Cada post pode ter um dos 4 status:

| Status | Cor | Significado |
|--------|-----|-------------|
| **draft** | Cinza | Rascunho, não pronto |
| **ready** | Âmbar | Pronto para publicar |
| **posted** | Verde | Já foi publicado |
| **skipped** | Slate | Pulado/cancelado |

Ao marcar como **posted**, você pode:
- Registrar quem publicou (opcional)
- Sistema salva automaticamente data/hora de publicação
- Se tiver ID externo, registrar também

### Estrutura de Posts
Cada post contém:
- **time**: Horário de publicação (00:00, 09:00, 21:00, etc)
- **platform**: x, instagram_feed, instagram_story, tiktok
- **type**: main, hint_1, hint_final, stat, mid_hint, ranking
- **status**: draft, ready, posted, skipped
- **publishMode**: manual (futuramente: automatic)
- **text**: Conteúdo do post
- **postedAt**: Timestamp de quando foi publicado
- **postedBy**: Quem publicou (manual ou username do bot)
- **externalPostId**: ID do post na plataforma (futura integração)
- **errorMessage**: Se houve erro na publicação automática

### Ritual Diário
- **00:00** (Obrigatório) - Post principal para X/Twitter e Instagram Feed
- **09:00** (Obrigatório) - Primeira dica para X/Twitter e Story
- **21:00** (Obrigatório) - Última dica para X/Twitter e Story
- **12:00** (Opcional) - Observação/estatística
- **15:00** (Opcional) - Dica intermediária
- **18:00** (Opcional) - Ranking/parcial/atmosfera

### Workflow Atual (Manual)
1. Sistema gera posts automaticamente ao acessar /admin
2. Admin visualiza o plano do dia no "Ritual Social"
3. Admin copia texto de cada post
4. Admin publica manualmente em X/Instagram/TikTok
5. Volta ao admin e marca post como "posted"
6. Sistema registra horário e autor da publicação

### Futura Integração Automática
Quando integrarmos APIs:
1. Posts terão `publishMode: "automatic"`
2. Sistema publicará nos horários corretos
3. IDs externos salvos em `externalPostId`
4. Histórico completo mantido em `postedAt` / `postedBy` / `status`
5. Diferenciação clara entre posts manuais e automáticos

### Tone Guidelines
Os textos são gerados automaticamente com o tom do projeto:
- Frases curtas
- Seco, estranho, atmosférico
- Arquivo digital, internet antiga
- Sem CTA agressivo
- Sem "venha jogar", "viral", "desafie amigos", emojis excessivos
