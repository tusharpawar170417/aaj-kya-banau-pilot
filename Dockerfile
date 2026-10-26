FROM node:22-bookworm-slim

WORKDIR /app

ENV EXPO_NO_TELEMETRY=1 \
    WATCHPACK_POLLING=true \
    CHOKIDAR_USEPOLLING=true \
    REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 19000 19001 19002 8081

CMD ["npx", "expo", "start", "--host", "lan", "--port", "8081"]
