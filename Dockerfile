ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine
WORKDIR /src
COPY . .
RUN npm ci
EXPOSE 80
CMD ["node", "index.js", "80"]