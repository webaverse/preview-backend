FROM nvidia/opengl:1.2-glvnd-runtime-ubuntu20.04
ENV LAST_UPDATED 20160605T165400
LABEL description="webaverse-preview-backend"

# Copy source code
COPY . /app

# Change working directory
WORKDIR /app

# Install dependencies
RUN apt update -y
RUN apt install sudo -y
RUN npm install forever -g
RUN npm install

# Expose API port to the outside
EXPOSE 80
EXPOSE 443

# Launch application
CMD forever -a -l /host/forever.log -o stdout.log -e stderr.log index.js
