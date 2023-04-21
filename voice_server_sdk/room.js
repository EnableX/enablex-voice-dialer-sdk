////////////////////////////////////////////////////////////////////////////////////
//
// File: room.js - Room & Token Creation
// Description: Handles Server API to carry out RestAPI Calls with EnableX Server to create
// Adhoc Room as and when needed and gets Token for Agents / Customers to put them into a RTC Session
//
////////////////////////////////////////////////////////////////////////////////////


var http    =   require('http');
var fs      =   require('fs');
var config  =   require('./config');
var util    =   require('./util');
//var console  =   require('./util/logger/logger');



// RestAPI Call Header Definition
var options = {
    port : config.SERVER_API_SERVER.port,
    host : config.SERVER_API_SERVER.host,
    key: fs.readFileSync(config.cert.key).toString(),
    cert: fs.readFileSync(config.cert.crt).toString(),
    headers:{
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + util.getBasicAuthToken()
    }
}
if(config.cert.caBundle){
    options.ca = [];
    for (var ca in config.cert.caBundle) {
        options.ca.push(fs.readFileSync(config.cert.caBundle[ca]).toString());
    }
}

// ADHOC ROOM CONFIG
// Some Room Attributes are taken from config.js. And, some are added at run-time

var room    =   {};

var roomSchema = {
    "name": "",                                 /* Room Name */
    "owner_ref": "",                            /* Room Owner - Agent name or email may be passed */
    "settings": {
		"mode": "group",                        /* Room Mode, Set always to "group" */
        "description": "",
        "scheduled": false,                     /* Not a Scheduled Room. Set always to "false" */
        "participants": config.room.participants,
        "moderators": config.room.moderators,
        "duration" : config.room.duration,
        "auto_recording": config.room.autoRecording,
        "active_talker": true,
        "wait_moderator": config.room.waitModerator,
        "quality": "SD",
        "adhoc": false,
        "abwd": true ,
        "canvas": true
    },
    "sip": {
        "enabled": false                        /* SIP is disabled. Set always to "false" */
    }
};



// Method: Create Adhoc Room
// This is to create adhoc room as and when an Agent accepts an incoming call from Customer for RTC Session

room.createAdhocRoom = function (details,callback) {
    var roomMeta = roomSchema;
    roomMeta.settings.adhoc = true;
    roomMeta.name = details.topic;
    roomMeta.settings.description = details.topic;
    roomMeta.owner_ref = details.user_pin;
    roomMeta.settings.mode = 'group';
    createRoom(roomMeta,function(room){
        console.log("Room info : "+room);
        callback(room);
    });
}


// RestAPI Call: CreateRoom
// To post to Enablex Server API URL to create an Adhoc Room.

const createRoom = function(roomMeta,callback) {
    var room =   roomMeta;
    options.path='/v1/rooms/';
    options.method='POST';

    options.headers={
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + new Buffer(config.app_id + ':' + config.app_key).toString('base64'),
    };
    util.connectServer(options,JSON.stringify(room),function(data){
        callback(data);
    });

}



// Method: Get Token
// This is to do restAPI Call to Server API to get a Token for either Moderator (Agent) or Participant (Customer)

room.getToken = function(details,callback) {
    var rooms={};
    options.path='/v1/rooms/'+details.roomId+'/tokens';
    options.method='POST';

    options.headers={
        'Content-Type': 'application/json',
        //'Authorization': 'Basic ' + util.getBasicAuthToken()
        'Authorization': 'Basic ' + new Buffer(config.APP_ID+ ':' + config.APP_KEY).toString('base64')
    };

    util.connectServer(options,JSON.stringify(details),function(data){
    console.log(data);
	callback(data);
    });

}

var module = module || {};
module.exports = room;
