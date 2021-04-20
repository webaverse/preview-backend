FROM buildkite/puppeteer:latest

# Create app directory
WORKDIR /usr/src/app

ENV PATH /usr/src/app/node_modules/.bin:$PATH

COPY package.json .
COPY package-lock.json .

RUN npm install

# Bundle app source
COPY . .

EXPOSE 80
EXPOSE 443
EXPOSE 8080
EXPOSE 8443

CMD [ "npm", "run start-proxied" ]
