var express = require('express');
var app = express();
const util = require('util');
var config = require("./config"); // Import App Config
var https = require("https");
var events = require('events');
var eventEmitter = new events.EventEmitter();
var fs = require("fs");
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var ngrok = require('ngrok');
//var room = require("./room"); // Import Room Management Service

function registerEventHandlers(socket) {
    socket.on('user-logged-in', onuserlogin.bind(socket));
    socket.on('outbound-call', onoutboundcall.bind(socket));
    socket.on('play-ivr', onivrplay.bind(socket));
    socket.on('join-room',onroomjoin.bind(socket));
    socket.on('connect-call', onconnectcall.bind(socket));
    socket.on('broadcast-call',onbroadcastcall.bind(socket));
    socket.on('play-broadcast-ivr',onbroadcastivrplay.bind(socket));
    socket.on('connect-broadcast-call',onconnectbroadcastcall.bind(socket));
    socket.on('disconnect-broadcast-call',ondisconnectbroadcastcall.bind(socket));
    socket.on('cancel-call', oncancelcall.bind(socket));
    socket.on('reject-call', onrejectcall.bind(socket));
    socket.on('accept-call', onacceptcall.bind(socket));
    socket.on('disconnect-call', ondisconnectcall.bind(socket));
    /*socket.on('room-connected', onroomconnected.bind(socket));
		socket.on('hold-call', onholdcall.bind(socket));
		socket.on('resume-call', onresumecall.bind(socket));
    socket.on('transfer-call',ontransfercall.bind(socket));
		socket.on('disconnect', ondisconnect.bind(socket));
    */
};


var users = new Map();
var calls = new Map();
var agentMap = new Map();
//var roomMap = new Map();
var hostName = 'api-qa.enablex.io';
var port = 443;
var url = '';

var options = {
  key: fs.readFileSync(config.cert.key).toString(),
  cert: fs.readFileSync(config.cert.crt).toString(),
};

if (config.cert.caBundle) {
  options.ca = [];
  for (var ca in config.cert.caBundle) {
    options.ca.push(fs.readFileSync(config.cert.caBundle[ca]).toString());
  }
};


var server = https.createServer(options, app);;
server.listen(8444, () => {
    console.log('listening on *:8444');
});
var io = require('socket.io')(server);
var restserver = app.listen(9444, () => {
  console.log("Server running on port " + 9444);
    (async function() {
      try {
        url = await ngrok.connect(
                                  {proto : 'http',
                                   addr : 9444});
        console.log('ngrok tunnel set up:', url);
        url = url+'/events';
        console.log("event url " + url); 
      } catch(error) {
        console.error("Error happened while trying to connect via ngrock " + JSON.stringify(error));
      }
    })();
});
     

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.post("/events", (req, res, next) => {
 console.log("events received : " + JSON.stringify(req.body));
 eventEmitter.emit('voicestateevent', req.body);
 res.statusCode = 200;
 res.send();
 res.end();
});



var onuserlogin = function(data, callback) {
    console.log('Socket ' + this.id +  'Received incoming request' + JSON.stringify(data));
    let room = data.rooms.split(",");
    if(users.get(this.id) === undefined) {
      users.set(this.id, {'client_id':this.id, 'phone':data.phone, 'room':room, 'name':data.name , 'type': data.type, 'socket':this});
    	//agentStatusMap.set(this.id,
		  agentMap.set(this.id, {'state': "Available" , 'phone' : data.phone});
			for (let [key, value] of agentMap.entries()) {
  	    console.log("key " + key + ":" + "value " + JSON.stringify(value));
	   	}
			callback({'result':0, 'msg':'success'}); 
    } else {
      console.log("User Instance exists");
      callback({'result':10001, 'msg':'User Instance already exists'}); 
    }
};


const makeOutboundCall = function(data, callback) {
  console.log(`APPID ${data.appid} APPKEY ${data.appkey} EventURL ${url}`); 
  let callData = data;
  callData.call_param.event_url = url;
  console.log(`Call Data ${JSON.stringify(callData.call_param)}`);
  var postData = JSON.stringify(callData.call_param);
  console.log("PostData " + postData);
  makeVoiceAPICall('POST', '/voice/v1/call', data.appid , data.appkey , postData, function(response, error) {  
    console.log("Make Call Response " + response); 
    if(response) {
      let msg = JSON.parse(response);
      if(msg.state === 'initiated') {
        console.log("client: " + callData.client_id + " Call Initiation to " + callData.call_param.to + "initiated");
        calls.set(msg.voice_id, {'voice_id':msg.voice_id, 'client_id':callData.client_id, 'phone':callData.from, 'to':callData.to,'state':msg.state});
        sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id, 'phone':callData.from, 'to':callData.to,'state':msg.state});
        callback('success')
      } else {
        //Send call failed response to client.
        sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id, 'phone':callData.from, 'to':callData.to, 'state':msg.state});
        callback('fail')
      }
    } else {
      sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'phone':callData.from, 'to':callData.to, 'state':'failed'});
      callback('fail')
    }
  });
};


var onconnectcall = function(data, callback) {
    console.log(`Socket ${this.id} recieved connect request ${JSON.stringify(data)}`);
    //callback('success');
    //users.set(this.id, {'client_id':this.id, 'socket':this});
    let user = users.get(this.id);
    let callData = data;
    data.client_id = this.id;
    console.log(`Call Data ${JSON.stringify(data.connect_param)}`);
    var postData = JSON.stringify(data.connect_param);
    console.log("PostData " + postData);
    makeVoiceAPICall('PUT', `/voice/v1/call/${callData.voice_id}/connect`, data.appid , data.appkey , postData, function(response, error) {
      console.log("connect call response" + response);
      if(response) {
        let msg = JSON.parse(response);
        if(msg.playstate === 'initiated') {
          //console.log("client: " + callData.client_id + " Call Initiation to " + callData.call_param.to + "initiated");
          //calls.set(msg.voice_id, {'voice_id':msg.voice_id, 'client_id':callData.client_id, 'phone':callData.from, 'to':callData.to,'state':msg.state});
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id, 'state':msg.state});
        } else {
          //Send call failed response to client.
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id, 'state':msg.state});
        }
      } else {
        sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id,'state' : 'failed'});
      }
    });
};

var onconnectbroadcastcall = function(data, callback) {
    console.log(`Socket ${this.id} recieved broadcast connect request ${JSON.stringify(data)}`);
    //callback('success');
    //users.set(this.id, {'client_id':this.id, 'socket':this});
    let user = users.get(this.id);
    let callData = data;
    data.client_id = this.id;
    console.log(`Call Data ${JSON.stringify(data.connect_param)}`);
    var postData = JSON.stringify(data.connect_param);
    console.log("PostData " + postData);
    makeVoiceAPICall('PUT', `/voice/v1/broadcast/${data.broadcast_id}/call/${callData.voice_id}/connect`, data.appid , data.appkey , postData, function(response, error) {
      console.log("connect call response" + response);
      if(response) {
        let msg = JSON.parse(response);
        if(msg.playstate === 'initiated') {
          //console.log("client: " + callData.client_id + " Call Initiation to " + callData.call_param.to + "initiated");
          //calls.set(msg.voice_id, {'voice_id':msg.voice_id, 'client_id':callData.client_id, 'phone':callData.from, 'to':callData.to,'state':msg.state});
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {broadcast_id : msg.broadcast_id,'voice_id':msg.voice_id, 'state':msg.state});
        } else {
          //Send call failed response to client.
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'broadcast_id' : msg.broadcast_id,'voice_id':msg.voice_id, 'state':msg.state});
        }
      } else {
        sendMessage(users.get(callData.client_id).socket, 'callstateevent', {broadcast_id : msg.broadcast_id,'voice_id':msg.voice_id,'state' : 'failed'});
      }
    });
};


var onoutboundcall = function(data, callback) {
    console.log(`Socket ${this.id} recieved outbound call request ${JSON.stringify(data)}`);
    //callback('success');
    users.set(this.id, {'client_id':this.id, 'socket':this});
    //let user = users.get(this.id);
    data.client_id = this.id;
    makeOutboundCall(data, (response) => {
      callback(response);
    });
};

var onivrplay = function(data, callback) {
    console.log(`Socket ${this.id} recieved ivr play request ${JSON.stringify(data)}`);
    //callback('success');
    //users.set(this.id, {'client_id':this.id, 'socket':this});
    let user = users.get(this.id);
    let callData = data;
    data.client_id = this.id;
    console.log(`Call Data ${JSON.stringify(callData.play_param)}`);
    var postData = JSON.stringify(callData.play_param);
    console.log("PostData " + postData);
    makeVoiceAPICall('PUT', `/voice/v1/call/${callData.voice_id}/play`, data.appid , data.appkey , postData, function(response, error) {
      console.log("play IVR response" + response);
      if(response) {
        let msg = JSON.parse(response);
        if(msg.playstate === 'initiated') {
          //console.log("client: " + callData.client_id + " Call Initiation to " + callData.call_param.to + "initiated");
          //calls.set(msg.voice_id, {'voice_id':msg.voice_id, 'client_id':callData.client_id, 'phone':callData.from, 'to':callData.to,'state':msg.state});
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id, 'playstate':msg.playstate});
        } else {
          //Send call failed response to client.
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id, 'playstate':msg.playstate});
        }
      } else {
        sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id,'playstate' : 'failed'});
      }
    });
     /*makeOutboundCall(data, (response) => {
      callback(response);
    });*/
};

var onbroadcastivrplay = function(data, callback) {
    console.log(`Socket ${this.id} recieved broadcast ivr play request ${JSON.stringify(data)}`);
    //callback('success');
    //users.set(this.id, {'client_id':this.id, 'socket':this});
    let user = users.get(this.id);
    let callData = data;
    data.client_id = this.id;
    console.log(`Call Data ${JSON.stringify(callData.play_param)}`);
    var postData = JSON.stringify(callData.play_param);
    console.log("PostData " + postData);
    makeVoiceAPICall('PUT', `/voice/v1/broadcast/${callData.broadcast_id}/call/${callData.voice_id}/play`, data.appid , data.appkey , postData, function(response, error) {
      console.log("play IVR response" + response);
      if(response) {
        let msg = JSON.parse(response);
        if(msg.playstate === 'initiated') {
          //console.log("client: " + callData.client_id + " Call Initiation to " + callData.call_param.to + "initiated");
          //calls.set(msg.voice_id, {'voice_id':msg.voice_id, 'client_id':callData.client_id, 'phone':callData.from, 'to':callData.to,'state':msg.state});
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {broadcast_id: msg.broadcast_id, 'voice_id':msg.voice_id, 'playstate':msg.playstate});
        } else {
          //Send call failed response to client.
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {broadcast_id: msg.broadcast_id,'voice_id':msg.voice_id, 'playstate':msg.playstate});
        }
      } else {
        sendMessage(users.get(callData.client_id).socket, 'callstateevent', {broadcast_id: msg.broadcast_id,'voice_id':msg.voice_id,'playstate' : 'failed'});
      }
    });
};

var onroomjoin = function(data, callback) {
    console.log(`Socket ${this.id} recieved room join request ${JSON.stringify(data)}`);
    //callback('success');
    //users.set(this.id, {'client_id':this.id, 'socket':this});
    let user = users.get(this.id);
    let callData = data;
    data.client_id = this.id;
    console.log(`Call Data ${JSON.stringify(callData.play_param)}`);
    //var postData = JSON.stringify(callData.play_param);
    //console.log("PostData " + postData);
    makeVoiceAPICall('PUT', `/voice/v1/room/${callData.room_id}/call/${callData.voice_id}/join`, data.appid , data.appkey , '', function(response, error) {
      console.log("join room response" + response);
      if(response) {
        let msg = JSON.parse(response);
        if(msg.state === 'initiated') {
          //console.log("client: " + callData.client_id + " Call Initiation to " + callData.call_param.to + "initiated");
          //calls.set(msg.voice_id, {'voice_id':msg.voice_id, 'client_id':callData.client_id, 'phone':callData.from, 'to':callData.to,'state':msg.state});
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id, 'state':msg.playstate});
        } else {
          //Send call failed response to client.
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id, 'state':msg.playstate});
        }
      } else {
        sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id,'state' : 'failed'});
      }
    });
     /*makeOutboundCall(data, (response) => {
      callback(response);
    });*/
};


var onconnectcall = function(data, callback) {
    console.log(`Socket ${this.id} recieved connect call request ${JSON.stringify(data)}`);
    //callback('success');
    //users.set(this.id, {'client_id':this.id, 'socket':this});
    let user = users.get(this.id);
    let callData = data;
    data.client_id = this.id;
    console.log(`Call Data ${JSON.stringify(callData.connect_param)}`);
    var postData = JSON.stringify(callData.connect_param);
    console.log("PostData " + postData);
    makeVoiceAPICall('PUT', `/voice/v1/call/${callData.voice_id}/connect`, data.appid , data.appkey , postData, function(response, error) {
      console.log("play IVR response" + response);
      if(response) {
        let msg = JSON.parse(response);
        if(msg.state === 'initiated') {
          //console.log("client: " + callData.client_id + " Call Initiation to " + callData.call_param.to + "initiated");
          //calls.set(msg.voice_id, {'voice_id':msg.voice_id, 'client_id':callData.client_id, 'phone':callData.from, 'to':callData.to,'state':msg.state});
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id, 'state':msg.state});
        } else {
          //Send call failed response to client.
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id, 'state':msg.state});
        }
      } else {
        sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'voice_id':msg.voice_id,'state' : 'failed'});
      }
    });
     /*makeOutboundCall(data, (response) => {
      callback(response);
    });*/
};

var onbroadcastcall = function (data , callback) {
    console.log(`Socket ${this.id} recieved broadcast call request ${JSON.stringify(data)}`);
    callback('success');
    users.set(this.id, {'client_id':this.id, 'socket':this});
    let user = users.get(this.id);
    let callData = data;
    data.client_id = this.id;
    callData.broadcast_param.event_url = url
    console.log(`Call Data ${JSON.stringify(callData.broadcast_param)}`);
    var postData = JSON.stringify(callData.broadcast_param);
    console.log("PostData " + postData);
    makeVoiceAPICall('POST', `/voice/v1/broadcast`, data.appid , data.appkey , postData, function(response, error) {
      console.log("make broadcast call response" + response);
      if(response) {
        let msg = JSON.parse(response);
        if(msg.state === 'broadcastcall_initiated') {
          //console.log("client: " + callData.client_id + " Call Initiation to " + callData.call_param.to + "initiated");
          calls.set(msg.broadcast_id, {broadcast_id: msg.broadcast_id,'voice_id':msg.voice_id, 'client_id':callData.client_id, 'from':msg.from, 'to':msg.to,'state':msg.state});
	  calls.set(msg.voice_id, {broadcast_id: msg.broadcast_id,'voice_id':msg.voice_id, 'client_id':callData.client_id, 'from':msg.from, 'to':msg.to,'state':msg.state});
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'broadcast_id': msg.broadcast_id , voice_id : msg.voice_id, from: msg.from,to:msg.to,'state':msg.state});
        } else {
          //Send call failed response to client.
          sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'broadcast_id': msg.broadcast_id ,'voice_id':msg.voice_id, 'state':msg.state});
        }
      } else {
        sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'broadcast_id': msg.broadcast_id ,'voice_id':msg.voice_id,'playstate' : 'failed'});
      }
    });
}

/* Function to Hangup Call */
var oncancelcall = function(data, callback) {
    console.log("Cancel Call Response " + data.voice_id);
    let path = '/voice/v1/call/' + voice_id;
    let options = {
        host: config.host,
        port: config.port,
        path: path,
        method: 'DELETE',
        headers: {
            'Authorization': 'Basic ' + new Buffer(config.app_id + ':' + config.app_key).toString('base64'),
            'Content-Type': 'application/json',
        }   
    };
    req = https.request(options, function(res) {
        var body = "";
        res.on('data', function(data) {
            body += data;
        });

        res.on('end', function() {
            callback(body);
        });

        res.on('error', function(e) {
            console.log("Got error: " + e.message);
        });
    });
    req.end();
    callback({'result':0, 'msg':'success'}); 
};

var onacceptcall = function(data, callback) {
    console.log("AcceptCal on " + data.voice_id);
    answercall(data.voice_id, (response) =>{
        if(callback) callback({'result':0, 'msg':'success'}); 
    });
};

var onholdcall = function(data, callback) {
    console.log("Hold Call on " + data.voice_id);
		holdcall(data, (response) =>{
        if(callback) callback({'result':0, 'msg':'success'});
    });
};


var onresumecall = function(data, callback) {
    console.log("Resume Call on " + data.voice_id);
   resumecall(data, (response) =>{
        if(callback) callback({'result':0, 'msg':'success'});
    });
};


var ontransfercall = function(data, callback) {
    console.log("Hold Call on " + data.voice_id);
    let transferdata = {
      voice_id:data.voice_id,
			from : data.from,
			to:data.to,
			room:data.room
    }

    transfercall(transferdata, (response) =>{
        if(callback) callback({'result':0, 'msg':'success'});
    });
};

var onrejectcall = function(data, callback) {
    console.log("Reject Call Response " + data.voice_id);
    callback({'result':0, 'msg':'success'}); 
};

var ondisconnectcall = function(data, callback) {
    console.log("Disconnect Call Request " + JSON.stringify(data));
    disconnectCall(data);
    callback({'result':0, 'msg':'success'}); 
};


var onroomconnected = function(data, callback) {
    console.log("Room Connected Response " + data.voice_id);
    callback({'result':0, 'msg':'success'}); 
};

var ondisconnect = function() {
    console.log("Disconnect Connection response received");
		agentMap.delete(this.id);		
};

var voiceeventhandler = function(voiceevent) {
    let voice_id = voiceevent.broadcast_id ? voiceevent.broadcast_id : voiceevent.voice_id;
    let call = calls.get(voiceevent.broadcast_id ? voiceevent.broadcast_id : voiceevent.voice_id);
    if(call === undefined) {
      call = calls.get(voiceevent.voice_id);
    }
    console.log("voiceevent :" + JSON.stringify(voiceevent));
    console.log(" VoiceId: " + (voiceevent.broadcast_id ? voiceevent.broadcast_id : voiceevent.voice_id) + " Call Details: " + JSON.stringify(call));
    let user = undefined;
    if(call !== undefined) {		
      user = users.get(call.client_id);
    } 
    console.log("user : " + user);
    if(voiceevent.state) {
      if(voiceevent.state === 'incomingcall') {
        console.log("["+voice_id+"] Received incoming call from " + voiceevent.from);
        if(user !== undefined) {
          calls.set(voiceevent.broadcast_id ? voiceevent.broadcast_id : voiceevent.voice_id, {broadcast_id : voiceevent.broadcast_id, 'voice_id':voiceevent.voice_id,'client_id':user.client_id, 'phone':voiceevent.to, 'to':voiceevent.from, 'room':roomId, 'state':'incomingcall'});
           sendMessage(users.get(user.client_id).socket, 'callstateevent', {broadcast_id: voiceevent.broadcast_id,'voice_id':voiceevent.voice_id, 'phone':voiceevent.to, 'to':voiceevent.from, 'room':roomId, 'state':'incomingcall'});
        } else {
          console.error("["+voice_id+"] Phone number not found for incoming call" + voiceevent.from);
          disconnectCall(voiceevent.broadcast_id)
        }
      } else if(voiceevent.state && voiceevent.state === 'connected') {
        console.log("[" +  voiceevent.voice_id + "] Outbound Call is connected");
        sendMessage(users.get(call.client_id).socket, 'callstateevent', {broadcast_id:voiceevent.broadcast_id,'voice_id':voiceevent.voice_id, from : voiceevent.from , to : voiceevent.to,state:'connected'})
        call.state = 'connected';
      } else if(voiceevent.state === 'bridged' || voiceevent.state === 'bridging' || voiceevent.state === 'bridge_disconnected') {
        console.log("[" +  voiceevent.voice_id + "] Outbound Call is Bridged");
        sendMessage(users.get(call.client_id).socket, 'callstateevent', {broadcast_id : voiceevent.broadcast_id, 'voice_id':voiceevent.voice_id, from : voiceevent.from , to : voiceevent.to, state:voiceevent.state});
      } else if(voiceevent.state === 'broadcastcall_complete'){
           sendMessage(users.get(callData.client_id).socket, 'callstateevent', {'broadcast_id': msg.broadcast_id , from: msg.from , broadcast_call_info: msg.broadcast_call_info,'state':msg.state});
      } else if(voiceevent.state === 'disconnected') {
        console.log("[" + voice_id + "] Call Disconnected");
        //call.state = 'disconnected';
        //sendMessage(users.get(call.client_id).socket, 'callstateevent', {broadcast_id: voiceevent.broadcast_id,'voice_id':voiceevent.voice_id, from : voiceevent.from , to : voiceevent.to, 'state':'disconnected'});
        calls.delete(voice_id);
      } else if(voiceevent.state === 'joined') {
        call.state = 'room_connected';
        sendMessage(users.get(call.client_id).socket, 'callstateevent', {broadcast_id:voiceevent.broadcast_id,'voice_id':voiceevent.voice_id,from : voiceevent.from , to : voiceevent.to,  state:'room_connected'});
     }
    } else if(voiceevent.playstate) {
     //This is due to the some play prompt configured 
     sendMessage(users.get(call.client_id).socket, 'callstateevent', {broadcast_id: voiceevent.broadcast_id,'voice_id':voiceevent.voice_id, from : voiceevent.from , to : voiceevent.to, 'playstate':voiceevent.playstate,'prompt_ref':voiceevent.prompt_ref,'digit' : voiceevent.digit});
     console.log("[" +  voiceevent.voice_id + "] Play finished");
  }
}


eventEmitter.on('voicestateevent', voiceeventhandler);
console.log("Registering the voice event handler");
io.on('connection', function(socket){
   console.log('A client connected');
   registerEventHandlers(socket);
});

/*http.listen(8444, function(){
    console.log('listening on *:8444');
});*/


// Function: Send Message - To emit an event on Socket with a JSON Message
// Parameters: Target Socket,  Event Name, JSON Data
const sendMessage = function (socket, type, data) {
  socket.emit(type, data);
  console.log("Event Emmited : " + type + ", ID: " + socket.id + "data" + JSON.stringify(data));
};


var makeVoiceAPICall = function(method, path, appid, appkey , data, callback) {
    console.log(`makeVoiceAPICall : ${method} ${path} ${appid} ${appkey} ${data}`)
    let options = {
        host: hostName,
        port: port,
        path: path,
        method: method,//'POST',
        headers: {
            'Authorization': 'Basic ' + new Buffer(appid + ':' + appkey).toString('base64'),
            'Content-Type': 'application/json',
            'Content-Length': (data)? data.length : 0
        }   
    };
    req = https.request(options, function(res) {
        var body = "";
        res.on('data', function(data) {
            body += data;
        });

        res.on('end', function() {
           console.log("Data Received is " + JSON.stringify(body));
           callback(body);
           
        });

        res.on('error', function(e) {
            console.error("Got error: " + e.message);
            callback(null, error);
           
        });
    });

    if (data) req.write(data);
    req.end();
};


var answercall = function(voice_id, callback) {
   let call = calls.get(voice_id);
   console.log("Call Details : " + JSON.stringify(call));
	 if(call === null) { callback({result:404, msg:'Call not found'}); return};
   makeVoiceAPICall('PUT', '/voice/v1/call/'+ voice_id + '/accept', null, function(response) {
     console.log("answerCall :: Response received is: " + response);
		 let answerCallResponse = JSON.parse(response);
     if(answerCallResponse.status === 'success') {
       //Update the state accordingly.
			 console.log("Call Accepted Successfully");
       call.state = 'connected';
			 //call.voice_id = voice_id;
       room.getToken({name: users.get(call.client_id).user,
          role: "moderator",
          user_ref: "Click2Call",
          roomId: call.room,
       }, function (token) {
          if (token && token.result !== undefined && token.result === 0) {
            console.log("Token Got for User, Token: ");
            console.log(token);
            console.log("Send Connected CallState Event to client");
						placeVoiceCallToRoom(call);
						sendMessage(users.get(call.client_id).socket, 'callstateevent', {'voice_id':voice_id, state:'connected', 'token':token});
          } else {
            console.log("Call Accepted : Join the Room " + JSON.stringify(call));
						placeVoiceCallToRoom(call);
							
						/*if(call.state === 'room_initiated') {
							sendMessage(users.get(call.client_id).socket, 'callstateevent', {'voice_id':voice_id, state:'connected', 'token':token});
						}*/
						//placeVoiceCallToRoom(call);
						//disconnectCall(voice_id)
          }
       });
     } else {
			 console.log("Call Accept Failed")
       disconnectCall(voice_id);
     }
   });
};

var holdcall = function(data, callback) {
   let call = calls.get(data.voice_id);
   console.log("Call Details : " + JSON.stringify(call));
   if(call === null) { callback({result:404, msg:'Call not found'}); return};
	 var postData = JSON.stringify({
	 		hold : true
   });
   makeVoiceAPICall('PUT', '/voice/v1/call/'+ data.voice_id + '/hold', postData, function(response) {
     console.log("Hold Call :: Response received is: " + typeof response);
	 	 let holdCallResponse = JSON.parse(response);
		 if(holdCallResponse.status === 'success') {
     //if(true || response.status === 'success') {
       //Update the state accordingly.
       console.log("Call Held Successfully"); 
	   sendMessage(users.get(call.client_id).socket, 'callstateevent', {'voice_id':data.voice_id, state:'hold_success'});	   
     } else {
       console.log("Call Hold Failed")
	   sendMessage(users.get(call.client_id).socket, 'callstateevent', {'voice_id':data.voice_id, state:'hold_failed'});
     }
   });
};


var resumecall = function(data, callback) {
   let call = calls.get(data.voice_id);
   console.log("Call Details : " + JSON.stringify(call));
   if(call === null) { callback({result:404, msg:'Call not found'}); return};
   var postData = JSON.stringify({
      hold : false
   });
   makeVoiceAPICall('PUT', '/voice/v1/call/'+ data.voice_id + '/hold', postData, function(response) {
     console.log("Resume Call :: Response received is: " + response);
		 let resumeCallResponse = JSON.parse(response);
     if(resumeCallResponse.status === 'success') {
       //Update the state accordingly.
       console.log("Call Resumed Successfully");
     sendMessage(users.get(call.client_id).socket, 'callstateevent', {'voice_id':data.voice_id, state:'resume_success'});
     } else {
       console.log("Call Resume Failed")
     sendMessage(users.get(call.client_id).socket, 'callstateevent', {'voice_id':data.voice_id, state:'resume_failed'});
     }
   });
};

var transfercall = function(data, callback) {
   let call = calls.get(data.voice_id);
   console.log("Call Details : " + JSON.stringify(call));
   if(call === null) { callback({result:404, msg:'Call not found'}); return};
   var postData = JSON.stringify({
		from : data.from,
		to : data.to
   });
   makeVoiceAPICall('PUT', '/voice/v1/call/'+ data.voice_id + '/connect', postData, function(response) {
     console.log("answerCall :: Response received is: " + response);
		 let transferCallResponse = JSON.parse(response);
     if(transferCallResponse.status === 'success') {
       //Update the state accordingly.
       console.log("Call Transferred Successfully"); 
	   sendMessage(users.get(call.client_id).socket, 'callstateevent', {'voice_id':data.voice_id, state:'transfer_success'});	   
     } else {
       console.log("Call Transfer Failed")
	   sendMessage(users.get(call.client_id).socket, 'callstateevent', {'voice_id':data.voice_id, state:'transfer_failed'});
     }
   });
};

var placeVoiceCallToRoom = function(call) {
  console.log("Joining the room " + call.room + " Voice ID " + call.voice_id);
  makeVoiceAPICall('PUT', '/voice/v1/room/' + call.room + '/call/'+ call.voice_id + '/join', null, function(response) {
    console.log("placeVoiceCallToRoom :; Response received is: " + response);
    if(response.state === 'initiated') {
      call.state = 'room_initiated';
    } else if (response.state  === 'success') {
			console.log("Initiating Join Room");	
		} else {
      //disconnectCall(call.voice_id);
    	call.state === 'room_failed';
		} 
  });
};

var getFreeAgent = function(phoneNumber) {
	console.log("get Available Agents for phone number " + phoneNumber);
	
  for (let [key, value] of agentMap.entries()) {
    if (value.state === "Available" && value.phone === phoneNumber) {
			if(key === undefined) {
				console.log("All Agents are Busy");
				return null;
			}
  		console.log("Available Agent ID " + key);
			agentMap.delete(key);
			agentMap.set(key,value);	
			return key;
		}		   
  }
}

var getAgentsFreeRoom  = function(user) {
	
	for(var i = 0 ; i < user.room.length ; i++ ) {
		if(roomMap.get(user.room[i]) == undefined) {
			let roomId = user.room[i];
			roomMap.set(roomId , user.client_id);
			if(i === user.room.length - 1 ) {
				 let json = {
        	'state' : "Busy",
        	'phone' : user.phone
  			 }

  			agentMap.set(user.client_id,json);		
			}
			return roomId;
		}
	}
	return null;
}

/* Function to Hangup Call */
var disconnectCall = function(disconnectdata) {
    let call = calls.get(disconnectdata.voice_id);
    if(call) { 
    let path = '/voice/v1/call/' + disconnectdata.voice_id;
    let options = {
        host: hostName,
        port: port,
        path: path,
        method: 'DELETE',
        headers: {
            'Authorization': 'Basic ' + new Buffer(disconnectdata.appid + ':' + disconnectdata.appkey).toString('base64'),
            'Content-Type': 'application/json',
        }   
    };
    req = https.request(options, function(res) {
        var body = "";
        res.on('data', function(data) {
            body += data;
        });

        res.on('end', function() {
            //callback(body);
        });

        res.on('error', function(e) {
            console.log("Got error: " + e.message);
        });
    });
    req.end();
    sendMessage(users.get(call.client_id).socket, 'callstateevent', {'voice_id': disconnectdata.voice_id, 'state':'disconnected'}); 
  } else {
    console.error("Call Not found");
  }
}
var ondisconnectbroadcastcall = function(data, callback) {
    console.log("broadcast disconnect Call Request " + JSON.stringify(data));
    disconnectBroadCastCall(data);
    callback({'result':0, 'msg':'success'});
};

var disconnectBroadCastCall = function(disconnectdata) {
    let call = calls.get(disconnectdata.broadcast_id);
    if(call) {
    let path = `/voice/v1/broadcast/${disconnectdata.broadcast_id}/call/${disconnectdata.voice_id}`;
    let options = {
        host: hostName,
        port: port,
        path: path,
        method: 'DELETE',
        headers: {
            'Authorization': 'Basic ' + new Buffer(disconnectdata.appid + ':' + disconnectdata.appkey).toString('base64'),
            'Content-Type': 'application/json',
        }
    };
    req = https.request(options, function(res) {
        var body = "";
        res.on('data', function(data) {
            body += data;
        });

        res.on('end', function() {
            //callback(body);
        });

        res.on('error', function(e) {
            console.log("Got error: " + e.message);
        });
    });
    req.end();
    sendMessage(users.get(call.client_id).socket, 'callstateevent', {broadcast_id: disconnectdata.broadcast_id, 'voice_id': disconnectdata.voice_id, 'state':'disconnected'});
  } else {
    console.error("Call Not found");
  }
}

