FROM golang:latest

USER root

# Install kubectl, kubeadm
ENV KUBERNETES_VERSION="1.11.3"
RUN curl -L https://storage.googleapis.com/kubernetes-release/release/v${KUBERNETES_VERSION}/bin/linux/amd64/kubectl -o /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl

RUN curl -L https://storage.googleapis.com/kubernetes-release/release/v${KUBERNETES_VERSION}/bin/linux/amd64/kubeadm -o /usr/local/bin/kubeadm \
    && chmod +x /usr/local/bin/kubeadm

# Install Docker
ENV DOCKER_VERSION="18.06.1"

RUN apt-get update && \
    apt-get install -qq -y --no-install-recommends \
      apt-transport-https \
      ca-certificates \
      curl \
      gnupg2 \
      software-properties-common \
      xz-utils

RUN curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add - && \
    apt-key fingerprint 0EBFCD88 && \
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian stretch stable" && \
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian stretch stable" && \
    apt-get update && \
    apt-get install -qq -y --no-install-recommends docker-ce=${DOCKER_VERSION}~ce~3-0~debian

ARG DOCKER_COMPOSE_VERSION="1.21.1"
RUN curl -L https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose

# Install Node.js
ENV NODEJS_VERSION="10.15.0"
RUN curl -fsSLO --compressed "https://nodejs.org/dist/v${NODEJS_VERSION}/node-v${NODEJS_VERSION}-linux-x64.tar.xz"
RUN tar -xJvf node-v${NODEJS_VERSION}-linux-x64.tar.xz -C /tmp
RUN cp -R /tmp/node-v${NODEJS_VERSION}-linux-x64/* /usr/local

# Install Yarn package manager
RUN npm install --global yarn

# Install kind (kubernetes in docker)
RUN go get sigs.k8s.io/kind

# Cleanup
RUN apt-get clean \
    && rm -rf /tmp/* ~/*.tgz \
    && rm -rf /var/cache/apk/*

# Verify that everything has been installed
RUN kubectl version --client
RUN docker -v
RUN docker-compose -v
RUN node -v
RUN npm -v
RUN yarn -v
RUN go version

# copy static files
WORKDIR /usr/app

COPY package.json package.json
COPY yarn.lock yarn.lock
RUN yarn install

COPY . .
RUN yarn build

RUN chmod +x docker-run-tests.sh

ENTRYPOINT ["/usr/app/docker-run-tests.sh"]