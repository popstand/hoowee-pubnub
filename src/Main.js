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
} from 'react-native-webrtc';

import {connect} from './Services/PubnubService';

const configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};


export default class Main extends Component {

  constructor(props){
    super(props);

    this.pc1 = new RTCPeerConnection(configuration);
    this.pc2 = new RTCPeerConnection(configuration);

    this.initCall = this.initCall.bind(this);
    this.getUserMediaCallback = this.getUserMediaCallback.bind(this);
    this.errorCallback = this.errorCallback.bind(this);
    this.onCreateOfferSuccess = this.onCreateOfferSuccess.bind(this);
    this.onCreateAnswerSuccess = this.onCreateAnswerSuccess.bind(this);

    this.state = {
      callStatus: 'READY',
      localStreamUrl: undefined,
      remoteStreamUrl: undefined,
    }
  }

  componentDidMount(){
    connect();
  }

  initCall() {
    if(this.state.callStatus === 'ONGOING') return;

    MediaStreamTrack.getSources(sourceInfos => {
      console.log(sourceInfos);
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
        console.log('dddd', stream);
        this.getUserMediaCallback(stream);
      }, this.errorCallback);
    });
  }

  getUserMediaCallback(stream) {
    console.log('stream --->', stream);
    this.setState({
      callStatus: 'ONGOING',
      localStreamUrl: stream.toURL()
    }, () => this.initConnectionToPeers(stream))
  }

  errorCallback(error) {
    console.log('ERROR --->', error);
  }


  async initConnectionToPeers(stream) {
    const {localStreamUrl} = this.state;
    if(!localStreamUrl) return;

    this.pc1.addStream(stream);

    this.pc2.onaddstream = (event) => {
      console.log('on add stream', event.stream);
      this.setState({
        remoteStreamUrl: event.stream.toURL(),
      })
    };

    this.pc1.createOffer(
      this.onCreateOfferSuccess,
      (error) => {
        console.log('offer error --->', error);
      }
    );


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
      localStreamUrl: undefined,
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
            <RTCView streamURL={this.state.localStreamUrl} style={styles.video}/>
            <RTCView streamURL={this.state.remoteStreamUrl} style={styles.video}/>
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
