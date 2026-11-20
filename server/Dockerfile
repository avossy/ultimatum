FROM node:20-alpine
LABEL authors="Yaroslava Semenova"
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
