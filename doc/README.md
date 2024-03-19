# Sheet js

[Google discovery service](https://developers.google.com/discovery/v1/reference/apis/list)  
[Google OAuth2 reference](https://developers.google.com/identity/oauth2/web/reference/js-reference)    
[Google API client reference](https://github.com/google/google-api-javascript-client/blob/master/docs/reference.md)  
[Google Sheets API reference](https://developers.google.com/sheets/api/reference/rest)  

[Google: token model and authentication](https://developers.google.com/identity/oauth2/web/guides/use-token-model)  
[Google: Choose authorization model](https://developers.google.com/identity/oauth2/web/guides/choose-authorization-model)  

[Stackoverflow: API key vs. Client credentials](https://stackoverflow.com/questions/64446566/what-is-the-security-difference-between-api-keys-and-the-client-credentials-flow)  
[Stackoverflow: API key vs. Client id](https://stackoverflow.com/questions/39181501/whats-the-difference-between-api-key-client-id-and-service-account)  

[Script async and defer](https://www.growingwiththeweb.com/2014/02/async-vs-defer-attributes.html#script)  

[ADR: deployment](./adr/deployment.md)  


## Playground

### Init
```js
token = app.services.storage.token()
await app.services.init({ token })
```

### Authenticate
```js
// check authenticated
app.services.authenticator.isSignedIn()

// authenticate
token = await app.services.authenticator.signIn()
app.services.storage.setToken(token)

// revoke token
await app.services.authenticator.signOut()
app.services.storage.clearToken()
```

### Fetch categories
```js
values = await app.services.spreadsheets.getValues({
  spreadsheetId: '1UbJN1IUOu28ujbab_zkdYrPaoIS3uByk3twBACqTxh4',
  range: 'CATX'
})
// error { code: 401, status: 'UNAUTHENTICATED' } if invalid token (revoked or expired)
// error { code: 403, status: 'PERMISSION_DENIED' } if no token
app.datasets.categories = new CategoriesDataset({ values })
```

### Fetch expenses
```js
values = await app.services.spreadsheets.getValues({
  spreadsheetId: '1UbJN1IUOu28ujbab_zkdYrPaoIS3uByk3twBACqTxh4',
  range: 'BAL'
})
// error { code: 401, status: 'UNAUTHENTICATED' } if invalid token (revoked or expired)
// error { code: 403, status: 'PERMISSION_DENIED' } if no token
app.datasets.expenses = new ExpensesDataset({ values })
```

### Render expenses table
```js
app.ui.expenses = new ExpensesTable(ExpensesTable.createElement())
onClicked = console.log.bind(console, 'onClicked')
app.ui.expenses.render({ expenses: app.datasets.expenses, onClicked })

[document.body.querySelector('main')].forEach(main => {
  main.replaceChild(app.ui.expenses.el, main.firstElementChild)
})
```

### Update expenses table
```js
app.ui.expenses.render({ expenses })
```

### Filter expenses table
```js
app.ui.expenses.render({ filter: { } })
app.ui.expenses.render({ filter: { account: 'fee' } })
app.ui.expenses.render({ filter: { month: '2024-01' } })
app.ui.expenses.render({ filter: { account: 'fee', month: '2024-01' } })
```

### Summary dataset
```js
app.datasets.summary = new SummaryToDateDataset({ 
  expenses: app.datasets.expenses, 
  categories: app.datasets.categories,
  yearToDate: new Date()
})
```
### Render summary table
```js
app.ui.summary = new SummaryTable(SummaryTable.createElement())
app.ui.summary.render({ summary: app.datasets.summary })

[document.body.querySelector('main')].forEach(main => {
  main.replaceChild(app.ui.summary.el, main.firstElementChild)
})
```

### Menu
```js
app.ui.menu = new Menu(document.body.querySelector('nav.menu'))
onClicked = console.log.bind(console, 'onClicked')
app.ui.menu.render({
  items: [
    { id: 'login', label: 'Login', onClicked },
    { id: 'logout', label: 'Logout', onClicked },
    { id: 'expenses', label: 'Expenses', onClicked },
    { id: 'summary', label: 'Summary', onClicked },
  ]
})
```
