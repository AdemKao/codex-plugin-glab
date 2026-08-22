FROM node:22-alpine AS build
WORKDIR /app
COPY packages/mcp-server/package.json ./package.json
RUN npm install
COPY packages/mcp-server/tsconfig.json ./tsconfig.json
COPY packages/mcp-server/src ./src
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY packages/mcp-server/package.json ./package.json
RUN npm install --omit=dev && npm cache clean --force \
    && mkdir -p /data \
    && chown -R node:node /data
COPY --from=build /app/dist ./dist
VOLUME ["/data"]
USER node
EXPOSE 3333
CMD ["node", "dist/server.js"]
