const GA = require('../engine/google-api');
const GAM = require('../engine/google-api').METRICS;
const GAD = require('../engine/google-api').DIMENSIONS;
const GAS = require('../engine/google-api').SORT;
// const GAF = require('../engine/google-api').FILTER;

module.exports = function (app) {

    /* PATHs */
    let indexPath = "/";
    let gaPath = indexPath + 'ga/';
    
    /****************** GOOGLE MANAGER ********************/
    app.get(gaPath + 'sessions/', GA.setMetrics(GAM.SESSIONS, GAD.DATE), GA.ga_getData);
    app.get(gaPath + 'pageviews/', GA.setMetrics(GAM.PAGE_VIEWS, GAD.DATE), GA.ga_getData);
    app.get(gaPath + 'mostviews/', GA.setMetrics(GAM.PAGE_VIEWS, GAD.PAGE_DATE, GAS.PAGE_VIEWS_DESC), GA.ga_getData);
    app.get(gaPath + 'users/', GA.setMetrics(GAM.USERS, GAD.DATE), GA.ga_getData);
    app.get(gaPath + 'viewsbycountry/', GA.setMetrics(GAM.PAGE_VIEWS, GAD.COUNTRY_DATE), GA.ga_getData);

    // app.get(gaPath + 'sources/', GaM.setMetrics(GAM.SESSIONS, GAD.MEDIUM_DATE, null, GAF.SESSIONS_GT_5), GaM.ga_getData);
    // app.get(gaPath + 'browsers/', GaM.setMetrics(GAM.SESSIONS, GAD.BROWSER_DATE), GaM.ga_getData);
    // app.get(gaPath + 'bouncerate/', GaM.setMetrics(GAM.BOUNCE_RATE, GAD.DATE), GaM.ga_getData);
    // app.get(gaPath + 'avgsessionduration/', GaM.setMetrics(GAM.AVG_SESSION_DURATION, GAD.DATE), GaM.ga_getData);
    // app.get(gaPath + 'newusers/', GaM.setMetrics(GAM.NEW_USERS, GAD.DATE), GaM.ga_getData);
    // app.get(gaPath + 'mobiledevices/', GaM.setMetrics(GAM.SESSIONS, GAD.MOBILE_DEVICE_DATE, null, GAF.SESSIONS_GT_1), GaM.ga_getData);
    // app.get(gaPath + 'pageloadtime/', GaM.setMetrics(GAM.PAGE_LOAD_TIME, GAD.PAGE_DATE, null, GAF.PAGE_LOAD_TIME_GT_0), GaM.ga_getData);
    // app.get(gaPath + 'percentnewsessions/', GaM.setMetrics(GAM.PERCENT_NEW_SESSIONS, GAD.DATE), GaM.ga_getData);
    

    /****************** ERROR HANDLER ********************/
    app.use((req, res) => {
        return res.status(404).json({
            statusCode: 404,
            error:      "Resource not found.",
            message:    "The resource URL of the request cannot be found in this server."
        });
    });
};

