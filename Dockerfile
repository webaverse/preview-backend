# Use node 4.4.5 LTS
FROM buildkite/puppeteer
ENV LAST_UPDATED 20160605T165400
LABEL description="webaverse-preview-backend"

# Copy source code
COPY . /app

# Change working directory
WORKDIR /app

# Install dependencies
RUN apt update -y
RUN apt install sudo -y
# RUN curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
# RUN sudo yum install nodejs -y
RUN npm install forever -g
# RUN npm install
# RUN npm run setup-chromium
RUN npm install

# Expose API port to the outside
EXPOSE 80

# Launch application
CMD forever -a -l /host/forever.log -o stdout.log -e stderr.log index.js
#  CMD ["npm","start"]
