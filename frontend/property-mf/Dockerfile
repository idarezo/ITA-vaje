FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG API_BASE_URL=http://localhost:4000
ARG PUBLIC_PATH=http://localhost:3031/
ENV API_BASE_URL=$API_BASE_URL
ENV PUBLIC_PATH=$PUBLIC_PATH
RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
