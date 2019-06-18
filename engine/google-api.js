'use strict';

const _ = require('lodash');
const moment = require('moment');
const {google} = require('googleapis');
const Request = require('request-promise');
const HttpStatus = require('http-status-codes');

const METRICS = {
    SESSIONS: 'ga:sessions',
    PAGE_VIEWS: 'ga:pageviews',
    BOUNCE_RATE: 'ga:bounceRate',
    AVG_SESSION_DURATION: 'ga:avgSessionDuration',
    USERS: 'ga:users',
    NEW_USERS: 'ga:newUsers',
    PAGE_LOAD_TIME: 'ga:pageLoadTime',
    PERCENT_NEW_SESSIONS: 'ga:percentNewSessions'
};
const DIMENSIONS = {
    DATE: 'ga:date',
    COUNTRY: 'ga:country',
    BROWSER: 'ga:browser',
    MEDIUM: 'ga:medium',
    PAGE_PATH: 'ga:pagePath',
    MEDIUM_DATE: 'ga:date, ga:medium',
    BROWSER_DATE: 'ga:date, ga:browser',
    PAGE_DATE: 'ga:date, ga:pagePath',
    COUNTRY_DATE: 'ga:date, ga:country',
    MOBILE_DEVICE_DATE: 'ga:date, ga:mobileDeviceMarketingName',
};
const SORT = {
    PAGE_VIEWS_DESC: '-ga:pageviews'
};
const CONFIG = {
    "refresh_token": "1/ytPwEtCv8L7nohqBvdyz6J08kVWfbzlZj7zYxLVoLPM",
    "view_id": 148300250,
    "client_id" : "958672078442-oj196jlgdvp1omiaupersad1ij42ji1i.apps.googleusercontent.com",
    "client_secret": "97Q15SlQYrQN4oqv9tsF04JY",
};

const setMetrics = (metrics, dimensions, sort = null, filters = null) => {
    return function (req, res, next) {
        req.metrics = metrics;
        req.dimensions = dimensions;
        req.sort = sort;
        req.filters = filters;
        next();
    }
};

const getAccessToken = async () => {
    const options = {
        method: 'POST',
        uri: 'https://www.googleapis.com/oauth2/v4/token',
        qs: {
            client_id: CONFIG.client_id,
            client_secret: CONFIG.client_secret,
            refresh_token: CONFIG.refresh_token,
            grant_type: 'refresh_token'
        }
    };

    return JSON.parse(await Request(options))['access_token'];
};

const getApiData = async (metrics, dimensions, sort = null, filters = null) => {
    const access_token = await getAccessToken();

    let params = {
        'access_token': access_token,
        'ids': 'ga:' + CONFIG.view_id,
        'start-date': '90daysAgo',
        'end-date': 'today',
        'metrics': metrics,
        'dimensions': dimensions
    };

    // Optional fields: if they exist, then they can be added to the query params
    if (sort) params['sort'] = sort;
    if (filters) params['filters'] = filters;

    return (await google.analytics('v3').data.ga.get(params)).data.rows;
};

const ga_getData = async (req, res) => {
    let data;

    try {
        data = await getApiData(req.metrics, req.dimensions, req.sort, req.filters);
        data = _.map(data, el => [new Date(moment.utc(el[0])), parseInt(el[1], 10)]);

        return res.status(HttpStatus.OK).send(data);
    } catch (err) {
        console.error(err);
        if (err.statusCode === 400) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                name: 'Google Analytics Bad Request',
                message: 'Invalid access token.'
            });
        }

        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            name: 'Internal Server Error',
            message: 'There is a problem either with Google servers or with our database'
        });
    }
};

/** EXPORTS **/
module.exports = {ga_getData, setMetrics, METRICS, DIMENSIONS, SORT};