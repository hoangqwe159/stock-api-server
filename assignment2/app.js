require('dotenv').config()

var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var swaggerUI = require('swagger-ui-express');
var docsRouter = require('./routes/docs')
var usersRouter = require('./routes/users');
var stocksRouter = require('./routes/stocks');
var app = express();

//Setup morgan
logger.token('req', (req, res) => JSON.stringify(req.headers))
logger.token('res', (req, res) => {
 const headers = {}
 res.getHeaderNames().map(h => headers[h] = res.getHeader(h))
 return JSON.stringify(headers)
})
app.use(logger('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Setup database
const options = require('./database/knexfile');
const knex = require('knex')(options);
knex.schema.hasTable('users').then((exist) => {
  if(!exist){
    return knex.schema.createTable('users', (table) => {
      table.string('email', 100).primary()
      table.string('password', 100)
    })
  }
});
app.use((req, res, next) => {
  req.db = knex;
  next();
});

// Setup route
app.use('/', swaggerUI.serve)
app.use('/', docsRouter);
app.use('/user', usersRouter);
app.use('/stocks', stocksRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.status(400).json({"error":true,"message":"Not Found"})
});



module.exports = app;
