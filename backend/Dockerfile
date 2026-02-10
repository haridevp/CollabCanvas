FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache python3 make g++ \
  && npm ci

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
