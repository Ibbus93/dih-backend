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
};