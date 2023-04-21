////////////////////////////////////////////////////////////////////////////////////
//
// Application: Contact Center
// Service: Customer to Agent Call Router
// Version: 1.0
// Release Date: Nov 26, 2018
//
// File: config.js - Service COnfiguration File
// Description: Each End Point viz. Customer, Agent, Supervisor gets connected with this Service using
// Secured Web Sockets to announce their presence. The Service manages availability and does incoming
// Call-Routing to available agents.
//
////////////////////////////////////////////////////////////////////////////////////

var config = {};

// ENABLEX SERVICE ACCESS: Access information to EnableX Eco System

config.SERVER_API_SERVER = {
  host:
    "api-qa.enablex.io" /* Server API URL. Change it to connect to right EnableX Cluster */,
  port: "443",
  /* Server API Port. */
};

config.APP_ID = ""; // 	            /* APP ID - Use APP ID received from Enablex */
config.APP_KEY = ""; 	/* APP KEY - Use APP KEY received from Enablex */


config.cert = {
  key: "/opt/vcloudx/etc/sslcerts/vcloudx.key", // Your KEY file path
  crt: "/opt/vcloudx/etc/sslcerts/vcloudx.crt", // Your CRT file path
  //caBundle: /opt/vcloudx/etc/sslcerts/vcloudx.ca-bundle,
};

// SERVICE ACCESSIBILITY
//config.appIP = "0.0.0.0";
config.appPort = 8444; /* Service Port */
config.ssl = true; /* To enable SSL/ Must always be "true" */


config.logger = {
  appenders: {
    app: {
      type: "file",
      filename:
        "", // path of the file where you want to store the logs 
      layout: {
        type: "pattern",
        pattern:
          "%d{ddMMyyhhmmss}::%p::%c::%m" /* Pattern for Log entry format */,
        replaceConsole: true,
      },
    },
  },
  categories: {
    default: {
      appenders: ["app"],
      level: "info",
    },
  },
};

// SERVICE BEHAVIORAL SETTINGS

config.room = {}; /* Adhoc Room Definition where Agent/Customer meet */
config.room.duration = "60"; /* RTC Session Duration */
config.room.moderators =
  "1"; /* Moderators# (Agent) allowed in a Room - Set always to 1 */
config.room.participants =
  "1"; /* Participants# (Customers) allowed in a Room - Set always to 1 */
config.room.quality = "HD"; /* Stream Quality. Enum: HD, SD */
config.room.autoRecording = true; /* To record Session. Enum: true, false */
config.room.activeTalker = true; /* To enable Active Set always to "true" */
config.room.waitModerator = false; /* To wait for agent - Set always to "false" */

var module = module || {};
module.exports = config;
