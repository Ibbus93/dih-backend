const GA = require('../engine/google-api');
const GAM = require('../engine/google-api').METRICS;
const GAD = require('../engine/google-api').DIMENSIONS;
const GAS = require('../engine/google-api').SORT;

module.exports = function (app) {

    /* PATHs */
    const indexPath = "/";

    /****************** GOOGLE MANAGER ********************/
    app.get(indexPath + 'sessioni/', GA.setMetrics(GAM.SESSIONS, GAD.DATE), GA.ga_getData);
    app.get(indexPath + 'visualizzazioni/', GA.setMetrics(GAM.PAGE_VIEWS, GAD.DATE), GA.ga_getData);
    app.get(indexPath + 'paginePiuViste/', GA.setMetrics(GAM.PAGE_VIEWS, GAD.PAGE_DATE, GAS.PAGE_VIEWS_DESC), GA.ga_getData);
    app.get(indexPath + 'utenti/', GA.setMetrics(GAM.USERS, GAD.DATE), GA.ga_getData);
    app.get(indexPath + 'visualizzazioniPerStato/', GA.setMetrics(GAM.PAGE_VIEWS, GAD.COUNTRY_DATE), GA.ga_getData);

    /****************** ERROR HANDLER ********************/
    app.use((req, res) => {
        return res.status(404).json({
            statusCode: 404,
            error:      "Resource not found.",
            message:    "The resource URL of the request cannot be found in this server."
        });
    });
};

