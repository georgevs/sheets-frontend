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

### Test values
```js
values = JSON.parse(
  `[
    [ "DT", "AMNT", "ACCT" ],
    [ "2024-02-29", 100.75, "food" ],
    [ "2024-02-27", 200.75, "games" ],
    [ "2024-02-26", 300.75, "fitness" ],
    [ "2024-02-26", 400.75, "food" ],
    [ "2024-02-25", 500.75, "leisure" ],
    [ "2024-02-23", 600.75, "fee" ],
    [ "2024-01-19", 10.75, "food" ],
    [ "2024-01-17", 20.75, "games" ],
    [ "2024-01-16", 30.75, "fitness" ],
    [ "2024-01-16", 40.75, "food" ],
    [ "2024-01-15", 50.75, "leisure" ],
    [ "2024-01-13", 60.75, "fee" ],
    [ "2023-01-19", 1.75, "food" ],
    [ "2023-01-17", 2.75, "games" ],
    [ "2023-01-16", 3.75, "fitness" ],
    [ "2023-01-16", 4.75, "food" ],
    [ "2023-01-15", 5.75, "leisure" ],
    [ "2023-01-13", 6.75, "fee" ]
  ]`
)
app.datasets.expenses = new ExpensesDataset({ values })
```

### Render expenses table
```js
onClicked = console.log.bind(console, 'onClicked')
app.ui.expenses = new ExpensesTable(ExpensesTable.createElement())
  .render({ expenses: app.datasets.expenses, onClicked })
document.body.replaceChild(app.ui.expenses.el, document.body.querySelector('.label-loading'))
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
  .render({ summary: app.datasets.summary })
document.body.replaceChild(app.ui.summary.el, document.body.querySelector('.label-loading'))
```

### Swap tables
```js
document.body.replaceChild(app.ui.summary.el, app.ui.expenses.el)
document.body.replaceChild(app.ui.expenses.el, app.ui.summary.el)
```

### Menu
```js
onClicked = console.log.bind(console, 'onClicked')
app.ui.menu = new Menu(document.body.querySelector('nav.menu'))
  .render({
    visible: true,
    items: [
      { id: 'login', label: 'Login', onClicked },
      { id: 'logout', label: 'Logout', onClicked },
      { id: 'expenses', label: 'Expenses', onClicked },
      { id: 'summary', label: 'Summary', onClicked },
    ]
  })
```
