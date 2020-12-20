DOCKER_IMAGE=hashicraft/manicminer
DOCKER_VERSION=v0.1.0

build:
	docker build -t ${DOCKER_IMAGE}:${DOCKER_VERSION} --no-cache .

push:
	docker push ${DOCKER_IMAGE}:${DOCKER_VERSION}

run:
	docker run \
	  -it \
		-e HOST=${HOST} \
		-e PORT=${PORT} \
		-e USER=${USER} \
		-e PASSWORD=${PASSWORD} \
		-p 3000:3000 \
	  hashicraft/manicminer:v0.1.0