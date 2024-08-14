# OSC for OBS
#### Control and listen to [OBS](https://obsproject.com/) via OSC protocol

![OSCforOBS copySmall](https://user-images.githubusercontent.com/70780576/109406368-3c793e00-792d-11eb-90f0-bca884b79e80.png)

## Setup
*Requires: [obs-websocket plugin](https://github.com/Palakis/obs-websocket/releases) v5.0 and above (This is included in OBS v28)*

* NOTE:  *If you're using obs-websocket v4.9 and lower download [*OSC for OBS (v2.7.1)*](https://github.com/jshea2/OBSosc/releases)*

## [Download OSC for OBS (v3.0) Now](https://github.com/jshea2/OSC-for-OBS/releases/tag/v3.0)

<img width="350" alt="Screen Shot 2021-11-21 at 4 17 23 PM" src="https://user-images.githubusercontent.com/70780576/191876659-ebf6c5eb-40da-4725-ba50-1ac28658c377.png">


- [Download *OSC for OBS*](https://github.com/jshea2/OBSosc/releases) 

-Make sure you place the application in a folder with permissions to read and write:
   - If on Mac: Place *OSC for OBS* in Applications folder
   - If on PC: Place *OSC for OBS* in a root folder such as C:/
       -  If you don't you might get [this error](https://github.com/jshea2/OSC-for-OBS/blob/master/README.md#troubleshooting) on close
- Configure the input fields 
- Successfully "Connect" 
- The window will open a "DevTools" window
     - Make sure it's on the "Console" tab, not "Elements"
- In the "Console" tab it will log IP and Port info, the number of available scenes, and a list of all scenes with numbers 
  - This can be used as an index argument in your **/scene** OSC message
- To save a config file with "Save As" please "Connect" first
- When you close *OSC for OBS* it will save your configuration for when you open next
- There is an option in 'File > Automatically Connect on Startup' that if enabled will automatically connect on opening *OSC for OBS*

## Application OSC -> OSC for OBS 

- In your OSC Application (QLab for example) patch your targeted OSC to match the "OSC IN" inputs on OSC for OBS.
  - default is... IP: `127.0.0.1`, Port: `3333`
- **DO NOT** Use UNDERSCORES in OBS. Only use them in your OSC Address. So, If your OBS Scene or Source name contains a SPACE, then in your OSC message replace the SPACE with an UNDERSCORE.
  - *Example:* if OBS Scene name is `Scene 1`, then your OSC address should use `Scene_1`.
    - *Note:* If OBS names contain UNDERSCORES this will not work. 
- OSC for OBS can be used for any application that transmits and/or receives unbundled OSC. 
  - This was designed with QLab, so the example show file of all the OSC commands is available in Assets on the Github or in the downloaded folder: "Qlab OBSosc Examples.qlab4" 
    - **Note:** Sending OSC Commands requires a paid version of Qlab.
 
#
# OSC Command List:

*Note: a space in the notated syntax indicates the separation between address and argument's*

*Example:* `/scene "Scene 1"` would be...

| address | argument 1 | argument 2 | argument ect... |
|---------|------------|------------|-----------------|
| /scene  | Scene 1    |            |                 |

#
## **- Trigger Scenes: -**
#

### by Name in Argument
**`/scene [scene name]`** 
- activate a scene by name in the OSC argument. 
    - *Example:* **`/scene Wide`** will activate a scene named "Wide" in OBS. 
   - *Note:* SPACES will work ok for this format, so `/scene Webcam 1` is valid syntax
   - In QLab you can use quotations to wrap into a single argument: `/scene "Webcam 1"`

### by Index as Scene
**`/scene [index number]`** 
- activate a scene with the index associated from the logged list. 
    - *Example:* `/scene 1` will activate the first scene in OBS.
  - *Note:* Floats will be rounded down.
    - *Example:* `/scene 1.9` = `/scene 1`

### by Name in Address
**`/scene/[scene_name]`** 
- activate a scene by name in the OSC address. 
  - *Example:* `/scene/Wide` will activate a scene named "Wide" in OBS. 
  - *Note:* If a scene name contains a SPACE, replace with "_", so if OBS has a scene "Webcam 1" make OSC message: `/scene/Webcam_1`

### by TouchOSC
**`/scene/[scene_name]`**
Value `0` to `1`
- activates a scene with name in address and a value of 1 with TouchOSC
   - *Example:* `/scene/Wide` and a value of `0` to `1` will activate the scene "Wide" in OBS
   - *Note:* If a scene name contains a SPACE, replace with "_", so if OBS has a scene "Webcam 1" make OSC message: `/scene/Webcam_1`
   - See "OBS -> Application" for feedback of active scenes
  
### Next Scene
**`/go`**  
- activates the next scene in the list, if this is triggered on the last scene it will go to the first scene

###  Previous Scene
**`/back`**  
- activates the previous scene in the list, if this is triggered on the first scene it will go to the last scene

#
## **- Set Transition Type and Duration: -**
#
**`/[type]/transition [duration]`**  
- sets the desired transition and duration(in milliseconds).
  - *Example:* `/Cut/transition` will change the current Scene Transition to "Cut". `/Fade/transition 5000` will set the current Scene Transition to "Fade" with a "5000" millisecond duration (5 seconds). 
    - *Note:* `[type]` must be identical to Transition Type name in OBS:
      - `Fade`, `Cut`, `Stinger`, `Fade_to_Color`, `Luma_Wipe`, `Slide`, `Swipe`, and Custom Transition Names. This also works with the `Move` [plugin](https://obsproject.com/forum/resources/move-transition.913/).
    - If you do not set a duration in the 1st argument it will keep the current duration and log what it is.
#
## **- Set Source Visibility On/Off: -**
#
**`/[scene_name]/[source_name]/visible [0, off, false or 1, on, true]`** 
- turn on or off the source's visibility. 
  - *Example:* `/Webcam_1/Audio_Input_Capture/visible 0` will turn OFF "Audio Input Capture" source in OBS from scene "Webcam 1". Where as `/Webcam_1/Text_1/visible 1` will turn it ON. 
  - *NOTE:* If a scene name or source name contains a SPACE, replace with "_", so if OBS has a scene "Webcam 1" and a source name of "Text 1" make OSC message the example from above.
#
## **- Set Filter Visibility On/Off: -**
#
**`/[scene_name]/[source_name]/filterVisibility [0, off, false or 1, on, true]`** 
- turn on or off the source's filter visibility.
  -  *Example:* `/Video_Input/Color_Correction/filterVisibiltity 0` will turn OFF filter named "Color Correction" in OBS from source "Video Input". Where as `/Video_Input/Color_Correction/filterVisibility 1` will turn it ON. 
  - *Note:* If a filter name or source name contains a SPACE, replace with "_", so if OBS has a filter "Color Correction" and a source name of "Video Input" make OSC message the example from above.

#
## **- Set Text (for FreeType 2 ONLY): -**
#
**`/[source_name]/setText [text content] [size(optional)] [font (optional)]`**
- change text content, size, and font.
  - *Note:* Size and Font are optional
  - *Note:* This will not work with 'GDI+', so use 'FreeType 2' instead. On PC you can find it in 'Add > Depricated' 
  - *Example:* `/text_1/setText "Hello World."` will change the text contents of source "text 1" to "Hello World."
  - *Example 2:* `/text_1/setText "Hello World." 150 Arial` will change the same as above and change the size to 150 pt and Font to 'Arial'
  
#
## **- Set Opacity: -**
#
**`/[source_name]/[color_correction_filter_name]/opacity [0 thru 1]`** 
- adjust the Opacity of a source via the "Color Correction" filter in OBS of the current scene.
  - *Example:* `/Text_1/Color_Correction/opacity 0.5` will make "Text 1" half transparent. 
  - *Note:* If a source name or filter name contains a SPACE, replace with "_", so if OBS has a source "Text 1" and filter "Color Correction" make OSC message the example from above)
#
## **- Set "Color Correction" Filter Properties: -**
#
### Gamma
**`/[source_name]/[color_correction_filter_name]/gamma [-3 thru 3]`** 
- Adjust the Gamma of a source via the "Color Correction" filter in OBS of the current scene.
  - `0` is the default vaule
  - *Example:* `/Text_1/Color_Correction/gamma 3` will make "Text 1" gamma at highest setting. 
  - *Note:* If a source name or filter name contains a SPACE, replace with "_", so if OBS has a source "Text 1" and filter "Color Correction" make OSC message the example from above)

### Contrast
**`/[source_name]/[color_correction_filter_name]/contrast [-2 thru 2]`** 
- Adjust the Contrast of a source via the "Color Correction" filter in OBS of the current scene.
  -  `0` is the default vaule
  - *Example:* `/Text_1/Color_Correction/contrast 2` will make "Text 1" contrast at highest setting. 
  - *Note:* If a source name or filter name contains a SPACE, replace with "_", so if OBS has a source "Text 1" and filter "Color Correction" make OSC message the example from above)

### Brightness
**`/[source_name]/[color_correction_filter_name]/brightness [-1 thru 1]`** 
- Adjust the Brightness of a source via the "Color Correction" filter in OBS of the current scene.
  - `0` is the default vaule
  - *Example:* `/Text_1/Color_Correction/brightness 1` will make "Text 1" brightness at highest setting. 
  - *Note:* If a source name or filter name contains a SPACE, replace with "_", so if OBS has a source "Text 1" and filter "Color Correction" make OSC message the example from above)


### Saturation
**`/[source_name]/[color_correction_filter_name]/saturation [-1 thru 5]`** 
- Adjust the Contrast of a source via the "Color Correction" filter in OBS of the current scene.
  - `0` is the default vaule
  - *Example:* `/Text_1/Color_Correction/contrast 5` will make "Text 1" saturation at highest setting. 
  - *Note:* If a source name or filter name contains a SPACE, replace with "_", so if OBS has a source "Text 1" and filter "Color Correction" make OSC message the example from above)

### Hue Shift
**`/[source_name]/[color_correction_filter_name]/hueShift [-180 thru 180]`** 
- Adjust the Contrast of a source via the "Color Correction" filter in OBS of the current scene.
  - `0` is the default vaule
  - *Example:* `/Text_1/Color_Correction/contrast 180` will make "Text 1" hue shift at highest setting. 
  - *Note:* If a source name or filter name contains a SPACE, replace with "_", so if OBS has a source "Text 1" and filter "Color Correction" make OSC message the example from above)

#
## **- Translate Source's Position: -**
#
**`/[scene_name]/[source_name]/position [x] [y]`** 
- change sources position by x and y values. This also changes the alignment to center the bounding box to the x and y values. 
  - *Example:* `/Webcam_1/Text_1/position 0 0` this changes the source to center of the screen, as long as the alignment is cewnter. See "Qlab OSC Examples" file for how to automate positions.
  - *Note:* This is only tested for a "Canvas Size" of 1920x1080 in OBS. Also, If a scene name or source name contains a SPACE, replace with "_", so if OBS has a scene "Webcam 1" and a source name of "Text 1" make OSC message the example from above.
#
## **- Translate Source's Scale: -**
#
**`/[scene_name]/[source_name]/scale [float]`** 
- change the source's scale. `0` is nothing, `1` is original full size. Negative numbers will invert the source. Numbers larger than "1" will be larger than original size. 
  - *Example:* `/Webcam_1/Text_1/scale 2` this will make the size of the "Text 1" source double the size of original. 
  - *Note:* See "Qlab OSC Examples" file for how to automate scale. Also, If a scene name or source name contains a SPACE, replace with "_", so if OBS has a scene "Webcam 1" and a source name of "Text 1" make OSC message the example from above.)
#
## **- Translate Source's Rotation: -**
#
**`/[scene_name]/[source_name]/rotate [float]`**
- change the source's scale. `0` is nothing, `360` is full 360 rotation clockwise. Negative numbers will rotate counterclockwise. Numbers larger than "360" will be more roations. 
  - *Example:* `/Webcam_1/Text_1/rotate 90` this will make the rotation of the "Text 1" source 90º clockwise. 
  - *Note:* See "Qlab OSC Examples" file for how to automate rotation. Also, If a scene name or source name contains a SPACE, replace with "_", so if OBS has a scene "Webcam 1" and a source name of "Text 1" make OSC message the example from above.)
#
## **- Audio Controls: -**
#
### Mute
**`/[source_name]/mute`**
- Mute the specified source

### Unmute
**`/[source_name]/unmute`**
- Unmute the specified source

### Toggle Audio
**`/[source_name]/audioToggle [0 or 1]`**
- Unmute and Mute the specified source by toggling

### Volume
**`/[source_name]/volume [0 thru 1]`**
- Adjust specified source's volume.
  - *Example:* `/Audio_Input/volume 0.5` sets source "Audio_Input" audio to 50% volume

### Monitor Off
**`/[source_name]/monitorOff`**
- Sets source's audio monitor type to "Monitor Off"
  - *Example:* `/Audio_Input/monitorOff` sets audio source "Audio Input" to "Monitor Off".
  - *Note:* This does work, but you won't see a visual change on OBS unless you close "Advaced Audio" window and reopen.

### Monitor Only
**`/[source_name]/monitorOnly`**
- Sets source's audio monitor type to "Monitor Only"
  - *Example:* `/Audio_Input/monitorOnly` sets audio source "Audio Input" to "Monitor Only".
  - *Note:* This does work, but you won't see a visual change on OBS unless you close "Advaced Audio" window and reopen.

### Monitor and Output
**`/[source_name]/monitorAndOutput`**
- Sets source's audio monitor type to "Monitor and Output"
  - *Example:* `/Audio_Input/monitorAndOutput` sets audio source "Audio Input" to "Monitor and Output".
  - *Note:* This does work, but you won't see a visual change on OBS unless you close "Advaced Audio" window and reopen.

#
## **- Media Controls: -**
#

### Play
**`/[source_name]/mediaPlay`**
- Play specified "Media Source"

### Pause
**`/[source_name]/mediaPause`**
- Pause specified "Media Source"

### Restart
**`/[source_name]/mediaRestart`**
- Restart specified "Media Source"

### Stop
**`/[source_name]/mediaStop`**
- Stop specified "Media Source"

### Cursor
**`/[source_name]/mediaCursor [int]`**
- Sets the cursor position of specified "Media Source"
#
## **- Browser Controls: -**
#
**`/[browser_source]/refreshBrowser`**
- Refresh specified Browser Source in OBS

#

## **- Projector Controls: -**
#

**`/[type]/openProjector [display_number] [sceneorsource_name]`**
- Opens type of projector to specified display
- `[type]` options: 
  - `StudioProgram`, `Multiview`, `Preview`, `Scene`, `Source`
- `[display_number]` is an integer
  - *Example:* `0` would be your main screen and `1` would be your secondary monitor
  - *Note:* If you use `-1` or empty(`null`), then this would make a windowed projector of specified `[type]`
- `[sceneorsource_name]` is an **optional** for the 2nd argument. This can **ONLY** be used if using `Scene` or `Source` for `[type]`
  - This would be the name of a Source or Scene in OBS that would open a specified projector
- *Examples:*
  - `/StudioProgram/openProjector 1`
    - This would open a Studio Program Feed on the secondary monitor 
  - `/Preview/openProjector`
    - This would open a Preview Feed in a windowed projector
  - `/Scene/openProjector 0 "Scene 1"`
    - This would open a feed from "Scene 1" on the main monitor.
  - `/Multiview/openProjector -1`
    - This would open a Multiview Feed to a windowed projector

#

## **- Studio Mode: -**
#

### Set StudioMode
**`/setStudioMode [0 or 1]`** 
- if argument is `1` then Studio Mode enables, if `0` it disables in OBS

### Enable
**`/enableStudioMode`** 
- enable Studio Mode in OBS

### Disable
**`/disableStudioMode`** 
- disable Studio Mode in OBS

### Toggle
**`/toggleStudioMode`**  
- toggle Studio Mode On/Off in OBS

#
## **- Trigger Preview Scenes: -**
#

### by Name in Argument
**`/previewScene [scene name]`** 
- activate a scene by name in the OSC argument. 
    - *Example:* **`/previewScene Wide`** will activate a scene named "Wide" in the Preview in OBS. 
   - In QLab you can use quotations to wrap into a single argument: `/scene "Webcam 1"`

### by Name in Address
**`/previewScene/[scene_name]`** 
- activate a scene by name in the OSC address. 
  - *Example:* `/previewScene/Wide` will activate a scene named "Wide" in the Preview in OBS. 
  - *Note:* If a scene name contains a SPACE, replace with "_", so if OBS has a scene "Webcam 1" make OSC message: `/previewScene/Webcam_1`

### Trigger Transition to Program
**`/studioTransition [type(optional)] [duration(optional)]`** 
- activate a Transition to Program 
  - *Example:* `/studioTransition "Fade" 5000` will activate a transition of the Preview to Program with a Fade of 5 seconds. 
  
#
## **- Streaming and Recording: -**
#

### Set Recording
**`/setRecording [0 or 1]`**
- start recording if argument is `1` and stop if `0`

### Start Recording
**`/startRecording`**
- start recording in OBS

### Stop Recording
**`/stopRecording`**
- stop recording in OBS

### Toggle Recording
**`/toggleRecording`** 
- toggle the start/stop recording button in OBS

### Pause Recording
**`/pauseRecording`** 
- pause the recording in OBS

### Resume Recording
**`/resumeRecording`** 
- resume recording in OBS


### Set Streaming
**`/setStreaming [0 or 1]`**
- start streaming if argument is `1` and stop if `0`

### Start Streaming
**`/startStreaming`**
- start streaming in OBS

### Stop Streaming
**`/stopStreaming`** 
- stop streaming in OBS

### Toggle Streaming
**`/toggleStreaming`** 
- toggle the start/stop streaming button in OBS

### Set VirtualCam
**`/setVirtualCam [0 or 1]`**
- start VirtualCam if argument is `1` and stop if `0`

### Start VirtualCam
**`/startVirtualCam`**
- start VirtualCam in OBS

### Stop VirtualCam
**`/stopVirtualCam`** 
- stop VirtualCam in OBS

### Toggle VirtualCam
**`/toggleVirtualCam`** 
- toggle the start/stop VirtualCam button in OBS

#
## **- Settings: -**
#

### Set Scene Collection
***`/setSceneCollection [Scene Collection Name]`**
- set the scene collection with the specified name

### Set Profile
***`/setProfile [Profile Name]`**
- set the profile with the specified name

### Set Recording File Path
***`/recFilePath [File Path]`**
- set the profile with the specified name
#

### Set Recording File Name
***`/recFileName [File Name]`**
- set the profile with the specified name
#

## **- NDI and Other Outputs -**
#

### List Outputs NAmes
**`/listOutputs`**
- Logs a list of all available outputs
- *NOTE:* Use names listed for argument in start and stop commands

### Start Output
**`/startOutput [name]`**
- *Example:* `/startOutput "NDI Main Output"`
   - This will enable the "NDI Main Output" output

### Stop Output
**`/stopOutput [name]`**
- *Example:* `/stopOutput "NDI Main Output"`
   - This will disable the "NDI Main Output" output

#
## **- Miscellaneous -**
#

### Renaming
**`/rename [current-name] [new-name]`**
- rename scene or source
   - *Example:* `/rename "Audio" "NewAudio"` will change the source named "Audio" to "NewAudio"

### Send Closed Captions
***`/sendCC [text]`**
- Send the text as embedded CEA-608 caption data
   - *Example:* `/sendCC "Hello world."` will send "Hello world." as an embedded closed caption


### Set Recording File Name
***`/recFileName [string]`**
- sets the name of the file for when you record

### Get Source Text (FreeType2) String Repeatedly
`/[text source]/getTextFreetype [1]`
- Returns to the OSC Client:
     - `/[text_source]/text [string]`
- *NOTE:* Disabling the loop is not yet implemented. Quit and reopen app to stop.
- The loop returns every 500ms (half second)
- ex. Possible use case would be for getting a text source that has a countdown script. 

### Get Source Text (GDI) String Repeatedly
`/[text source]/getTextGDI [1]`
- Returns to the OSC Client:
     - `/[text_source]/text [string]`
- *NOTE:* Disabling the loop is not yet implemented. Quit and reopen app to stop.
- The loop returns every 500ms (half second)
- ex. Possible use case would be for getting a text source that has a countdown script.

### Set Active Scene Item Visibility by Index
-`/[index]/activeSceneItemVisibility [0 or 1]`
   - this uses the index of your sources to control the visibility of active scene.

### Set Specific Scene Item Visibility by Index
-`/[scene_name]/[index]/activeSceneItemVisibility [0 or 1]`
   - this uses the index of your sources to control the visibility of a specific scene.

### Take Screenshot
-`/takeScreenshot`
   - This saves a .png file of your current active scene and saves it to your *Documents* folder

### Trigger Hotkey
-`/[modifier]/[key]/hotkey`
  - This triggers a hotkey from your settings. Not keyboard shortcuts.
  - `modifier` can be `shift` `control` and/or `alt` (order doesn't matter). `key` can be lowercase or uppercase.
  - ex. `/controlshift/f/hotkey`

### Open External File / URL
*Might ask to allow "OSC for OBS" access*
- `/openExternal [string]`
   - this command opens local applications, files, and/or websites with file or url path
   - ex. `/openExternal "https://google.com"`
    - opens google in default browser
   - ex. Mac `/openExternal "file:/System/Applications/Stocks.app"`
   - ex. PC `/openExternal "file://c:/windows/system32/calc.exe"`
    - opens 'Calculator' app
   - ex. Mac `/openExternal "file:/Users/joeshea/Documents/texttest1.png"`
    - opens 'texttest1.png' in default viewer (like Preview)

### Simulate Keypress on Front/Active Window *(BETA)*
*(Java Run Time)[https://www.java.com/en/download/manual.jsp] is required for this feature. After downloading and installing restart computer.*
- `/keypress [string]`
   - this command simulates a keypress on front window. (Use this syntax for keys)[https://github.com/garimpeiro-it/node-key-sender#list-of-key-codes]
   - ex. `/keypress "space"`
    - this simulates a space keypress on the active window
   - ex. `/keypress "h,i"`
    - this simulates a `h` and then an `i` key press to active window
   - ex. `/keypress "control,s"`
    - ex. this simulates a keycombo of `Control + S` to active window
 - *Note:* This feature can send multiple keypresses by using a comma `,`, but using combinations of shift, control, and alt have been buggy. Please refer to (this repository for issues)[https://github.com/garimpeiro-it/node-key-sender]



## **~ Editing Commands While Selected in OBS: ~**
#
*Mainly used for **[TouchOSC](https://hexler.net/products/touchosc)***
- *Layout file included in downloaded folder or in Assets on Github*
- Download and install [TouchOSC Editor](https://hexler.net/products/touchosc) to open "Layout" and import to device
    - <img src="https://user-images.githubusercontent.com/70780576/112069276-c7161d00-8b28-11eb-8021-914f2100b5b0.PNG" 
alt="NodeOBS-ZoomOSC-Autocropper DEMO Video" width="380" border="10" />


### Add Scene Item
**`/addSceneItem [scene_item]`**
- This adds a specified "Scene Item" to the **selected** OBS Scene
  - *Note:* You can find a list of all your "Scene Items" by clicking on the toolbar:
    -  *Scripts > Log All Available Scene Items (Sources)*

### Change Transition Override Type
**`/transOverrideType/[type]`**
- Set Transition Override Type for **selected** OBS Scene.
  - *Note:* `[type]` must be identical to Transition Override Type name in OBS:
  - `Fade`, `Cut`, `Stinger`, `Fade_to_Color`, `Luma_Wipe`, `Slide`, `Swipe`, and a `Custom Named` Transition. This also works with the `Move` [plugin](https://obsproject.com/forum/resources/move-transition.913/).
  - *Example:* `/transOverrideType/Fade_to_Color` will set the Transition Override of the **selected** Scene in OBS to "Fade to Color"

### Change Transition Override Duration
**`/transOverrideDuration [duration]`**
- Set Transition Override Duration for **selected** OBS Scene.
- *Note:* Duration is in milliseconds (1000ms = 1sec)
- *Example:* `/transOverrideDuration 2500` will set the Transition Override duration for the **selected** Scene in OBS to 2.5 seconds.

### Change Scale
**`/size [float]`**
- Translate scale of **selected** OBS Source.
  - `[float]` can take a value with decimal. 
    - *Example:* `0` is nothing, `0.5` is half the size, `1` is original full size. Negative numbers will invert the source. Numbers more than "1" will be larger than original size.

### Change Position X and Y
**`/move [x] [y]`**
- Translate X and Y position from **selected** OBS Source.

### Change Position X
**`/movex [x]`**
- Translate X position from **selected** OBS Source.

### Change Position Y
**`/movey [y]`**
- Translate Y position from **selected** OBS Source.

### Change Alignment
**`/align [int]`**
- Set alignment for **selected** source.
  - *Example:* `/align 0` will center the **selected** OBS Source
  - `[int]` would be an integer value from this guide:

      | 5 | 4 | 6 |
      |----|---|---|
      | 1 | 0 | 2 |
      | 9 | 8 | 10 |

### Change Rotation
**`/spin [int]`**
- Set rotation for **selected** source

### Change Bounds to Fit to screen
**`/fitToScreen`**
- Set bounds to Fit to Screen

### Get Source Settings
**`/getSourceSettings`**
- Logs source properties and settings
  - Mainly used for development and debugging

#

# OBS -> Application:


- Configure "OSC OUT" to target Application

- When *Enabled* his allows OBS to send OSC to other applications when a scene is activated.

- To **use/enable** this function, change the toggle button to ON
Configure the prefix and suffix for how you want your OSC application to receive an OSC string from OBS

  - *Example:* In OBS when a Scene named "Wide Shot" is activated, Qlab recieves an OSC message "**/cue/Wide_Shot/start**")

## TouchOSC Feedback:

When *Checked* this sends OSC messages back to TouchOSC for dynamic control. 

- OSC Out IP must be the IP of the device using TouchOSC
- OSC Out Slider must be Enabled


### **Active Scene Feedback**

Use the following setup for `/scene` command for a *push button* in TouchOSC Editor:

<img width="257" alt="Screen Shot 2021-04-13 at 4 44 31 PM" src="https://user-images.githubusercontent.com/70780576/114638180-e1eb3580-9c7f-11eb-8300-1b27e275008e.png">

- make sure "Local Feedback" is checked

In OSC for OBS use the following setup:

### **Fader Volume Feedback**

Use the following setup for `/[source]/volume` command for a *fader* in TouchOSC Editor:

<img width="281" alt="Screen Shot 2021-04-19 at 8 33 29 PM" src="https://user-images.githubusercontent.com/70780576/115336527-414fb680-a154-11eb-9bf3-7c2fb4a5f46d.png">

### **Muting/UnMuting Toggle Feedback**

Use the following setup for `/[source]/audioToggle` command for a *toggle button* in TouchOSC Editor:

<img width="252" alt="Screen Shot 2021-04-19 at 8 33 18 PM" src="https://user-images.githubusercontent.com/70780576/115337099-42351800-a155-11eb-930e-edf868ff4033.png">

### **Media Playback Feedback**

#### **Play**
- When a media is played in OBS the following OSC is sent `/[source]/mediaPlay 1`, `/[source]/mediaPause 0`, and `/[source]/mediaStop 0`

#### **Pause**
- When a media is paused in OBS the following OSC is sent `/[source]/mediaPause 1`, `/[source]/mediaPlay 0`, and `/[source]/mediaStop 0`

#### **Stop**
- When a media is stopped in OBS the following OSC is sent `/[source]/mediaStop 1`, `/[source]/mediaPause 0`, and `/[source]/mediaPlay 0`

### **Source Visibility**

- When a source visibility is changed in OBS the following OSC is sent `/[scene]/[source]/visible [0 or 1]` 
   - (`0` if off and `1` if on)

### **Transitions**

#### **Transition Type**
- When a transition is triggered in OBS the following OSC is sent `/transitionType [type]`

#### **Transition Duration**
- When a transition is triggered in OBS the following OSC is sent `/transitionDuration [int]`


### **Stats Label Feedback**

***When Streaming/Recording:***
- `/fps`
   - Returns frames per second `[int] fps`
- `/streaming`
   - Returns `1` if stream started, `0` if stopped
- `/recording`
   - Returns `1` if recording started, `0` if stopped
- `/streamTime`
   - Returns elapsed stream time `HH:MM:SS`
- `/cpuUsage`
   - Returns cpu usage `[int] cpu usage`
- `/freeDiskSpace`
   - Returns free disk space `[int] free disk space`
- `/averageFrameRate`
   - Returns average frame rate `[int] avg frame rate`
- `/memoryUsage`
   - Returns memory usage `[int] memory usage`
- `/kbpsEncoder`
   - Returns encoder data `[int] kbps`

<img width="252" alt="Screen Shot 2021-04-19 at 8 33 18 PM" src="https://user-images.githubusercontent.com/70780576/115337663-40b81f80-a156-11eb-92a7-894080c77711.jpg">


# Troubleshooting
### OSC Tester
<img width="160" alt="Screen Shot 2021-03-01 at 5 44 26 PM" src="https://user-images.githubusercontent.com/70780576/192420764-603c938e-ccbb-4344-b7a5-66228fb946c9.png">

- *File > OSC Tester*

- This window can help with testing OSC commands without leaving the app

----------------------------------------------------------

<img width="222" alt="Screen Shot 2021-03-01 at 5 44 26 PM" src="https://user-images.githubusercontent.com/70780576/109584601-b4bf3b00-7ab6-11eb-911f-e34c6e0455bf.png">

- If you're getting this error on Mac after you close the app make sure you drag and drop *OSC for OBS* from *Downloads* to *Applications*

# Editing The Code Yourself
*OSC for OBS* is an Electron application that is powered by HTML, CSS, Javascript, and Node.js. You can access and edit any of these files by doing the following:

### Mac 
- Right-click on application > Show Package Contents > Contents > Resources > app > src.
    - 'index.js' is where majority of the code is located

### PC
- In the downloaded folder > Resources > app > src
    - 'index.js' is where majority of the code is located

## Acknowledgement
### This was inspired by [ObSC](https://github.com/CarloCattano/ObSC?fbclid=IwAR1zGJ_iFVq9o887hWw71lWaGZKqdAP0mMaVFyXau9x0sDgs-5KjS9HNLrk) 
#
## Support The Project ❤️
### If OSC for OBS helped you, consider helping the project by making a one time donation via **[PayPal](http://paypal.me/joeshea2)**

#
## Join the Discord Community

<a href="https://discord.gg/FJ79AKPgSk">
        <img src="https://img.shields.io/discord/308323056592486420?logo=discord"
            alt="chat on Discord"></a>

           
## [Download *OSC for OBS (v3.1)* Now](https://github.com/jshea2/OSC-for-OBS/releases/tag/v3.0)           
