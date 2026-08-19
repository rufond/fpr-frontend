FROM node:24-alpine AS build

WORKDIR /src

COPY package.json .npmrc ./
RUN npm install

COPY . .

RUN npm run generate

FROM nginx:alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/.output/public /usr/share/nginx/html

EXPOSE 80
