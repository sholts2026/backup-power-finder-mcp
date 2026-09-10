FROM node:22-slim

WORKDIR /app

COPY package.json ./
COPY src ./src
COPY data ./data
COPY config ./config
COPY assets ./assets

ENV NODE_ENV=production
ENV PORT=8790
ENV PUBLISHED_APP=backup-power-finder

EXPOSE 8790

CMD ["npm", "start"]
