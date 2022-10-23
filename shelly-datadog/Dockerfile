FROM library/node:18-slim
WORKDIR /app
COPY package.json ./
RUN npm install
COPY index.js ./
ENTRYPOINT ["node", "."]
