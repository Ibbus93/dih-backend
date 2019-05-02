'use strict';
const DateFns = require('date-fns');

const Model = require('../../models/index');
const GaToken = Model.GaToken;

const TokenManager = require('../token-manager');
const HttpStatus = require('http-status-codes');

const site_URL = require('../../app').config['site_URL'];

const MongoManager = require('../mongo-manager');

const DAYS = {
    yesterday: 1,
    min_date: 90
};


/***************** GOOGLE ANALYTICS *****************/
const GoogleApi = require('../../api_handler/googleAnalytics-api');

const setMetrics = (metrics, dimensions, sort = null, filters = null) => {
    return function (req, res, next) {
        req.metrics = metrics;
        req.dimensions = dimensions;
        req.sort = sort;
        req.filters = filters;
        next();
    }
};

const ga_login_success = async (req, res) => {
    const user_id = req.query.state;
    const token = req.user.refreshToken;

    try {
        const upserting = await TokenManager.upsertGaKey(user_id, token);

        res.redirect((site_URL.includes('localhost') ? 'http://localhost:4200' : 'https://www.doutdes-cluster.it/prealpha') + '/#/preferences/api-keys?err=false');
    } catch (err) {
        console.error(err);
    }
};

//
// const ga_storeAllData = async () => {
//     let user_id = 2;
//     try {
//
//     }
//     catch (e) {
//
//     }
// }

// const funzione (user_id){
//     ga_getDataInternal(user_id, metrics)
// }

const ga_getDataInternal = async (user_id, metrics, dimensions, sort = null, filters = null) => {
    let key;
    let response;
    let data;
    let old_startDate;
    let old_endDate;
    let old_date;
    let start_date = new Date(DateFns.subDays(DateFns.subDays(new Date(),DAYS.yesterday).setUTCHours(0,0,0,0), DAYS.min_date));
    let end_date = new Date(DateFns.subDays(new Date().setUTCHours(0,0,0,0), DAYS.yesterday)); // yesterday

    try {
        //get the start date of the mongo document if exists
        key = await GaToken.findOne({where: {user_id: user_id}});
        old_date = await MongoManager.getGaMongoItemDate(user_id, key.view_id, metrics, dimensions);

        old_startDate = old_date.start_date;
        old_endDate = old_date.end_date;

        //check if the previous document exist and create a new one
        if (old_startDate == null) {
            data = await getAPIData(user_id, metrics, dimensions, start_date, end_date, sort, filters);
            await MongoManager.storeGaMongoData(user_id, key.view_id, metrics, dimensions, start_date.toISOString().slice(0, 10),
                end_date.toISOString().slice(0, 10), data);

            return data;
        }
        //check if the start date is below our start date. If yes, delete the previous document and create a new one.
        else if (old_startDate > start_date) {
            //chiedere dati a Google e accertarmi che risponda
            data = await getAPIData(user_id, metrics, dimensions, start_date, end_date, sort, filters);
            await MongoManager.removeGaMongoData(user_id, key.view_id, metrics, dimensions);
            await MongoManager.storeGaMongoData(user_id, key.view_id, metrics, dimensions, start_date.toISOString().slice(0, 10),
                end_date.toISOString().slice(0, 10), data);

            return data;
        }
        else if (old_endDate < end_date) {
            data = await getAPIData(user_id, metrics, dimensions, new Date(DateFns.addDays(old_endDate, 1)), end_date, sort, filters);
            await MongoManager.updateGaMongoData(user_id, key.view_id, metrics, dimensions, start_date.toISOString().slice(0, 10),
                end_date.toISOString().slice(0, 10), data);
        }

        response = await MongoManager.getGaMongoData(user_id, key.view_id, metrics, dimensions);
        return response;
    }
    catch (err) {
        throw err;
    }
};

const ga_getData = async (req, res) => {

        try {
            let response = await ga_getDataInternal(req.user.id, req.metrics, req.dimensions, req.sort, req.filters);
            return res.status(HttpStatus.OK).send(response);
        }
        catch (err) {
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
    }
;

const ga_getScopes = async (req, res) => {
    let key;
    let scopes;

    try {
        key = await GaToken.findOne({where: {user_id: req.user.id}});

        if (!key) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                name: 'Token not available',
                message: 'Before get the scopes of the Google token, you should provide an access token instead.'
            })
        }

        scopes = await GoogleApi.getTokenInfo(key.private_key);

        return res.status(HttpStatus.OK).send({
            scopes: scopes
        });
    } catch (e) {
        console.error(e);
        if (e.statusCode === 400) {
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

const ga_viewList = async (req, res) => {
    let key, data, index, view_id, result = [];

    try {
        key = await GaToken.findOne({where: {user_id: req.user.id}});
        data = await GoogleApi.getViewList(key.private_key);

        for(const i in data.accountList) {

            index = data.profileList.findIndex(el => el.accountId == data.accountList[i]['id']);
            view_id = data.profileList[index]['id'];

            result.push({
                id: view_id,
                name: data.accountList[i]['name']
            });
        }

        return res.status(HttpStatus.OK).send(result);
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

//get the data from the google analytics API
async function getAPIData(userid, metric, dimensions, start_date, end_date, sort, filters) {
    let key;
    let data;
    try {
        key = await GaToken.findOne({where: {user_id: userid}});
        data = await GoogleApi.getData(key.private_key, key.view_id, start_date.toISOString().slice(0, 10),
            end_date.toISOString().slice(0, 10), metric, dimensions, sort, filters);
    }
    catch (e) {
        console.error(e);
        throw new Error("getAPIData - error retrieving data from Google API");
    }
    return data;
}
/** EXPORTS **/
module.exports = {setMetrics, ga_login_success, ga_getData, ga_getScopes, ga_viewList};