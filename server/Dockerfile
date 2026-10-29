FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
# Persistent snapshot dir (mount a volume here); owned by the non-root user.
RUN mkdir -p /data && chown -R node:node /data /app
ENV DATA_DIR=/data PORT=9000
USER node
EXPOSE 9000
CMD ["node", "src/index.js"]
