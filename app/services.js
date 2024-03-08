class Services {
  constructor() {
    this.storage = new Storage(window.localStorage);
  }

  async init({ token } = {}) {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ];
    const discoveryDocs = [
      'https://sheets.googleapis.com/$discovery/rest?version=v4',
    ]
    const tokenClient = window.google.accounts.oauth2.initTokenClient({  // implicit grant flow
      client_id: '588879659786-96ialt5l1bn240naa55eh7gberlo66ds.apps.googleusercontent.com',
      scope: scopes.join(' '),
      prompt: '',  // prompt only the first time
      callback: null
    });

    await new Promise((callback, onerror) => {
      window.gapi.load('client', { callback, onerror });
    });
    await window.gapi.client.init({ discoveryDocs }); // preload apis 

    if (token?.access_token) {
      window.gapi.client.setToken(token);  // pre signin
    }

    this.authenticator = new Authenticator(tokenClient);
    this.spreadsheets = new Spreadsheets(window.gapi.client.sheets);
  }
}


class Authenticator {
  constructor(tokenClient) {
    this.tokenClient = tokenClient;
  }

  isSignedIn() {
    return !!window.gapi.client.getToken();
  }
  
  signIn() {
    return new Promise((resolve, reject) => {
      this.tokenClient.callback = (token) => {
        if (token?.error) { reject(token?.error) }
        else { resolve(token) }
      };
      this.tokenClient.requestAccessToken();
    });
  }

  signOut() {
    return new Promise((resolve, reject) => {
      const credentials = window.gapi.client.getToken();
      if (!credentials) {
        resolve(true);
        return  
      }
      window.gapi.client.setToken(null);
      window.google.accounts.oauth2.revoke(credentials.access_token, ({ error, successful }) => {
        if (error) { reject(error) }
        else { resolve(successful) }
      });
    });
  }
}


class Spreadsheets {
  constructor(sheets) {
    this.sheets = sheets;
  }

  getValues({ spreadsheetId, range }) {
    return this.sheets.spreadsheets.values.get({ spreadsheetId, range })
      .then(({ result: { values }}) => values)
      .catch(({ result: { error }}) => { throw error });
  }
}


class Storage {
  constructor(localStorage) {
    this.localStorage = localStorage;
  }

  token() { return JSON.parse(window.localStorage.getItem('token')) }
  setToken(token) { this.localStorage.setItem('token', JSON.stringify(token)) }
  clearToken() { this.localStorage.removeItem('token') }
}
