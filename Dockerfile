# Preview per PR: bouwt de Angular-app en start de Node-server op PORT.
FROM node:24-slim AS bouw
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY angular.json tsconfig.json tsconfig.app.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DB_PATH=/app/data/todo.db
COPY package.json ./
COPY server ./server
COPY --from=bouw /app/dist ./dist
RUN mkdir -p /app/data && chown -R node:node /app
USER node
CMD ["node", "server/main.ts"]
