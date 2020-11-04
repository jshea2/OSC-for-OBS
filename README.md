# Node-OBSosc
## Uses [Node.js](https://nodejs.org/) to control and listen to [OBS](https://obsproject.com/) via OSC protocol
### Requires:

### [OBS](https://obsproject.com/), [obs-websocket](https://github.com/Palakis/obs-websocket/releases), [Node.js](https://nodejs.org/), [obs-websocket-js](https://github.com/haganbmj/obs-websocket-js), & [node-osc](https://github.com/MylesBorins/node-osc).




Example Video using Qlab to OBS and also OBS to Qlab via OSC:


<a href="https://youtu.be/Cpwnjzxs-WM
" target="_blank"><img src="http://img.youtube.com/vi/Cpwnjzxs-WM/0.jpg" 
alt="Node-OBSosc Example Video" width="300" height="180" border="10" /></a>
#
## Installation and Setup:

- Download and Install [OBS](https://obsproject.com/)
- Download and Install [obs-websocket](https://github.com/Palakis/obs-websocket/releases) plugin
- Download and Install [Node.js](https://nodejs.org/)
- Clone or Download this repository
- Open in preferred source code editor (ex. [Visual Studio Code](https://code.visualstudio.com/download) or Terminal/Command Prompt)
  - If you use Visual Studio Code...
  - Go to "View > Command Palette..."
  -  Type "Git: Clone" [Enter]
  -  Paste the Github Clone HTTPS URL. This is the same as the URL just with ".git" added to the end (https://github.com/jshea2/Node-OBSosc.git)
- Open code editor's Terminal
- Install obs-websocket-js & node-osc: `npm install` (installs dependencies from 'package.json')
  
  
  
  or install seperately
  - `npm install obs-websocket-js`
  - `npm install node-osc`
  
  

  (Use `sudo` if on Mac)
 
 
 - In file 'Node-OBSosc.js' change config info.
 
  
  Configure this to match your OBS Websocket plugin:

``` javascript
//OBS Config
const obsIp = "127.0.0.1"
const obsPort = 4444;
const obsPassword = "secret"
```


Configure your OSC application to send to this IP and Port (Node recieves OSC Messages on this IP and Port and Converts to OBS Websocket):
``` javascript
//OSC Server (IN) Config
const oscServerIp = "127.0.0.1";
const oscPortIn = 3333;
```


Configure your OSC application to listen on this IP and Port (OBS Websocket sends to Node, then sends OSC Messages to this IP and Port):
```javascript
//OSC Client (OUT) Config
const oscClientIp = "127.0.0.1";
const oscPortOut = 53000;
```

- Save file, then Run "Node-OBSosc.js" in Terminal: 
    
    `node Node-OBSosc.js` 


  or  

  `npm start`
#
## Using Node-OBSosc

Once you run "Node-OBSosc.js" it will log IP and Port info, number of available scenes, and a list of all scenes with numbers, this is what you use as an argument in your **/scene** OSC message.

### Application -> OBS 

This can be used in any application that transmits and recieves OSC. This was mainly designed for Qlab, so to get started with examples of all the OSC commands below; do the following: 

- Download the "Examples" folder where you'll find "OBS Scene Collection Example.json" and "Qlab OSC Examples.qlab4".
- *Import* "OBS Scene Collection Example.json" into OBS from the *Scene Collection* tab.
- Open "Qlab OSC Examples.qlab4" in Qlab 4 (Make sure you have a Qlab license that allows OSC, which should be all except the free one.. sorry)

#
## OSC Command List:


### **- Triggering Scenes: -**


**`/scene [index number]`**  this message will activate a scene with the index associated from the logged list. 
(Ex. "**/scene 1**" will activate the first scene in OBS, also floats will be rounded down (Ex. **/scene 1.9** === **/scene 1**))


**`/scene/[scene_name]`** this message allows you to activate a scene by name in the OSC string. (Ex. **"/scene/Wide"** will activate a scene named "Wide" in OBS. **NOTE:** If a scene name contains a SPACE, replace with "_", so if OBS has a scene "Webcam 1" make OSC message "**/scene/Webcam_1**")


**`/scene [scene name]`** this message allows you to activate a scene by name in the OSC argument. (Ex. **"/scene Wide"** will activate a scene named "Wide" in OBS.) **NOTE:** SPACES will work ok for this format, so "**/scene Webcam 1**" is valid syntax

**`/go`**  this message will go to the next scene in the list, if this is triggered on the last scene it will go to the first scene


**`/back`**  this message will go to the previous scene in the list, if this is triggered on the first scene it will go to the last scene


### **- Change Transition Type and Duration: -**
**`/transition [name] [duration]`**  this message sets the desired transition and duration(in milliseconds).
(Ex. "**/transition Cut**" will change the current Scene Transition to "Cut". "**/transition Fade 500**" will set the current Scene Transition to "Fade" with a "500" millisecond duration. If you do not set a duration in the 2nd argument it will keep the current duration and log it in node.

### **- Change Source Visibility On/Off: -**
**`/[scene_name]/[source_name]/visible [0 or 1]`** this message will turn on or off the source's visibility. (Ex. "**/Webcam_1/Audio_Input_Capture/visible 0**" will turn OFF "Audio Input Capture" source in OBS from scene "Webcam 1". Where as "**/Webcam_1/Text_1/visible 1**" will turn it ON). **NOTE:** If a scene name or source name contains a SPACE, replace with "_", so if OBS has a scene "Webcam 1" and a source name of "Text 1" make OSC message the example from above.)

### **- Change Opacity: -**
**`/[source_name]/[color_correction_filter_name]/opacity [0 thru 1]`** this message allows you to adjust the Opacity of a source via the "Color Correction" filter in OBS of the current scene. (Ex. "**/Text_1/Color_Correction 0.5**" will make "Text 1" half transparent. **NOTE:** If a source name or filter name contains a SPACE, replace with "_", so if OBS has a source "Text 1" and filter "Color Correction" make OSC message the example from above)

### **- Translate Source's Position: -**
**`/[scene_name]/[source_name]/position [x] [y]`** this allows you to change the sources position by x and y values. This also changes the alignment to center the bounding box to the x and y values. (Ex. "**/Webcam_1/Text_1/position 0 0**" this changes the source to center of the screen. See "Qlab OSC Examples" file for how to automate positions. **NOTE:** This is only tested for a "Canvas Size" of 1920x1080 in OBS. Also, If a scene name or source name contains a SPACE, replace with "_", so if OBS has a scene "Webcam 1" and a source name of "Text 1" make OSC message the example from above.) 

### **- Translate Source's Scale: -**
**`/[scene_name]/[source_name]/scale [float]`** this allows you to change the source's scale. "0" is nothing, "1" is original full size. Negative numbers will invert the source. Numbers larger than "1" will be larger than original size. (Ex. **/Webcam_1/Text_1/scale 2** this will make the size of the "Text 1" source twice as large. See "Qlab OSC Examples" file for how to automate scale. Also, If a scene name or source name contains a SPACE, replace with "_", so if OBS has a scene "Webcam 1" and a source name of "Text 1" make OSC message the example from above.)

### **- Streaming and Recording: -**

**`/startRecording`**  this message will start recording in OBS


**`/stopRecording`**  this message will stop recording in OBS


**`/toggleRecording`**  this message will toggle the start/stop recording button in OBS


**`/startStreaming`**  this message will start streaming in OBS


**`/stopStreaming`**  this message will stop streaming in OBS


**`/toggleStreaming`**  this message will toggle the start/stop streaming button in OBS


**`/pauseRecording`**  this message will pause the recording in OBS


**`/resumeRecording`**  this message will resume recording in OBS


### **- Studio Mode: -**

**`/enableStudioMode`**   this message enables Studio Mode in OBS (_WARNING:_ This Command Has Caused Some Computers to Crash OBS)


**`/disableStudioMode`**  this message disables Studio Mode in OBS


**`/toggleStudioMode`**  this message toggles Studio Mode on/off in OBS (_WARNING:_ This Command Has Caused Some Computers to Crash OBS)

#
## OBS -> Application


- Configure the prefix and suffix for how you want your OSC application to recieve an OSC string from OBS


(Ex. In OBS when "Wide" scene is activated, Qlab recieves an OSC message "**/cue/Wide/start**")
```javascript
const oscOutPrefix = "/cue/"
const oscOutSuffix = "/start"
```




### This was inspired by the Python version: [ObSC](https://github.com/CarloCattano/ObSC?fbclid=IwAR1zGJ_iFVq9o887hWw71lWaGZKqdAP0mMaVFyXau9x0sDgs-5KjS9HNLrk)


For Questions, Bugs, or Feature Requests


Send me an email: joe.daniel.shea@gmail.com



