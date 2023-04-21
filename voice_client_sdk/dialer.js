var io = require('socket.io-client');
var fs = require("fs");
const EventEmitter = require('events');
var that;
class EnxDialer extends EventEmitter {
  constructor(url, params) {
    super();
    that = this;
    that.server_url = url;
    that.socket = null;
    that.state = 'init';
    //this.connectServer(params);
  };

  init(websocketurl) {
    let socket_opt = {
      reconnection: true,
      reconnectionAttempts: 10,
      forceNew: true,
      transports: ["websocket"],
      pingInterval: 25000,
      pingTimeout: 600000,
    }
    //var transport = [];
    //transport.push(param.transport);
    console.log("Connecting to Server");
    //that.socket = io.connect(param.host, {transports: transport, reconnect : param.reconnect , secure : param.secure , rejectUnauthorized : param.rejectUnauthorized} );
    that.socket = io.connect(websocketurl, {transports: ["websocket"], reconnect: true, secure: true, rejectUnauthorized: false}		 );	that.socket.on('connect', function(socket) {
      console.log("Connected to Server");			
    });
  }
  
  login(params) {
		that.socket.emit('user-logged-in', params, (response) => {
        if(response.result === 0) {
          console.log("Successfully logged in");
          that.state = 'online';
        } else {
          console.log("failed to log in");
          that.state = "offline";
        }
    });	
	}

		/*
		* Handle Events
		*/
     handleVoiceEvents() {
	that.socket.on("callstateevent", function (data) {
        console.log(" handle callstateevents " + JSON.stringify(data));
        console.log("State: " + that.state);
        if(data.state === 'incomingcall') {
          that.acceptCall(data.voice_id , (response) => {
            console.log("Accept Call Successfull");
          });
          if(that.state === 'online') {
            console.log("Dispatching incoming call notification to the app");
            that.emit('incomingcall', data);
          } else {
            //To-Do: To handle call waiting later
            console.log("Already in a call, call waiting is not supported as of now.");
            that.rejectCall(data.voice_id);
          }
        } else if(data.state === 'connected' ) {
             that.state = 'connected';
             console.log("Dispatching connected notification to the app");
             that.emit('connected', data);
        } else if(data.state === 'initiated') {
             console.log("Dispatching initiated event notification to the app");
             that.emit('initiated', data);
        } else if(data.state === 'disconnected') {
             that.state = 'online';
             console.log("Dispatching disconnected event notification to the app");
             that.emit('disconnected', data);
        } else if(data.state === 'room_connected') {
             that.state = 'room_connected';
             console.log("Dispatching room connected notification to the app");
             that.emit('room_connected', data);
        } else {
          console.log("Invalid state received on the call state events");
          /*that.disconnectCall(data.voice_id,(response) => {
	    console.log(`Disconnect Call Response ${response}`);
	  });*/
        }
      });
		
		}
    
		/*
    * Make an outbound call.
    */
    connectCall(appid , appkey , voice_id, params, callback) {
      that.state = 'dialing';
      that.socket.emit("connect-call", {
	appid : appid,
	appkey : appkey,
        voice_id : voice_id,	
	connect_param : params }, (response) => {
          console.log("Received response", JSON.stringify(response));
          if(callback) callback(response);
     });
     that.state = 'dialing'
    };

   connectBroadCastCall(appid , appkey , broadcast_id, voice_id, params, callback) {
      that.state = 'dialing';
      that.socket.emit("connect-broadcast-call", {
        appid : appid,
        appkey : appkey,
	broadcast_id : broadcast_id,
        voice_id : voice_id,
        connect_param : params }, (response) => {
          console.log("Received response", JSON.stringify(response));
          if(callback) callback(response);
     });
     that.state = 'dialing'
    };

    makeOutboundCall(appid , appkey , params , callback ) {
      that.state = 'dialing';
      that.socket.emit('outbound-call', { 
        appid : appid,
        appkey : appkey, 
        call_param : params }, (response) => { 
        console.log("Received response", JSON.stringify(response));
        if(callback) 
	callback(response);
      })
    };

    makeBroadcastCall(appid , appkey , params , callback ) {
      that.state = 'dialing';
      that.socket.emit('broadcast-call', {
        appid : appid,
        appkey : appkey,
        broadcast_param : params }, (response) => {
        console.log("Received response", JSON.stringify(response));
        if(callback)
        callback(response);
      })
    };

    playIVR(appid, appkey, voice_id, params,callback) {
      that.state = 'connected';
      that.playstate = 'initiated'
      that.socket.emit('play-ivr', {
        appid : appid,
        appkey : appkey,
	voice_id : voice_id,
        play_param : params }, (response) => {
        console.log("Received response", JSON.stringify(response));
        if(callback)
          callback(response);
      })
    }

    joinRoom(appid, appkey, voice_id, room_id, params,callback) {
      that.state = 'connected';
      that.playstate = 'initiated'
      that.socket.emit('join-room', {
        appid : appid,
        appkey : appkey,
        voice_id : voice_id,
	room_id : room_id}, (response) => {
        console.log("Received response", JSON.stringify(response));
        if(callback)
          callback(response);
      })
    }

    playBroadCastIVR(appid, appkey, broadcast_id , voice_id, params,callback) {
      that.state = 'connected';
      that.playstate = 'initiated'
      that.socket.emit('play-broadcast-ivr', {
        appid : appid,
        appkey : appkey,
        broadcast_id : broadcast_id,
        voice_id : voice_id,
        play_param : params }, (response) => {
        console.log("Received response", JSON.stringify(response));
        if(callback)
          callback(response);
      })
    }
 
    /*
      Hold Call
    */
		
    holdCall(voiceId, callback) {
      that.state = 'connected';
      that.socket.emit("hold-call", {voice_id: voiceId}, (response) => {
          console.log("Received response", JSON.stringify(response));
          if(callback) callback(response);
     });
      that.state = 'Mute'
    };

		/*
    * Resume Call
    */

    resumeCall(voiceId, callback) {
      that.socket.emit("resume-call", {voice_id: voiceId}, (response) => {
          console.log("Received response", JSON.stringify(response));
          if(callback) callback(response);
     });
      that.state = 'UnMute'
    };

		transferCall(params, callback) {
			that.state = 'transfer-initiated'
      that.socket.emit("transfer-call", {voice_id: params.voiceId , from : params.from , to: params.to, room: params.room}, (response) => {
          console.log("Received response", JSON.stringify(response));
          if(callback) callback(response);
     });
      that.state = 'transferred'
    };
		
    /*
    * Disconnecting the call
    */
    disconnectCall(appid, appkey, voiceId, callback) {
      /*let eventName;
      if(that.state === 'dialing') {
        eventName = 'cancel-call';
      } else if(that.state === 'connected' || that.state === 'established') {
        eventName = 'disconnect-call';
      } else if(that.state === 'incomingcall') {
        eventName = 'reject-call'
      }*/
      that.socket.emit('disconnect-call', {appid : appid, appkey : appkey, voice_id : voiceId}, (response) => {
        console.log("Received response", JSON.stringify(response));
        callback(response);
      });
      //that.state = 'online';
    };

    disconnectBroadCastCall(appid, appkey, broadcast_id,voiceId, callback) {
      /*let eventName;
      if(that.state === 'dialing') {
        eventName = 'cancel-call';
      } else if(that.state === 'connected' || that.state === 'established') {
        eventName = 'disconnect-call';
      } else if(that.state === 'incomingcall') {
        eventName = 'reject-call'
      }*/

      that.socket.emit('disconnect-broadcast-call', {appid : appid, appkey : appkey, broadcast_id , voice_id : voiceId}, (response) => {
        console.log("Received response", JSON.stringify(response));
        callback(response);
      });
      //that.state = 'online';
    };
    /*
    * Once the room is connected, send a room connected information to the server.
    */
    sendRoomConnected(data) {
      that.socket.emit('room-connected', {voice_id:data.voice_id, room:data.room_id, from:data.from, to:data.to});
      that.state = 'established';

    };

    /*
    * Accept an incoming call.
    */
    acceptCall(voiceId, callback) {
      console.log("Accepting call");
      that.socket.emit('accept-call', {voice_id:voiceId}, (response) => {
        console.log("Received response", JSON.stringify(response));
        if(callback) callback(response);
      });
    };

    disconnect() {
      console.log("Sending socket disconnect event to the server");
      that.socket.disconnect();
    };
}
//let user_data = {'name':'Ravi', 'rooms':'6024df4615081f57abba00a3', 'phone':'12028528186'};
//let user_data = {'name':'Ravi', 'rooms':'6024df4615081f57abba00a3', 'phone':'918652908327'};
//var dialer = new EnxDialer('http://127.0.0.1:8444/', user_data);
/*dialer.connectCall({"from":"12028528186", "to":"918088394833", "room":"6024df4615081f57abba00a3"}, (response) => {
    console.log("Received response " + JSON.stringify(response));
    if(response.result === 0 && response.state === 'initiated') dialer.cancelCall(response.voice_id);
});*/

exports.EnxDialer = EnxDialer;

