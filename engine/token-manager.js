'use strict';

/* External services */
const HttpStatus = require('http-status-codes');
const Request = require('request-promise');

/* DB Models */
const Model = require('../models/index');
const Users = Model.Users;
const FbToken = Model.FbToken;
const GaToken = Model.GaToken;

/* Api Handlers */
const FbAPI = require('../api_handler/facebook-api');
const IgAPI = require('../api_handler/instagram-api');
const GaAPI = require('../api_handler/googleAnalytics-api');

/* Dashboard Manager */
const DashboardManager = require('../engine/dashboard-manager');

const D_TYPE = require('../engine/dashboard-manager').D_TYPE;
const DS_TYPE = require('../engine/dashboard-manager').DS_TYPE;

/** VALIDITY AND PERMISSIONS **/
const checkFbTokenValidity = async (req, res) => {
    let key, data;

    try {
        key = await FbToken.findOne({where: {user_id: req.user.id}});

        if (!key) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                name: 'Token not found',
                message: 'Before to check the validity of the Facebook token, you should provide one token instead.'
            })
        }

        data = await FbAPI.getTokenInfo(key['api_key']);

        if (!data['is_valid']) throw new Error(HttpStatus.UNAUTHORIZED.toString());

        return res.status(HttpStatus.OK).send({
            valid: data['is_valid'],
            type: data['type'],
            application: data['application']
        });

    } catch (err) {
        console.error(err);

        if ((err + '').includes(HttpStatus.UNAUTHORIZED.toString())) {
            return res.status(HttpStatus.UNAUTHORIZED).send({
                name: 'Facebook Token Error',
                message: 'The token is no longer valid.'
            });
        }

        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            name: 'Internal Server Error',
            message: 'There is a problem either with Facebook servers or with our database'
        })
    }
};
const checkExistence = async (req, res) => {
    let joinModel;

    switch (parseInt(req.params.type)) {
        case D_TYPE.FB:
        case D_TYPE.IG:
            joinModel = FbToken;
            break;
        case D_TYPE.GA:
        case D_TYPE.YT:
            joinModel = GaToken;
            break;
        default:
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: true,
                message: 'Cannot find a service of type ' + req.params.type + '.'
            })
    }

    try {
        const key = await Users.findOne({where: {id: req.user.id}, include: [{model: joinModel}]});

        if ((key['dataValues']['FbTokens'] && key['dataValues']['FbTokens'].length > 0) ||
            (key['dataValues']['GaTokens'] && key['dataValues']['GaTokens'].length > 0)) {
            return res.status(HttpStatus.OK).send({
                exists: true,
                service: parseInt(req.params.type)
            })
        } else {
            return res.status(HttpStatus.OK).send({
                exists: false,
                service: parseInt(req.params.type)
            });
        }

    } catch (e) {
        console.error(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'An error occurred while checking the existence of a token service.'
        })
    }
};
const permissionGranted = async (req, res) => {
    let response;
    try {
       response = await checkInternalPermission(req.user.id, req.params.type);
       return res.status(HttpStatus.OK).send(response);
    } catch (err) {
        console.error(err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: true,
            message: 'There is a problem with our servers.'
        })
    }
};

const checkInternalPermission = async (user_id, type) => {
    let scopes = [];
    let hasPermission, key;

    if (parseInt(type) === D_TYPE.FB || parseInt(type) === D_TYPE.IG) { // Facebook or Instagram
        key = await FbToken.findOne({where: {user_id: user_id}});
    } else {
        key = await GaToken.findOne({where: {user_id: user_id}});
    }
    console.log("KEY",key);
    if (!key) { // If a key is not set, return error
        console.log('KEY IS NOT SET UP');
        return {
            name: DS_TYPE[parseInt(type)],
            type: parseInt(type),
            granted: false,
            scopes: null
        };
    }

    try {
        switch (parseInt(type)) {
            case D_TYPE.FB: // Facebook
                scopes = (await FbAPI.getTokenInfo(key['api_key']))['data']['scopes'];
                hasPermission = checkFBContains(scopes);
                scopes = scopes.filter(el => !el.includes('instagram'));
                break;
            case D_TYPE.GA: // Google Analytics
                scopes = (await GaAPI.getTokenInfo(key['private_key']))['scope'].split(' ');
                hasPermission = checkGAContains(scopes);
                scopes = scopes.filter(el => !el.includes('yt-analytics') && !el.includes('youtube'));
                break;
            case D_TYPE.IG: // Instagram
                scopes = (await FbAPI.getTokenInfo(key['api_key']))['data']['scopes'];
                hasPermission = checkIGContains(scopes);
                scopes = scopes.filter(el => el.includes('instagram'));
                break;
            case D_TYPE.YT: // YouTube
                scopes = (await GaAPI.getTokenInfo(key['private_key']))['scope'].split(' ');
                hasPermission = checkYTContains(scopes);
                scopes = scopes.filter(el => el.includes('yt-analytics') || el.includes('youtube'));
                break;
            default:
                return {
                    error: true,
                    message: 'The service with id ' + type + ' does not exist.'
                };
        }

        console.log(hasPermission);

        return {
            name: DS_TYPE[parseInt(type)],
            type: parseInt(type),
            granted: hasPermission === 1,
            scopes: hasPermission === 1 ? scopes : null
        };
    }
    catch (e) {
        throw e;
    }
};

const revokePermissions = async (req, res) => {
    let type = parseInt(req.params.type);
    let key;

    if (type === D_TYPE.FB || type === D_TYPE.IG) { // Facebook or Instagram
        key = (await FbToken.findOne({where: {user_id: req.user.id}}))['api_key'];
    } else {
        key = (await GaToken.findOne({where: {user_id: req.user.id}}))['private_key'];
    }

    try {
        switch (type) {
            case D_TYPE.FB:
                await revokeFbPermissions(key);
                await revokeIgPermissions(key);
                await FbToken.destroy({where: {user_id: req.user.id}});
                await DashboardManager.deleteChartsFromDashboardByType(req.user.id, D_TYPE.FB);
                await DashboardManager.deleteChartsFromDashboardByType(req.user.id, D_TYPE.IG);
                break;
            case D_TYPE.IG:
                await revokeIgPermissions(key);
                await DashboardManager.deleteChartsFromDashboardByType(req.user.id, D_TYPE.IG);
                break;
            case D_TYPE.GA:
            case D_TYPE.YT:
                await revokeGaPermissions(key);
                await GaToken.destroy({where: {user_id: req.user.id}});
                await DashboardManager.deleteChartsFromDashboardByType(req.user.id, D_TYPE.GA);
                await DashboardManager.deleteChartsFromDashboardByType(req.user.id, D_TYPE.YT);
                break;
        }

        return res.status(HttpStatus.OK).send({
            revoked: true,
            service: DS_TYPE[type],
            type: type
        })

    } catch (e) {
        console.error(e);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            name: 'Error on revoking permissions',
            message: 'An error occurred while revoking the permissions to the service with id ' + req.params.type
        })
    }
};

/** TOKENS CRUD**/
const readAllKeysById = (req, res) => {

    Users.findOne({
            where: {id: req.user.id},
            include: [
                {model: GaToken},
                {model: FbToken}]
        }
    )
        .then(result => {
            let fb = result.dataValues.FbTokens[0];
            let ga = result.dataValues.GaTokens[0];

            if (fb == null && ga == null)
                return res.status(HttpStatus.NO_CONTENT).send({});

            return res.status(HttpStatus.OK).send({
                user_id: req.user.id,
                fb_token: (fb == null) ? null : fb.dataValues.api_key,     // FB Token
                ga_token: (ga == null) ? null : ga.dataValues.private_key, // GA Token
                ga_view_id: (ga == null) ? null : ga.dataValues.view_id, // GA Token
            });
        })
        .catch(err => {
            console.error(err);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                error: 'Cannot retrieve user tokens.'
            })
        });
};
const insertKey = (req, res) => {
    const service_id = parseInt(req.body.service_id);

    switch (service_id) {
        case D_TYPE.FB: // fb
            return insertFbKey(req, res);
        case D_TYPE.GA: // google
            return insertGaData(req, res);
        default:
            console.log('ERROR TOKEN-MANAGER. Unrecognized service type: ' + service_id);
            return res.status(HttpStatus.BAD_REQUEST).send({
                created: false,
                error: 'Unrecognized service type.'
            });
    }
};
const update = (req, res) => { // TODO sistemare
    console.log(req.body);
    const service_id = parseInt(req.body.api.service_id);
    switch (service_id) {
        case D_TYPE.FB: //fb
            return updateFbKey(req, res);
        case D_TYPE.GA: //google
            return updateGaData(req, res);
        default:
            return res.status(HttpStatus.BAD_REQUEST).send({
                created: false,
                error: 'Unrecognized service type.'
            });
    }

};
const deleteKey = (req, res) => {
    const service_id = parseInt(req.body.service_id);

    switch (service_id) {
        case D_TYPE.FB:
        case D_TYPE.IG:
            return deleteFbKey(req, res);
        case D_TYPE.GA:
        case D_TYPE.YT:
            return deleteGaData(req, res);
        default:
            return res.status(HttpStatus.BAD_REQUEST).send({
                created: false,
                error: 'Unrecognized service type.'
            });
    }
};

const insertFbKey = (req, res) => {
    FbToken.findOne({
        where: {
            user_id: req.user.id,
        }
    }).then(async key => {
        if (key !== null) {
            console.log('ERROR TOKEN-MANAGER. Key already exists.');
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: 'Facebook token already exists'
            })
        }
        else {
            // Get the right token by doing the call to /me/accounts
            const token = await getPageToken(req.body.api_key);

            FbToken.create({
                user_id: req.user.id,
                api_key: token
            })
                .then(new_key => {
                    return res.status(HttpStatus.CREATED).send({
                        created: true,
                        api_key: token
                    });
                })
                .catch(err => {
                    console.log('ERROR TOKEN-MANAGER. Cannot insert the row in db. Details below:');
                    console.error(err);
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        created: false,
                        api_key: token,
                        error: 'Cannot insert the key'
                    });
                })
        }
    })
};
const insertGaData = (req, res) => {
    GaToken.findOne({
        where: {
            user_id: req.user.id,
        }
    }).then(key => {
        if (key !== null) {
            return res.status(HttpStatus.BAD_REQUEST).send({
                error: 'Google Analytics access token already exists!'
            });
        }
        else {
            let user_id = req.user.id;
            let private_key = req.body.private_key;

            GaToken.create({
                user_id: user_id,
                private_key: private_key
            })
                .then(new_key => {
                    return res.status(HttpStatus.CREATED).send({
                        created: true,
                        private_key: new_key.private_key
                    });
                })
                .catch(err => {
                    console.error(err);
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                        created: false,
                        private_key: private_key,
                        error: 'Cannot add new Google Analytics access token.'
                    });
                })
        }
    })
};

const updateFbKey = (req, res) => {
    FbToken.update({
        api_key: req.body.api.api_key
    }, {
        where: {
            user_id: req.user.id
        }
    }).then(up_key => {
        return res.status(HttpStatus.OK).send({
            updated: true,
            api_key: req.body.api.api_key
        })
    }).catch(err => {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            updated: false,
            api_key: req.body.api.api_key,
            error: 'Cannot update the Facebook key'
        })
    })
};
const updateGaData = (req, res) => {
    GaToken.update({
        client_email: req.body.api.client_email,
        private_key: req.body.api.private_key,
        view_id: req.body.api.ga_view_id
    }, {
        where: {
            user_id: req.user.id
        }
    }).then(up_key => {
        return res.status(HttpStatus.OK).send({
            updated: true,
            client_email: req.body.api.client_email,
            private_key: req.body.api.private_key,
            view_id: req.body.api.ga_view_id
        })
    }).catch(err => {
        console.error(err);

        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            updated: false,
            client_email: req.body.api.client_email,
            private_key: req.body.api.private_key,
            view_id: req.body.api.ga_view_id,
            error: 'Cannot update the Google Analytics credentials'
        })
    })
};

const deleteFbKey = (req, res) => {
    FbToken.destroy({
        where: {
            user_id: req.user.id
        }
    }).then(del => {
        return res.status(HttpStatus.OK).send({
            deleted: true,
            message: 'Facebook token deleted successfully'
        })
    }).catch(err => {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            deleted: false,
            error: 'Cannot delete the Facebook key'
        })
    })
};
const deleteGaData = (req, res) => {
    GaToken.destroy({
        where: {
            user_id: req.user.id
        }
    }).then(del => {
        return res.status(HttpStatus.OK).send({
            deleted: true,
            message: 'Google Analytics data deleted successfully'
        })
    }).catch(err => {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            deleted: false,
            error: 'Cannot delete the key'
        })
    })
};

const upsertFbKey = async (user_id, token) => {

    let userFind, result;

    try {
        userFind = await FbToken.findOne({where: {user_id: user_id}});

        // If an occurrence alread exists, then update it, else insert a new row
        if (userFind) {
            result = await FbToken.update({api_key: token}, {where: {user_id: user_id}});
        } else {
            result = await FbToken.create({user_id: user_id, api_key: token});
        }

        return !!result;
    } catch (err) {
        console.error(err);
        return false;
    }
};
const upsertGaKey = async (user_id, token) => {
    let userFind, result;

    try {
        userFind = await GaToken.findOne({where: {user_id: user_id}});

        // If an occurrence alread exists, then update it, else insert a new row
        if (userFind) {
            result = await GaToken.update({private_key: token}, {where: {user_id: user_id}});
        } else {
            result = await GaToken.create({user_id: user_id, private_key: token});
        }

        return !!result;
    } catch (err) {
        console.error(err);
        return false;
    }
};

const getPageToken = async (token) => { // TODO edit
    const options = {
        method: GET,
        uri: 'https://graph.facebook.com/me/accounts',
        qs: {
            access_token: token
        }
    };

    try {
        const response = JSON.parse(await Request(options));
        return response['data'][0]['access_token'];
    } catch (e) {
        console.error(e);
        return null;
    }
};

/** CHECK PERMISSIONS **/
const checkFBContains = (scopes) => {
    const hasManage = scopes.includes('manage_pages');
    const hasInsight = scopes.includes('read_insights');
    const hasAdsRead = scopes.includes('ads_read');

    return hasManage & hasInsight & hasAdsRead;
};
const checkIGContains = (scopes) => {
    const hasBasic = scopes.includes('instagram_basic');
    const hasInsight = scopes.includes('instagram_manage_insights');

    return hasBasic & hasInsight;
};
const checkGAContains = (scopes) => {
    const hasEmail = !!scopes.find(el => el.includes('userinfo.email'));
    const hasAnalytics = !!scopes.find(el => el.includes('analytics.readonly') && !el.includes('yt-analytics.readonly'));

    return hasEmail & hasAnalytics;
};
const checkYTContains = (scopes) => {
    const hasEmail = !!scopes.find(el => el.includes('userinfo.email'));
    const hasYoutube = !!scopes.find(el => el.includes('youtube.readonly'));
    const hasAnalytics = !!scopes.find(el => el.includes('yt-analytics.readonly'));
    const hasMonetary = !!scopes.find(el => el.includes('yt-analytics-monetary.readonly'));

    return hasEmail & hasYoutube & hasMonetary & hasAnalytics;
};

/** REVOKE PERMISSIONS **/
const revokeFbPermissions = async (token) => {
    const scopes = ['manage_pages', 'read_insights', 'ads_read'];
    let scope, result;

    for (const i in scopes) {
        try {
            scope = scopes[i];
            result = await FbAPI.revokePermission(token, scope);
        } catch (e) {
            console.error(e);
            throw new Error('revokeFbPermissions -> error revoking permission ' + scope);
        }
    }

    return true;
};
const revokeGaPermissions = async (token) => { // Token has been expired or revoked.
    let result;

    try {
        result = await GaAPI.revokePermissions(token);
    } catch (e) {
        throw new Error('tokenManager.revokeGaPermissions -> Error on revoking permissions');
    }

    return result;
};
const revokeIgPermissions = async (token) => {
    const scopes = ['instagram_basic', 'instagram_manage_insights'];

    let scope, result;

    for (const i in scopes) {
        try {
            scope = scopes[i];
            result = await IgAPI.revokePermission(token, scope);
        } catch (e) {
            console.error(e);
            throw new Error('revokeFbPermissions -> error revoking permission ' + scope);
        }
    }

    return true;
};

module.exports = {
    readAllKeysById,
    insertKey,
    update,
    deleteKey,
    upsertFbKey,
    upsertGaKey,
    checkExistence,
    permissionGranted,
    revokePermissions,
    checkFbTokenValidity
};