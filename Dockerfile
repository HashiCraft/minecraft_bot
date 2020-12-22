FROM node:buster-slim

RUN apt-get update && apt-get install -y xserver-xorg-dev libxi-dev libxext-dev

RUN mkdir /app
WORKDIR  /app

COPY . /app/
RUN npm install

ENTRYPOINT [ "node", "index.js"]