'use strict';

/**
 * Module dependencies.
 */

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
let path   = require('path');
let helmet = require('helmet');
let logger = require('morgan');

module.exports = function (app) {

    // use helmet
    app.use(helmet());

    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({extended: false}));
    app.use(cookieParser());
    app.use(express.static(path.join(__dirname, '..') + '/public'));

    // enabling cors
    app.use(cors());

    // error handler
    app.use(function (err, req, res, next) {
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500);
        res.render('error');
    });
};