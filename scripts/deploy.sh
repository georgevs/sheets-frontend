#!/bin/bash

[ -d dist ] || exit 1
pushd dist
touch .nojekyll
rm -rf .git
git init -b gh-pages
git add --all
git commit -m "$(date)"
git push git@github-spamfro:spamfro/sheets-js.git --force gh-pages
popd
