# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev
ENV NODE_ENV=development
COPY tsconfig.json ./
COPY src ./src
COPY views ./views
COPY public ./public
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM base AS prod
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY views ./views
COPY public ./public
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
