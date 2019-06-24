# Digital Innovation Hub - Finance: back-end example

In this repository there is an easy back-end project to guide the followers of the course [Digital Innovation Hub - Finance](https://www.eventbrite.it/e/biglietti-orientarsi-al-digitale-finance-20-e-27-giugno-4-e-12-luglio-2019-62911384645?ref=estw). 

## Description of the project
The project allows to request some Google Analytics data, regarding the last 90 days, using Google APIs. The GET APIs exposed, that return day by day data concerning a website, are the following:
- **sessioni**: number of sessions;
- **visualizzazioni**: number of page views;
- **paginePiuViste**: most visited pages, in descending order;
- **utenti**: number of users;
- **visualizzazioniPerStato**: page views by country.

More informations about Google Analytics metrics can be found [here](https://developers.google.com/analytics/devguides/reporting/core/dimsmets).

## Project structure
The structure is basically the following:
- **bin/www**: configuration of the HTTP web server;
- **app.js**: creation of the single instance of express and initialization of configuration;
- **config/express.js**: basic express configuration;
- **config/routes.ts**: definition of routes of the service;
- **engine/google-api.js**: methods to request resources to Google Analytics API.

## Technologies
This project is written primarily using the following technologies and libraries:

- [Node.js](https://nodejs.org/it/): runtime environment that let javascript to be used as server side language;
- [Express.js](https://github.com/expressjs/express): node.js web framework used to build a RESTful web service;
- [googleapis](https://github.com/googleapis/google-api-nodejs-client#readme): library for using Google APIs.
