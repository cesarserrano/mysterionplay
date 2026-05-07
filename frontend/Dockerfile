FROM node:22 AS build

WORKDIR /app

ARG APP_COMMIT=unknown
ARG APP_VERSION=0.1.0

ENV APP_COMMIT=$APP_COMMIT
ENV APP_VERSION=$APP_VERSION

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
