DOCKER_IMAGE=hashicraft/manicminer
DOCKER_VERSION=v0.1.0

build:
	docker build -t ${DOCKER_IMAGE}:${DOCKER_VERSION} .

push:
	docker push ${DOCKER_IMAGE}:${DOCKER_VERSION}