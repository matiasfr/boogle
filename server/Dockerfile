FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
# su-exec (a tiny Alpine package) lets the start command drop root; see CMD.
RUN apk add --no-cache su-exec && mkdir -p /data && chown -R node:node /data /app
ENV DATA_DIR=/data PORT=9000
EXPOSE 9000
# A Fly volume mounts over /data owned by root: hand it to the node user, then run as node (not root).
CMD ["sh", "-c", "chown node:node \"$DATA_DIR\" && exec su-exec node node src/index.js"]
