# EnableX Click2Call Application
Enablex provides a Click2Call application to connect the caller and callee to a Virtual Room hosted on the EnableX server.
The client application communicates with Click2Call through Dialer SDK and Click2Call uses call state events to communicate with the client application.

## Dialer SDK
The Dialer SDK is a wrapper/library consisting of methods to communicate with the Click2Call application through Socket events.
This makes Dialer SDK an interface between the client application and Click2Call which is responsible for provisioning voice calls on EnableX rooms hence Dialer SDK is your point of contact to integrate EnableX voice services in your client application. 
The client application can call the Dialer methods to perform the following tasks: 


## Initiate an outbound call
- Accept / Reject an inbound call
- Disconnect an ongoing call.
- Cancel an outgoing call.
- Hold / Resume a call.

