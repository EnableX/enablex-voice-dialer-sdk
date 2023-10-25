# EnableX Click2Call Application: Seamless Integration with Dialer SDK for Voice Communication
EnableX Click2Call Application: Seamlessly Connect Callers and Callees to Virtual Rooms

EnableX offers a robust Click2Call application designed to facilitate the connection between callers and callees within a Virtual Room hosted on the EnableX server. This communication is achieved through the Dialer SDK, which serves as a vital wrapper/library, leveraging Socket events for smooth interaction. 

Dialer SDK
The Dialer SDK acts as a bridge connecting the client application with Click2Call, enabling efficient provisioning of voice calls in EnableX rooms. Consequently, the Dialer SDK becomes the primary interface for integrating EnableX voice services into your client application. With Dialer SDK, the client application can effortlessly execute various tasks, including:

1. Initiating outbound calls.
2. Accepting or rejecting inbound calls.
3. Disconnecting ongoing calls.
4. Canceling outgoing calls.
5. Holding or resuming calls.

This comprehensive integration enhances your application's capabilities and ensures a seamless voice communication experience for your users.
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

