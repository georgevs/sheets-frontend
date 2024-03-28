# Sheets js 

## Manage secrets
### Fetch secrets
```
openssl enc -d -aes-128-cbc -pbkdf2 -salt -in ~/ws-archive/secrets.pilot.tar.gz.enc | tar xzv
```

## Build
```bash
chmod ugo+x ./scripts/build.sh
./scripts/build.sh
```

## Run the app locally

### Install live certificates
```
openssl enc -aes-128-cbc -pbkdf2 -salt -d -in ~/ws-archive/certs.tar.gz.enc | tar xzv
```
### Start web server in Docker
```
chmod ugo+x ./scripts/start.sh
./scripts/start.sh
```
Open site at https://xps.spamfro.site:3443 (in LAN) or https://local.spamfro.site:3443 (with forward proxy)

## Run the app in GitHub pages

### Push source subtree into GitHub
```
git subtree split -p playground/google-apis/sheets-js -b github/sheets-js
git push git@github.com:spamfro/sheets-js.git github/sheets-js:main
```

### Deploy to GitHub pages
```
git subtree split -p playground/google-apis/sheets-js/dist -b gh-pages/sheets-js
git push git@github.com:spamfro/sheets-js.git gh-pages/sheets-js:gh-pages
```
Open site at https://spamfro.site/sheets-js
