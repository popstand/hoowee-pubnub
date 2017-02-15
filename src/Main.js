import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';

import {
  RTCPeerConnection,
  MediaStreamTrack,
  getUserMedia,
  RTCView,
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';

import {
  connect,
  subscribe,
  publishMessage,
} from './Services/PubnubService';

const configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};

const CHANNEL_NAME = 'HooweeTestRoom';
const JOIN = 'join';
const EXCHANGE = 'exchange';

let pcPeers = {};

export default class Main extends Component {

  constructor(props){
    super(props);

    this.pc = new RTCPeerConnection(configuration);

    this.initCall = this.initCall.bind(this);
    this.getLocalMedia = this.getLocalMedia.bind(this);
    this.errorCallback = this.errorCallback.bind(this);
    this.onCreateOfferSuccess = this.onCreateOfferSuccess.bind(this);
    this.onCreateAnswerSuccess = this.onCreateAnswerSuccess.bind(this);

    this.createPeerConnectionWithPublisher = this.createPeerConnectionWithPublisher.bind(this);

    this.subscribeToChannel = this.subscribeToChannel.bind(this);
    this.onPresenceChange = this.onPresenceChange.bind(this);
    this.onMessageReceived = this.onMessageReceived.bind(this);
    this.publishJoinMessage = this.publishJoinMessage.bind(this);

    this.state = {
      callStatus: 'READY',
      localStream: undefined,
      remoteStream: undefined,
    }
  }

  async componentDidMount(){
    // console.log('COMPONENT DID MOUNT --->');
    await connect();
    // console.log('after connection to pubnub');

    this.subscribeToChannel();

    await this.getLocalMedia();

  }

  componentWillUnmount() {
    this.state.subscription.unsubscribe();
  }

  subscribeToChannel() {
    const channel = CHANNEL_NAME;

    if (this.state.subscription) {
      this.state.subscription.unsubscribe();

    }
    this.setState({
      subscription: subscribe(
        channel,
        p => this.onPresenceChange(p),
        m => this.onMessageReceived(m)
      )
    });
  }

  onPresenceChange(presenceData) {
    console.log('presence change --->', presenceData);
  }

  onMessageReceived(message) {
    // console.log('message --->', message.message);
    if(message.message === JOIN) {
      console.log('-------- CREATE PEER CONNECTION with publisher of the message');
      const peerConnection = this.createPeerConnectionWithPublisher(message.published, true);
      console.log('PEER CONNECTION --->', peerConnection);
    }
    if(message.message.message === EXCHANGE) {
      console.log('----------- EXCHANGE MESSAGE RECEIVED', message.message);
      this.exchange(message)
    }
  }

  async exchange(data) {
    // console.log('EXCHANGE, DATA --->', data);

    function logError(error) {
      console.log("logError", error);
    }

    const fromId = data.publisher;

    let pc;
    if (fromId in pcPeers) {
      // console.log('found pc --->', pcPeers[fromId]);
      pc = pcPeers[fromId];
    } else {
      // console.log('pc didnt exist --->', pcPeers[fromId]);
      pc = await this.createPeerConnectionWithPublisher(fromId, false);
      console.log('PEER CONNECTION --->', pc);
    }
    // console.log('PEER CONNECTION --->', pc);
    if (data.message.sdp) {
      console.log('EXCHANGE SDP --->', data);
      pc.setRemoteDescription(new RTCSessionDescription(data.message.sdp), function () {
        if (pc.remoteDescription.type == "offer")
          pc.createAnswer(function(desc) {
            // console.log('createAnswer', desc);
            pc.setLocalDescription(desc, async () => {
              // console.log('setLocalDescription', pc.localDescription);
              const message = {message: EXCHANGE, 'to': data.publisher, 'sdp': pc.localDescription};
              await publishMessage(CHANNEL_NAME, message);
            }, logError);
          }, logError);
      }, (error) => {console.log('SET REMOTE DESCRIPTION ERROR --->', error)});
    } else {
      // console.log('EXCHANGE CANDIDATE --->', data);
      pc.addIceCandidate(new RTCIceCandidate(data.message.candidate));
    }
  }

  async publishJoinMessage() {
    const {selectedChannel} = this.props;

    const channel = CHANNEL_NAME;

    try {
      const publishPromise = await publishMessage(channel, JOIN);
      console.log('publish promise --->', publishPromise);
    } catch(error){
      console.error('Failed to publish message --->', error);
    };
  }

  getLocalMedia(){
    console.log('getting local media');
    return new Promise((resolve, reject) => {
      MediaStreamTrack.getSources(sourceInfos => {
        console.log('SOURCE INFOS --->', sourceInfos);
        let videoSourceId;
        for (const i = 0; i < sourceInfos.length; i++) {
          const sourceInfo = sourceInfos[i];
          if(sourceInfo.kind == "video" && sourceInfo.facing == "front") {
            videoSourceId = sourceInfo.id;
          }
        }
        getUserMedia({
          audio: true,
          video: {
            mandatory: {
              minWidth: 500, // Provide your own width, height and frame rate here
              minHeight: 300,
              minFrameRate: 30
            },
            facingMode: "user",
            optional: (videoSourceId ? [{sourceId: videoSourceId}] : [])
          }
        }, (stream) => {
          console.log('got stream -->', stream);
          this.setState({
            callStatus: 'ONGOING',
            localStream: stream
          }, () => resolve('success'));
        }, () => reject('error'));
      });
    });
  }


  async initCall() {
    if(this.state.callStatus === 'ONGOING') return;


    console.log('AFTER LOCAL MEDIA ---->', this.state);

    await this.publishJoinMessage();
    console.log('AFTER PUBLISH MESSAGE ---->', this.state);



  }



  errorCallback(error) {
    console.log('ERROR --->', error);
  }


  async createPeerConnectionWithPublisher(publisherId, isOffer) {
    const pc = new RTCPeerConnection(configuration);
    pcPeers[publisherId] = pc;
    function logError(error) {
      console.log("logError", error);
    }

    pc.onicecandidate = async (event) => {
      // console.log('onicecandidate', event.candidate);
      if (event.candidate) {
        const message = {message: EXCHANGE, 'to': publisherId, 'candidate': event.candidate };
        await publishMessage(CHANNEL_NAME, message);
      }
    };

    function createOffer() {
      pc.createOffer(function(desc) {
        // console.log('createOffer', desc);
        pc.setLocalDescription(desc, async () => {
          // console.log('setLocalDescription', pc.localDescription);
          const message = {message: EXCHANGE, 'to': publisherId, 'sdp': pc.localDescription };
          await publishMessage(CHANNEL_NAME, message);
        }, logError);
      }, logError);
    }

    pc.onnegotiationneeded = function () {
      // console.log('onnegotiationneeded');
      if (isOffer) {
        createOffer();
      }
    }

    function getStats() {
      if (pc.getRemoteStreams()[0] && pc.getRemoteStreams()[0].getAudioTracks()[0]) {
        const track = pc.getRemoteStreams()[0].getAudioTracks()[0];
        console.log('GET STATS --->', track);
        pc.getStats(track, function(report) {
          console.log('getStats report', report);
        }, logError);
      }
    }

    function createDataChannel() {
      // console.log('create data channel --->');
    }

    pc.oniceconnectionstatechange = function(event) {
      // console.log('oniceconnectionstatechange', event.target.iceConnectionState);
      if (event.target.iceConnectionState === 'completed') {
        setTimeout(() => {
          getStats();
        }, 1000);
      }
      if (event.target.iceConnectionState === 'connected') {
        createDataChannel();
      }
    };

    pc.onsignalingstatechange = function(event) {
      // console.log('onsignalingstatechange', event.target.signalingState);
    };

    pc.onaddstream = (event) => {
      console.log('on add stream --->', event.stream);
      this.setState({remoteStream: event.stream});
    };

    pc.onremovestream = function (event) {
      console.log('onremovestream', event.stream);
    };

    pc.addStream(this.state.localStream);

    return pc;
  }

  onCreateOfferSuccess(desc) {
    // console.log('Offer from pc1\n' + desc.sdp);

    console.log('pc1 setLocalDescription start');
    this.pc1.setLocalDescription(desc,
      (success) => {
        console.log('PC1 LOCAL DESCRIPTION DONE');
      },
      (error) => {
        console.log('PC1 LOCAL DESCRIPTION ERROR');
      },
    );

    console.log('pc2 setRemoteDescription start');
    this.pc2.setRemoteDescription(desc,
      (success) => {
        console.log('PC2 REMOTE DESCRIPTION DONE');
      },
      (error) => {
        console.log('PC2 REMOTE DESCRIPTION ERROR');
      },
    );

    console.log('pc2 createAnswer start');
    this.pc2.createAnswer(
      this.onCreateAnswerSuccess,
      (error) => console.log('create Answer error -->', error),
    );
  }

  onCreateAnswerSuccess(desc) {
    // console.log('Answer from pc2:\n' + desc.sdp);

    console.log('pc2 setLocalDescription start');
    this.pc2.setLocalDescription(desc,
      (success) => {
        console.log('PC2 LOCAL DESCRIPTION DONE');
      },
      (error) => {
        console.log('PC2 LOCAL DESCRIPTION ERROR');
      },
    );

    console.log('pc1 setRemoteDescription start');
    this.pc1.setRemoteDescription(desc,
      (success) => {
        console.log('PC1 REMOTE DESCRIPTION DONE');
      },
      (error) => {
        console.log('PC1 REMOTE DESCRIPTION ERROR');
      },
    );


  }






  finishCall() {
    if(this.state.callStatus === 'READY') return;
    this.setState({
      callStatus: 'READY',
      localStream: undefined,
    });
  }

  render() {
    console.log('RENDER --->', this.state);
    const {callStatus} = this.state;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../data/assets/images/hoowee-logo-blue.png')}/>
        </View>

        <View style={styles.body}>
          <Text style={styles.instructions}>
            To get started, click the dial image.
          </Text>
          {callStatus === 'READY' && <TouchableOpacity onPress={() => this.initCall()}>
            <Image style={styles.dialImage} source={require('../data/assets/images/answer.png')}/>
          </TouchableOpacity>}
          {callStatus === 'ONGOING' && <TouchableOpacity onPress={() => this.finishCall()}>
            <Image style={styles.dialImage} source={require('../data/assets/images/cancel.png')}/>
          </TouchableOpacity>}

          <View style={styles.videos}>
            <RTCView streamURL={this.state.localStream? this.state.localStream.toURL() : undefined} style={styles.video}/>
            <RTCView streamURL={this.state.remoteStream ? this.state.remoteStream.toURL() : undefined} style={styles.video}/>
          </View>
        </View>

        <View style={styles.footer}>
        </View>

      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  header: {
    flex: 3,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  body: {
    flex: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: 200,
    height: 150,
  },
  videos: {
    flexDirection: 'row'
  },
  footer: {
    flex: 2,
  },
  instructions: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333333',
    marginBottom: 10,
  },
  dialImage: {
    width: 40,
    resizeMode: 'contain',
  },
});
