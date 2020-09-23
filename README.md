# nodeobsosc
## Uses [Node.js](https://nodejs.org/) to control [OBS](https://obsproject.com/) via OSC protocol.
### Requires:

### [OBS](https://obsproject.com/), [obs-websocket](https://github.com/Palakis/obs-websocket/releases), [Node.js](https://nodejs.org/), [obs-websocket-js](https://github.com/haganbmj/obs-websocket-js), & [node-osc](https://github.com/MylesBorins/node-osc).




Example Video using Qlab to OBS and also OBS to Qlab via OSC:


<a href="http://www.youtube.com/watch?feature=player_embedded&v=CKmQ6DJ5EgM
" target="_blank"><img src="http://img.youtube.com/vi/CKmQ6DJ5EgM/0.jpg" 
alt="IMAGE ALT TEXT HERE" width="300" height="150" border="10" /></a>

## Installation and Setup:

- Download and Install [OBS](https://obsproject.com/)
- Download and Install [obs-websocket](https://github.com/Palakis/obs-websocket/releases) plugin
- Download and Install [Node.js](https://nodejs.org/)
- Clone or Download this repository
- Open it preferred source code editor (ex. [Visual Studio Code](https://code.visualstudio.com/download) or Terminal/Command Prompt)
- Open code editor's Terminal
- Install obs-websocket-js & node-osc: `npm install -r requirements.txt`


    or


  - `npm install obs-websocket-js`
  - `npm install node-osc`
  
  
  (Use `sudo` if on Mac)
 
 
 - In file 'node-obsosc.js' change config info
 
  
- Configure this to match your OBS Websocket plugin.

``` javascript
//OBS Config
const obsIp = "127.0.0.1"
const obsPort = 4444;
const obsPassword = "secret"
```


- Configure your OSC application to send to this IP and Port (Node recieves OSC Messages on this IP and Port and Converts to OBS Websocket)
``` javascript
//OSC Server (IN) Config
const oscServerIp = "127.0.0.1";
const oscPortIn = 3333;
```


- Configure your OSC application to listen on this IP and Port (OBS Websocket sends to Node, then sends OSC Messages to this IP and Port)
```javascript
//OSC Client (OUT) Config
const oscClientIp = "127.0.0.1";
const oscPortOut = 53000;
```


- Configure the prefix and suffix for how you want your OSC application to recieve an OSC string from OBS


(Ex. In OBS when "Wide" scene is activated, Qlab recieves an OSC message "/cue/Wide/start")
```javascript
const oscOutPrefix = "/cue/"
const oscOutSuffix = "/start"
```

- Save and Run node-obs-osc.js `node node-obs-osc.js`

## Using Node-OBSosc

Once you run node-obs-osc.js it will log IP and Port info, number of available scenes, and a list of all scenes with numbers, this is what you use as an argument in your **/scene** OSC message.

### Application -> OBS 


### OSC Command List:


**/scene x**  this message will activate a scene with the index associated from the logged list. 


(Ex. "**/scene 1**" will activate the first scene in OBS, also floats will be rounded down (Ex. **/scene 1.9** === **/scene 1**))


**/go**  this message will go to the next scene in the list, if this is triggered on the last scene it will go to the first scene


**/back**  this message will go to the previous scene in the list, if this is triggered on the first scene it will go to the last scene


**/startRecording**  this message will start recording in OBS


**/stopRecording**  this message will stop recording in OBS


**/toggleRecording**  this message will toggle the start/stop recording button in OBS


**/startStreaming**  this message will start streaming in OBS


**/stopStreaming**  this message will stop streaming in OBS


**/toggleStreaming**  this message will toggle the start/stop streaming button in OBS


**/pauseRecording**  this message will pause the recording in OBS


**/resumeRecording**  this message will resume recording in OBS


**/enableStudioMode**   this message enables Studio Mode in OBS (_WARNING:_ This Command Has Caused Some Computers to Crash OBS)


**/disableStudioMode**  this message disables Studio Mode in OBS


**/toggleStudioMode**  this message toggles Studio Mode on/off in OBS (_WARNING:_ This Command Has Caused Some Computers to Crash OBS)



### This was inspired by the Python version: [ObSC](https://github.com/CarloCattano/ObSC?fbclid=IwAR1zGJ_iFVq9o887hWw71lWaGZKqdAP0mMaVFyXau9x0sDgs-5KjS9HNLrk)


