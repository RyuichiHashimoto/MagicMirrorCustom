#!/bin/bash


#set -euo
docker container rm -f `docker container ls -aq`
docker image rm karsten13/magicmirror

docker compose up -d --build
