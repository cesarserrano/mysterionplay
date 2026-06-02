FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install \
    && npx prisma generate \
    && npm prune --omit=dev

COPY . .

ENV PORT=3001

EXPOSE 3001

CMD ["npm", "start"]
