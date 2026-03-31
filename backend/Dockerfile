# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies untuk canvas/buffer jika diperlukan oleh Baileys/QR
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

# Buat folder untuk session WA agar tidak hilang
RUN mkdir -p sessions uploads

EXPOSE 3001

CMD ["npm", "run", "dev"]