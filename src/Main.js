import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';

import {
  MediaStreamTrack,
  getUserMedia,
  RTCView,
} from 'react-native-webrtc';


export default class Main extends Component {

  constructor(props){
    super(props);

    this.initCall = this.initCall.bind(this);
    this.getUserMediaCallback = this.getUserMediaCallback.bind(this);
    this.errorCallback = this.errorCallback.bind(this);

    this.state = {
      callStatus: 'READY',
      streamURL: undefined,
    }
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
      streamURL: stream.toURL()
    })
  }

  errorCallback(error) {
    console.log('ERROR --->', error);
  }

  finishCall() {
    if(this.state.callStatus === 'READY') return;
    this.setState({
      callStatus: 'READY',
      streamURL: undefined,
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
          <RTCView streamURL={this.state.streamURL} style={styles.video}/>
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
