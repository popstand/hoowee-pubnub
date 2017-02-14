import PubNub from 'pubnub';

import {config} from '../Config';

const presenceSubscriptions = new Set();
const messageSubscriptons = new Set();

const identifier = () => Math.random().toString(10).slice(12);

let connection;
export const connect = () => {
  if (connection) {
    return connection;
  }
  connection = new Promise((resolve, reject) => {
    const uuid = identifier();
    const options = Object.assign({}, config.client, {uuid});
    console.log('OPTIONS --->', options);
    const pubnub = new PubNub(options);
    console.log('PUBNUB OBJ --->', pubnub);
    const initialHandler = {
      status: statusEvent => {
        switch (statusEvent.category) {
          case 'PNConnectedCategory':
          case 'PNNetworkUpCategory':
            resolve(pubnub);
            break;
          case 'PNDisconnectedCategory':
          case 'PNNetworkDownCategory':
            reject(new Error('Received a network-down message'));
            break;
          default:
            return;
        }
        pubnub.removeListener(initialHandler);
        pubnub.addListener({
          message: function () {
            messageSubscriptons.forEach(
              handler => handler.apply(undefined, arguments));
          },
          presence: function () {
            presenceSubscriptions.forEach(
              handler => handler.apply(undefined, arguments));
          },
          status: statusEvent => {
            switch (statusEvent.category) {
              case 'PNDisconnectedCategory':
              case 'PNNetworkDownCategory':
                connect(); // reconnect
                break;
            }
          },
        });
      },
    };
    pubnub.addListener(initialHandler);
    return handshake(pubnub).then(() => resolve({uuid, pubnub})).catch((error)=>{console.log('ERROR --->', error)});
  });
  return connection;
};

const handshake = pubnub =>
  new Promise((resolve, reject) => {
    pubnub.time(status => {
      if (status.error) {
        reject(new Error(
          `PubNub service failed to respond to time request: ${status.error}`, status));
      }
      else {
        resolve(pubnub);
      }
    });
  });

  export const subscribe = (channel, presenceHandler, messageHandler) => {
    presenceSubscriptions.add(presenceHandler);

    messageSubscriptons.add(messageHandler);

    connect().then(({ pubnub }) => {
      pubnub.subscribe({
        channels: [channel],
        withPresence: true,
      });
    });

    return {
      unsubscribe: () => {
        presenceSubscriptions.delete(presenceHandler);

        messageSubscriptons.delete(messageHandler);

        return connect().then(({pubnub}) => {
          pubnub.unsubscribe({channels: [channel]});
        });
      },
    };
  };

  export const publishMessage = (channel, message) =>
  new Promise((resolve, reject) => {
    connect().then(({ pubnub }) =>
      pubnub.publish({
        channel,
        message,
      },
      (status, response) => {
        if (status.error) {
          reject(status.category);
        }
        else {
          resolve();
        }
      }));
  });
