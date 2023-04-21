const { EnxDialer } = require('./dialer');
let user_data = {'name':'Ravi', 'rooms':'6024df4615081f57abba00a3,6024df4615081f57abba00a4,6024df4615081f57abba00a5', 'phone':'12028528186', 'type':'user'};
var dialer = new EnxDialer('http://127.0.0.1:8444/', user_data);
/*let connectParams = {
	host:'https://localhost:8444',
	transport : "websocket",
	reconnect : true,
  secure : true,
	rejectUnauthorized :false
}
*/
dialer.init('https://10.100.1.10:8444');
//dialer.init();
//dialer.login(user_data);
//dialer.handleVoiceEvents();
/*dialer.connectCall({"from":"12028528186", "to":"918088394833", "room":"6024df4615081f57abba00a3"}, (response) => {
    console.log("Received response " + JSON.stringify(response));
    if(response.result === 0 && response.state === 'initiated') dialer.cancelCall(response.voice_id);
});*/
let params = {
  name: "VOICE BROADCAST APP",
  owner_ref : "ENABLEX",
  broadcast_numbers : "[{\"phone\":\"918088394833\"},{\"phone\":\"939972972207\"},{\"phone\":\"14435721398\"},{\"phone\":\"14435721387\"},{\"phone\":\"14435721386\"}]",
  from: "12028528186",
  action_on_connect: {
    play: {
      text : "Welcome to Voice Broadcast testing",
      voice: "Male",
      language: "en-IN",
      prompt_ref: "welcome_prompt"
    }
  },
  call_param: {
    IntervalBetweenRetries: 5000,
    NumberOfRetries: 3
  },
  //event_url: "http://10.100.1.10:3000/event",
  //"call_handler_url": "http://10.100.1.10:3000/event"
}

dialer.makeBroadcastCall('63746c5004b80100105ed7d3','eraMavyjeSymubaTyJyNyruBa5eDaUeSebez',params, (response) => {
//dialer.makeOutboundCall('5e707188e865dc5b724b28e2', 'uMeVany7aPapetamy8uZyMeSuSymyeytaJaN', params,(response) => {
  console.log("Received response " + JSON.stringify(response));
});

dialer.socket.on("callstateevent", function (data) {
  console.log("Received : " + JSON.stringify(data));
  console.log("["+data.voice_id+"]"+ " State: " + dialer.state);
  if(data.state === 'incomingcall') {
    dialer.acceptCall(data.voice_id , (response) => {
      console.log("Accept Call Successfull");
    });
    if(dialer.state === 'online') {
      console.log("Dispatching incoming call notification to the app");
      dialer.emit('incomingcall', data);
    } else {
      //To-Do: To handle call waiting later
      console.log("Already in a call, call waiting is not supported as of now.");
      dialer.rejectCall(data.voice_id);
    }
  } else if(data.state === 'connected' ) {
    dialer.state = 'connected';
    console.log("Dispatching connected notification to the app");
    dialer.emit('connected', data);
  } else if(data.state === 'initiated') {
    console.log("Dispatching initiated event notification to the app");
    dialer.emit('initiated', data);
  } else if(data.state === 'disconnected') {
    dialer.state = 'online';
    console.log("Dispatching disconnected event notification to the app");
    dialer.emit('disconnected', data);
  } else if(data.state === 'bridged') {
    dialer.state = 'bridged'
    console.log("Dispatching call bridged notification to the app");
    dialer.emit('bridged', data);
    setTimeout(() => {
      dialer.disconnectBroadCastCall('63746c5004b80100105ed7d3','eraMavyjeSymubaTyJyNyruBa5eDaUeSebez',data.broadcast_id, data.voice_id,(response) => {
        console.log(`Disconnect Call Response ${JSON.stringify(response)}`);
      });
    }, 10000);
  } else if(data.state === 'room_connected') {
    dialer.state = 'room_connected';
    console.log("Dispatching room connected notification to the app");
    dialer.emit('room_connected', data);
    //setTimeout(dialer.holdCall,5000,data.voice_id);
  } else if(data.state === 'hold_success') {
    dialer.state = 'Mute' 
    console.log("Dispatching Hold notification to the app")
    dialer.emit('Mute', data);
    //setTimeout(dialer.resumeCall,5000,data.voice_id);
  } else if(data.state === 'resume_success') {
    dialer.state = 'UnMute'
    console.log("Dispatching Resume notification to the app")
    dialer.emit('UnMute', data);
  } else if(data.playstate){
    dialer.playstate = data.playstate;
    console.log(`playstate event received ${data.playstate}`);
    if(data.playstate === 'playfinished' && data.prompt_ref === 'welcome_prompt') {
      /*let playParams = {
        dtmf : true,
        text : 'please press 1 to connect the call to agent',//'Thanks we will disconnect the call',
        voice: 'Female',
        language: 'en-US',
        prompt_ref: 'disconnect_prompt'
      };*/
      let connectParams = {
        from : '12028528186',
        to : '919972972207'
      };
      /*dialer.playBroadCastIVR('63746c5004b80100105ed7d3','eraMavyjeSymubaTyJyNyruBa5eDaUeSebez', data.broadcast_id, data.voice_id , playParams, (response) => {
        console.log("play IVR response " + JSON.stringify(response));
      });*/
      /*dialer.joinRoom('63746c5004b80100105ed7d3','eraMavyjeSymubaTyJyNyruBa5eDaUeSebez', data.voice_id ,'5f83f9743a8ad03af54eab4b', (response) => {
        console.log("play IVR response " + JSON.stringify(response));
      });*/
      /*dialer.connectBroadCastCall('63746c5004b80100105ed7d3','eraMavyjeSymubaTyJyNyruBa5eDaUeSebez', data.broadcast_id, data.voice_id , connectParams, (response) => {
        console.log("connectCall Response" + JSON.stringify(response));
      });*/
      dialer.disconnectBroadCastCall('63746c5004b80100105ed7d3','eraMavyjeSymubaTyJyNyruBa5eDaUeSebez',data.broadcast_id, data.voice_id,(response) => {
        console.log(`Disconnect Call Response ${JSON.stringify(response)}`);
      });
    } else if(data.playstate === 'menutimeout' && data.prompt_ref === 'disconnect_prompt') {
      console.log(`disconnect the call`);
      dialer.disconnectCall('63746c5004b80100105ed7d3','eraMavyjeSymubaTyJyNyruBa5eDaUeSebez',data.voice_id,(response) => {
        console.log(`Disconnect Call Response ${JSON.stringify(response)}`);
      });
    } else if(data.playstate === 'digitcollected') {
      console.log(`digit received ${data.digit}`);
    }
    dialer.emit(dialer.playstate, data);
  } else {
    console.log("Invalid state received on the call state events");
    //dialer.disconnectCall(data.voice_id);
  }
});
