#!/bin/bash

mkdir -p ./dist
rm -rf ./dist/*

cp ./src/index.* ./dist
tar -cC ./data demo | tar -xvC ./dist

find ./src -type f -name '*.js' | xargs cat > ./dist/app.js
HASH=`md5sum ./dist/app.js` ; \
  mv ./dist/app.js ./dist/app${HASH:0:5}.js ; \
  sed -i "s/__app.js__/app${HASH:0:5}.js/g" ./dist/index.html
