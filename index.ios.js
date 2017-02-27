'use strict';
import NetworkImage from 'react-native-image-progress';
import Progress from 'react-native-progress';
import Swiper from 'react-native-swiper';
import ShakeEvent from 'react-native-shake-event';
import RandManager from './RandManager.js';
import Utils from './Utils.js';
import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  Dimensions,
  View,
  ActivityIndicator,
  PanResponder,
  CameraRoll,
  AlertIOS
} from "react-native"

let {width, height} = Dimensions.get('window');

const NUM_WALLPAPERS = 5;
const DOUBLE_TAP_DELAY = 300; // milliseconds
const DOUBLE_TAP_RADIUS = 20;

export default class WeatherGuide extends Component{

      constructor(props) {
        super(props);
        this.handlePanResponderGrant = this.handlePanResponderGrant.bind(this);
        this.onMomentumScrollEnd = this.onMomentumScrollEnd.bind(this);
        this.state = {
          wallsJSON: [],
          isLoading: true
        };

        this.imagePanResponder = {};

        // Previous touch info
        this.prevTouchInfo = {
          prevTouchX: 0,
          prevTouchY: 0,
          prevTouchTimeStamp: 0
        };

        this.currentWallIndex = 0;

      }

      componentDidMount() {
        this.fetchWallsJSON();
      }

      componentWillMount() {
        this.imagePanResponder = PanResponder.create({
          onStartShouldSetPanResponder: this.handleStartShouldSetPanResponder,
          onPanResponderGrant: this.handlePanResponderGrant,
          onPanResponderRelease: this.handlePanResponderEnd,
          onPanResponderTerminate: this.handlePanResponderEnd
        });

        // Fetch new wallpapers on shake
        ShakeEvent.addEventListener('shake', () => {
          this.initialize();
          this.fetchWallsJSON();
        });
      }

      render() {
        let {isLoading} = this.state;
        if(isLoading)
          return this.renderLoadingMessage();
        else
          return this.renderResults();
      }

      initialize() {
        this.setState({
          wallsJSON: [],
          isLoading: true
        });

        this.currentWallIndex = 0;
      }

      saveCurrentWallpaperToCameraRoll() {
        let {wallsJSON} = this.state;
        let currentWall = wallsJSON[this.currentWallIndex];
        let currentWallURL = `https://unsplash.it/${currentWall.width}/${currentWall.height}?image=${currentWall.id}`;

        this.setState({isLoading:true});

        CameraRoll.saveToCameraRoll(currentWallURL, 'photo')
        .then((response) => {
          this.setState({
              isLoading: false
          });
          AlertIOS.alert(
            'Saved',
            'Wallpaper successfully saved to Camera Roll',
            [
              {text: 'Ok!', onPress: () => console.log('OK Pressed!')}
            ]
          );
        }).catch( error => console.log('Error saving to Camera Roll', error) );
      }

      isDoubleTap(currentTouchTimeStamp, {x0, y0}) {
        let {prevTouchX, prevTouchY, prevTouchTimeStamp} = this.prevTouchInfo;
        let dt = currentTouchTimeStamp - prevTouchTimeStamp;

        return (dt < DOUBLE_TAP_DELAY && Utils.distance(prevTouchX, prevTouchY, x0, y0) < DOUBLE_TAP_RADIUS);
      }

      onMomentumScrollEnd(e, state, context) {
        this.currentWallIndex = state.index;
      }

      handleStartShouldSetPanResponder(e, gestureState) {
        return true;
      }

      handlePanResponderGrant(e, gestureState) {
        let currentTouchTimeStamp = Date.now();

        if( this.isDoubleTap(currentTouchTimeStamp, gestureState) )
          this.saveCurrentWallpaperToCameraRoll();

        this.prevTouchInfo = {
          prevTouchX: gestureState.x0,
          prevTouchY: gestureState.y0,
          prevTouchTimeStamp: currentTouchTimeStamp
        };
      }

      handlePanResponderEnd(e, gestureState) {
        console.log('Finger pulled up from the image');
      }

      fetchWallsJSON() {
        fetch('https://unsplash.it/list')
          .then( response => response.json() )
          .then( jsonData => {
            let randomIds = RandManager.uniqueRandomNumbers(NUM_WALLPAPERS, 0, jsonData.length);
            let walls = [];
            randomIds.forEach(randomId => {
              walls.push(jsonData[randomId]);
            });

            this.setState({
              isLoading: false, // update isLoading
              wallsJSON: [].concat(walls)
            });
          })
        .catch( error => console.log('JSON Fetch error: ' + error) );
      }

      renderLoadingMessage() {
        return (
          <View style={styles.loadingContainer}>
            <Text style={{color: '#fff'}}>Please wait...</Text>
            <ActivityIndicator
              animating={true}
              color={'#fff'}
              size={'small'}
              style={{margin: 15}} />
          </View>
        );
      }

      renderResults() {
        let {wallsJSON, isLoading} = this.state;
        if ( !isLoading) {
        return (
          <View>
          <Swiper
            dot={<View style={{backgroundColor:'rgba(255,255,255,.4)', width: 8, height: 8,borderRadius: 10, marginLeft: 3, marginRight: 3, marginTop: 3, marginBottom: 3,}} />}
            activeDot={<View style={{backgroundColor: '#00BFFF', width: 10, height: 10, borderRadius: 7, marginLeft: 7, marginRight: 7}} />}
            onMomentumScrollEnd={this.onMomentumScrollEnd}
            index={this.currentWallIndex}>
            {wallsJSON.map((wallpaper, index) => {
              return(
                <View key={wallpaper.id}>
                    <NetworkImage
                      source={{uri: `https://unsplash.it/${wallpaper.width}/${wallpaper.height}?image=${wallpaper.id}`}}
                      threshold={0}
                      style={styles.wallpaperImage}
                      {...this.imagePanResponder.panHandlers}>

                        <Text style={styles.label}>Photo by</Text>
                        <Text style={styles.label_authorName}>{wallpaper.author}</Text>
                    </NetworkImage>
                </View>
              );
            })}
          </Swiper>
          </View>
        );
      }

    };
}


const styles = StyleSheet.create({
  loadingContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000'
  },

  wallpaperImage: {
    flexGrow: 1,
    width: width,
    height: height,
    backgroundColor: '#000'
  },

  label: {
    position: 'absolute',
    color: '#fff',
    fontSize: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 2,
    paddingLeft: 5,
    top: 20,
    left: 20,
    width: width/2
  },

  label_authorName: {
    position: 'absolute',
    color: '#fff',
    fontSize: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 2,
    paddingLeft: 5,
    top: 41,
    left: 20,
    fontWeight: 'bold',
    width: width/2
  }
});

AppRegistry.registerComponent('WeatherGuide', () => WeatherGuide);
