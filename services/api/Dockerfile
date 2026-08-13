FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev || true
COPY src ./src
EXPOSE 4100
CMD ["node", "src/index.js"]
