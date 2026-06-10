FROM node:22-alpine

WORKDIR /app

# node_modules is a named volume; create it owned by the node user
# so npm can write to it without being root
RUN mkdir -p /app/node_modules && chown node:node /app /app/node_modules

USER node
