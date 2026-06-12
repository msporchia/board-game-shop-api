# Dev-shaped image. Source is bind-mounted by docker-compose for live reload.
# TODO Phase 5: multi-stage production build (tsc -> node:22-alpine runtime, no dev deps).
FROM node:22-alpine

WORKDIR /app

# Install dependencies from the lockfile for reproducible builds. Copying only
# the manifests first keeps this layer cached across source-only changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
