'use strict';
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
// const FILTER = {
//     SESSIONS_GT_1: 'ga:sessions>1',
//     SESSIONS_GT_5: 'ga:sessions>5',
//     PAGE_LOAD_TIME_GT_0: 'ga:pageLoadTime>0'
// };

const config = {
    "refresh_token": '',
    "view_id": '',
    "client_id": '',
    "client_secret": '',
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

// TODO create new app GA
const getAccessToken = async () => {
    const options = {
        method: 'POST',
        uri: 'https://www.googleapis.com/oauth2/v4/token',
        qs: {
            client_id: config.client_id,
            client_secret: config.client_secret,
            refresh_token: config.refresh_token,
            grant_type: 'refresh_token'
        }
    };

    return JSON.parse(await Request(options))['access_token'];
};

const getApiData = async (metrics, dimensions, sort = null, filters = null) => {
    const access_token = await getAccessToken();

    let params = {
        'access_token': access_token,
        'ids': 'ga:' + config.view_id,
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
module.exports = {ga_getData, setMetrics, METRICS, DIMENSIONS, SORT}; //, FILTER};