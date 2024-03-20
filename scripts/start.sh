#!/bin/bash

docker container run --rm \
  --name node-app \
  --network bridge-dev \
  --ip 172.20.0.100 \
  --user node \
  --workdir /home/node \
  --volume "$PWD/dist:/home/node/app" \
  --volume "$PWD/certs:/home/node/certs" \
  --publish 3443:3443 \
  -d node npx http-server ./app -c-1 --ssl -p 3443 --cert ./certs/cert.pem --key ./certs/cert-key-nopassword.pem
