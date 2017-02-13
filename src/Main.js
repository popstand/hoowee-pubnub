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
} from 'react-native-webrtc';


export default class Main extends Component {

  constructor(props){
    super(props);

    this.initCall = this.initCall.bind(this);
    this.getUserMediaCallback = this.getUserMediaCallback.bind(this);
    this.errorCallback = this.errorCallback.bind(this);

    this.state = {
      callStatus: 'READY',
    }
  }

  initCall() {
    if(this.state.callStatus === 'ONGOING') return;
    this.setState({
      callStatus: 'ONGOING',
    });

    MediaStreamTrack.getSources(sourceInfos => {
      getUserMedia({
        audio: true,
        video: false,
      }, (stream) => {
        console.log('got audio stream --->', stream);
        this.getUserMediaCallback(stream);
      }, this.errorCallback);
    });
  }

  getUserMediaCallback(stream) {
    console.log('stream --->', stream);
  }

  errorCallback(error) {
    console.log('ERROR --->', error);
  }

  finishCall() {
    if(this.state.callStatus === 'READY') return;
    this.setState({
      callStatus: 'READY',
    });
  }

  render() {
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
  }
});
