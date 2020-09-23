//NODE OBS-OSC
//by Joe Shea

//Get Modules and Setup
const OBSWebSocket = require('obs-websocket-js');
const { Client, Server } = require('node-osc');
const obs = new OBSWebSocket();

//INPUT YOUR STUFF HERE:
//OBS Config
const obsIp = "127.0.0.1"
const obsPort = 4444;
const obsPassword = "secret"
//OSC Server (IN) Config
const oscServerIp = "127.0.0.1";
const oscPortIn = 3333;
//OSC Client (OUT) Config
const oscClientIp = "127.0.0.1";
const oscPortOut = 53000;
const oscOutPrefix = "/cue/"
const oscOutSuffix = "/start"


//Connect to OBS
obs.connect({
        address: obsIp + ':'+ obsPort,
        password: obsPassword
    })
    .then(() => {
        console.log(`\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ` + obsPort);

        return obs.send('GetSceneList');                                    //Send a Get Scene List Promise
    })
    .then(data => {
        console.log(`\n${data.scenes.length} Available Scenes.` + "\n");    //Log Total Scenes
        console.log(data.scenes.forEach((thing, index) => {
            console.log((index + 1) + " - " + thing.name);                  //Log List of Available Scenes with OSC Index
        }));

        console.log('-- Use "/scene [index]" For OSC Control --\n\n');      //Log OSC Scene Syntax
    })
    .catch(err => {
        console.log(err);                                                   //Log Catch Errors
        console.log("-!- Make Sure OBS is Running and Websocket IP/Port/Password are Correct -!-");
    });

//Listen and Log When New Scene is Activated
obs.on('SwitchScenes', data => {
    console.log(`New Active Scene: ${data.sceneName}`);
});



// Handler to Avoid Uncaught Exceptions.
obs.on('error', err => {
    console.error('socket error:', err);
});

//Connect to OSC
const client = new Client(oscClientIp, oscPortOut);
var server = new Server(oscPortIn, oscServerIp);

//OSC Server (IN)
server.on('listening', () => {
  console.log("\n\n" + 'OSC Server is listening on...\n IP: ' + oscServerIp + '\n Port: ' + oscPortIn);
  console.log('\nOSC Server is sending back on...\n IP: ' + oscClientIp + '\n Port: ' + oscPortOut);
})

//OSC -> OBS
server.on('message', (msg) => {
  if (msg[0] === "/scene"){                                                 //When OSC Recieves a /scene do...
      var oscMessage = msg[1] - 1;                                          //Convert Index Number to Start at 1
      var oscMessage = Math.floor(oscMessage);                              //Converts Any Float Argument to Lowest Integer
    return obs.send('GetSceneList').then(data => {                          //Request Scene List Array
        console.log(`OSC IN: ${msg[0]} ${oscMessage + 1} (${data.scenes[oscMessage].name})`)
        obs.send("SetCurrentScene", {
            'scene-name': data.scenes[oscMessage].name                      //Set to Scene from OSC
            })
        }).catch(() => {
            console.log("Error: Out Of '/scene' Range");                    //Catch Error
        });
    } else if (msg[0] === "/go"){                                           //When OSC Recieves a /go do...
            
        return obs.send('GetSceneList').then(data => {                      //Request Scene List Array
            
            var cleanArray = []
            var rawSceneList = data                                         //Assign Get Scene List 'data' to variable 
            data.scenes.forEach(element => {cleanArray.push(element.name)}); //Converting Scene List To a Cleaner(Less Nested) Array (Getting the Desired Nested Values) 
            return obs.send("GetCurrentScene").then(data => {               //Request Current Scene Name
                var currentSceneIndex = cleanArray.indexOf(data.name)       //Get the Index of the Current Scene Referenced from the Clean Array
                if (currentSceneIndex + 1 >= rawSceneList.scenes.length){   //When the Current Scene is More than the Total Scenes...
                obs.send("SetCurrentScene", {
                        'scene-name': rawSceneList.scenes[0].name           //Set the Scene to First Scene
                })
             } else {
                obs.send("SetCurrentScene", {
                    'scene-name': rawSceneList.scenes[currentSceneIndex + 1].name  //Set Scene to Next Scene (Referenced from the Current Scene and Array)
                    })   
                }
        }).catch(() => {
            console.log("Error: Invalid OSC Message");                      //Catch Error
            });
        })
    } else if (msg[0] === "/back"){                                         //Same Concept as Above Except Going to the Previous Scene

        return obs.send('GetSceneList').then(data => {
            
            var cleanArray = []
            var rawSceneList = data
            data.scenes.forEach(element => {cleanArray.push(element.name)});
            return obs.send("GetCurrentScene").then(data => {
                var currentSceneIndex = cleanArray.indexOf(data.name)
                if (currentSceneIndex - 1 <= -1){
                obs.send("SetCurrentScene", {
                        'scene-name': rawSceneList.scenes[rawSceneList.scenes.length - 1].name 
                })
             } else {
                obs.send("SetCurrentScene", {
                    'scene-name': rawSceneList.scenes[currentSceneIndex - 1].name
                    })   
                }
        }).catch(() => {
            console.log("Error: Invalid OSC Message");
            });
        })


    } else if (msg[0] === "/startRecording"){
        obs.send("StartRecording")
    
    } else if (msg[0] === "/stopRecording"){
        obs.send("StopRecording")
    
    } else if (msg[0] === "/toggleRecording"){
        obs.send("StartStopRecording")
    
    } else if (msg[0] === "/startStreaming"){
        obs.send("StartStreaming")
    
    } else if (msg[0] === "/stopStreaming"){
        obs.send("StopStreaming")
    
    } else if (msg[0] === "/toggleStreaming"){
        obs.send("StartStopStreaming")
    
    } else if (msg[0] === "/pauseRecording"){
        obs.send("PauseRecording")
    
    } else if (msg[0] === "/resumeRecording"){
        obs.send("ResumeRecording")
    
    } else if (msg[0] === "/enableStudioMode"){
        obs.send("EnableStudioMode")
    
    } else if (msg[0] === "/disableStudioMode"){
        obs.send("DisableStudioMode")
    
    } else if (msg[0] === "/toggleStudioMode"){
        obs.send("ToggleStudioMode")
    
    }





});

//OBS -> OSC Client (OUT)
obs.on('SwitchScenes', data => {
    client.send(`${oscOutPrefix}${data.sceneName}${oscOutSuffix}`, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
        if (err) console.error(err);
      });
    })

