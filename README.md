# Digital Innovation Hub - Finance: back-end example

In this repository there is an easy back-end project to show to the followers of the course [Digital Innovation Hub - Finance](https://www.eventbrite.it/e/biglietti-orientarsi-al-digitale-finance-20-e-27-giugno-4-e-12-luglio-2019-62911384645?ref=estw) an example of a RESTful service. 

## Description of the project
The project allows to request some Google Analytics data, regarding the last 90 days, using Google APIs. The GET APIs exposed, that return day by day data about a website, can be found in the file [config/routes.js](https://github.com/Ibbus93/dih-backend/blob/master/config/routes.js). A briefly description of the routes is the following:
- **sessioni**: number of sessions;
- **visualizzazioni**: number of page views;
- **paginePiuViste**: most visited pages, in descending order;
- **utenti**: number of users;
- **visualizzazioniPerStato**: page views by country.

More informations about Google Analytics metrics can be found [here](https://developers.google.com/analytics/devguides/reporting/core/dimsmets).

## Project structure
The main structure is basically the following:
- **bin/www**: configuration of the HTTP web server;
- **app.js**: creation of the single instance of express and initialization of configuration;
- **config/express.js**: basic express configuration;
- **config/routes.ts**: definition of routes of the service;
- **engine/google-api.js**: methods to request resources to Google Analytics API.

## How to execute the project
First of all, clone the project:
```
git clone https://github.com/Ibbus93/dih-backend.git
```
Then, go to the folder created and install the dipendencies. Finally, start the service:

```
cd dih-backend/
npm install
npm start
```
The service will be run on the port 3000.

## Technologies
This project is written primarily using the following technologies and libraries:

- [Node.js](https://nodejs.org/it/): runtime environment that let javascript to be used as server side language;
- [Express.js](https://github.com/expressjs/express): node.js web framework used to build a RESTful web service;
- [googleapis](https://github.com/googleapis/google-api-nodejs-client#readme): library for using Google APIs.
