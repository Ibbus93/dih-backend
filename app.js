const express = require('express');

/** Building system constants **/
const app = express();

/** Export of app, passport and the right configuration **/
module.exports = app;

/** Configuration of express and routes **/
require('./config/express')(app);
require('./config/routes')(app);
