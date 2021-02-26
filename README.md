# OBSosc
#### Control and listen to [OBS](https://obsproject.com/) via OSC protocol

![Node-OBSoscsmall](https://user-images.githubusercontent.com/70780576/105978317-41ee1a80-6047-11eb-8765-1837aa1b801c.png)
## Setup
*Requires: [obs-websocket plugin](https://github.com/Palakis/obs-websocket/releases) for OBS*

## [Download OBSosc 2.1 Now](https://github.com/jshea2/OBSosc/releases/tag/2.1)

<img width="354" alt="Screen Shot 2021-02-13 at 4 50 31 PM" src="https://user-images.githubusercontent.com/70780576/107874254-0b006d00-6e6d-11eb-9f88-285a210a4938.png">

- Configure the input fields 
- Successfully "Connect" 
- The window will open a "DevTools" window
     - Make sure it's on the "Console" tab, not "Elements"
- In the "Console" tab it will log IP and Port info, the number of available scenes, and a list of all scenes with numbers 
  - This can be used as an index argument in your **/scene** OSC message
- To save a config file with "Save As" please "Connect" first
- When you close OBSosc it will save your configuration for when you open next
- There is an option in 'File > Automatically Connect on Startup' that if enabled will automatically connect on opening OBSosc

## Application OSC -> OBSosc 

- In your OSC Application (QLab for example) patch your targeted OSC to match the "OSC IN" inputs on OBSosc.
  - default is... IP: `127.0.0.1`, Port: `3333`
- **DO NOT** Use UNDERSCORES in OBS. Only use them in your OSC Address. So, If your OBS Scene or Source name contains a SPACE, then in your OSC message replace the SPACE with an UNDERSCORE.
  - *Example:* if OBS Scene name is `Scene 1`, then your OSC address should use `Scene_1`.
    - *Note:* If OBS names contain UNDERSCORES this will not work. 
- OBSosc can be used for any application that transmits and/or receives unbundled OSC. 
  - This was designed with QLab, so the example show file of all the OSC commands is available in Assets on the Github or in the downloaded folder: "Qlab OBSosc Examples.qlab4" 
    - **Note:** Sending OSC Commands requires a paid version of Qlab.
 
#
# OSC Command List:

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
## **- Set Text: -**
#
**`/[source_name] [text content] [size(optional)] [font (optional)]`**
- change text content, size, and font.
  - *Note:* Size and Font are optional
  - *Example:* `/text_1 "Hello World."` will change the text contents of source "text 1" to "Hello World."
  - *Example 2:* `/text_1 "Hello World." 150 Arial` will change the same as above and change the size to 150 pt and Font to 'Arial'
  
#
## **- Set Opacity: -**
#
**`/[source_name]/[color_correction_filter_name]/opacity [0 thru 100]`** 
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
  

## **- Streaming and Recording: -**
#

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


### Start Streaming
**`/startStreaming`**
- start streaming in OBS

### Stop Streaming
**`/stopStreaming`** 
- stop streaming in OBS

### Toggle Streaming
**`/toggleStreaming`** 
- toggle the start/stop streaming button in OBS

#

## **~ Editing Commands While Selected in OBS: ~**
#
*Mainly used for **[TouchOSC](https://hexler.net/products/touchosc)***
- *Layout file included in downloaded folder or in Assets on Github*
- Download and install [TouchOSC Editor](https://hexler.net/products/touchosc) to open "Layout" and import to device

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

      | 10 | 8 | 9 |
      |----|---|---|
      | 2 | 0 | 1 |
      | 6 | 4 | 5 |

#

# OBS -> Application:


- Configure "OSC OUT" to target Application

- When *Enabled* his allows OBS to send OSC to other applications when a scene is activated.

- To **use/enable** this function, change the toggle button to ON
Configure the prefix and suffix for how you want your OSC application to receive an OSC string from OBS

  - *Example:* In OBS when a Scene named "Wide" is activated, Qlab recieves an OSC message "**/cue/Wide/start**")
  - *Note:* This currently does NOT support any spaces.

## Acknowledgement
### This was inspired by [ObSC](https://github.com/CarloCattano/ObSC?fbclid=IwAR1zGJ_iFVq9o887hWw71lWaGZKqdAP0mMaVFyXau9x0sDgs-5KjS9HNLrk) 
#
## Support The Project ❤️
### If OBSosc helped you, consider helping the project by making a one time donation via **[PayPal](http://paypal.me/joeshea2)**

#
## Join the Discord Community

<a href="https://discord.gg/FJ79AKPgSk">
        <img src="https://img.shields.io/discord/308323056592486420?logo=discord"
            alt="chat on Discord"></a>

           
## [Download OBSosc 2.1 Now](https://github.com/jshea2/OBSosc/releases/tag/2.1)           

