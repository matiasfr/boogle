# Built from the repo root (docker build -f server/Dockerfile .): the server host runs the game's lockstep world, so
# the image carries src/world, src/sim and the shared net modules beside server/ (docs/plans/server-host.md, step 7).
# Node 26 runs the .ts modules as they are (type stripping); the root package.json only gives src/ "type": "module".
FROM node:26-alpine
ARG BOOGLE_BUILD=dev
ENV BOOGLE_BUILD=$BOOGLE_BUILD
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force
COPY server/src ./server/src
COPY src/world ./src/world
COPY src/sim ./src/sim
COPY src/ecs ./src/ecs
COPY src/math-pure.ts src/math.ts ./src/
COPY src/net/ids.ts src/net/ws-wire.ts src/net/rtc-wire.ts ./src/net/
# The playtest jump-in seeds (docs/plans/playtest-jump-in.md), built here from this commit's sim so the VM never builds
# one at runtime. About 30 s; each stage's time is in the build log. Set here, not only in fly.toml, since a missing
# JUMP_BUILD means "build at runtime".
RUN node server/src/seeds/prebuild.ts --out server/seeds
ENV JUMP_BUILD=prebuilt
# su-exec (a tiny Alpine package) lets the start command drop root; see CMD.
RUN apk add --no-cache su-exec && mkdir -p /data && chown -R node:node /data /app
ENV DATA_DIR=/data PORT=9000
EXPOSE 9000
# A Fly volume mounts over /data owned by root: hand it to the node user, then run as node (not root). Started as
# non-root already (docker run --user, some hosts): just run.
CMD ["sh", "-c", "[ \"$(id -u)\" != 0 ] && exec node server/src/index.ts; chown node:node \"$DATA_DIR\" 2>/dev/null || true; exec su-exec node node server/src/index.ts"]
