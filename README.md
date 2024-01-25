# Sheets js 

<img src="./adr/images/workspace.drawio.svg" width="500px" />

## Reference
[Google: Choose authz model](https://developers.google.com/identity/oauth2/web/guides/choose-authorization-model)  
[Stackoverflow: API key vs. Client credentials](https://stackoverflow.com/questions/64446566/what-is-the-security-difference-between-api-keys-and-the-client-credentials-flow)  
[Stackoverflow: API key vs. Client id](https://stackoverflow.com/questions/39181501/whats-the-difference-between-api-key-client-id-and-service-account)  
[Google API client reference](https://github.com/google/google-api-javascript-client/blob/master/docs/reference.md)  
[Google Sheets API reference](https://developers.google.com/sheets/api/reference/rest)  

## Manage secrets
### Fetch secrets
```
openssl enc -d -aes-128-cbc -pbkdf2 -salt -in ~/ws-archive/secrets.tar.gz.enc | tar xzv
```

## Run the app locally

### Install live certificates
```
openssl enc -aes-128-cbc -pbkdf2 -salt -d -in ~/ws-archive/certs.tar.gz.enc | tar xzv
```
### Start web server in Docker
```
docker container run --rm \
  --name node-app \
  --network bridge-dev \
  --ip 172.20.0.100 \
  --user node \
  --workdir /home/node \
  --volume "$PWD/app:/home/node/app" \
  --volume "$PWD/certs:/home/node/certs" \
  --publish 3443:3443 \
  node npx http-server ./app -c-1 --ssl -p 3443 --cert ./certs/cert.pem --key ./certs/cert-key-nopassword.pem
```
Open site at https://xps.spamfro.site:3443

## Run the app in GitHub pages

### Push source subtree into GitHub
```
git subtree split --prefix=playground/google-apis/sheets-js -b github/sheets-js
git push git@github-spamfro:spamfro/sheets-js.git github/sheets-js:main
```

### Deploy to GitHub pages
```
git subtree split --prefix=playground/google-apis/sheets-js/app -b gh-pages/sheets-js
git push git@github-spamfro:spamfro/sheets-js.git gh-pages/sheets-js:gh-pages
```
Open site at https://spamfro.site/sheets-js
