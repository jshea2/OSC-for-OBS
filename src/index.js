//OSC for OBS
//by Joe Shea


const { app, BrowserWindow, ipcRenderer, ipcMain, Menu, dialog } = require('electron');
const fs = require('fs')
const path = require('path');
//const os = require('os-utils')
const {default: OBSWebSocket} = require('obs-websocket-js');
const { Client, Server } = require('node-osc');
const { error, Console } = require('console');
const PDFWindow = require('electron-pdf-window')
const obs = new OBSWebSocket();
const ks = require('node-keys-simulator');

 function toHHMMSS(sec_num) {
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours + ':' + minutes + ':' + seconds;
}

let qlabCue
let listSceneItems
let autoConnect
let sceneNow
let currentScene
let lastBundle = []
let windowSizeWidthPre = 240
let windowSizeWidthPost = 500
let windowSizelHeight = 625
let loadDelay = 1500

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

let logging

//Start App

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: windowSizeWidthPre,
    height: windowSizelHeight,
    webPreferences: {
      nodeIntegration: true 
    }
  });

  const createWindowOSCTest = () => {
    const testWindow = new BrowserWindow({
        width: 190,
        height: 220,
        webPreferences: {
          nodeIntegration: true 
        }
      })
      testWindow.loadFile(path.join(__dirname, 'osctester.html'));
  }
  


//Make boolean if Mac
const isMac = process.platform === 'darwin'

//Construct Menu Toolbar ------
const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: "OBSosc",
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit' },
      { 
        label: 'Save As...', 
        accelerator: 'Shift+CommandOrControl+s',
        click() {
          saveAsFile()
        }
      },
      { 
        label: 'Open', 
        accelerator: 'CommandOrControl+o',
        click() {
          openFile()
        }

      },
      { 
        label: 'Open/Connect', 
        accelerator: 'CommandOrControl+Shift+o',
        click() {
          openFileConnect()
        }

      },
      {
        label: 'Automatically Connect on Startup',
        type: 'checkbox',
        checked: false,
        click: function (item) {
            if (item.checked == false) {
              autoConnect = false
            } else if (item.checked == true) {
              autoConnect = true
            }
          }
      },
      { 
        label: 'OSC Tester',
        accelerator: 'CommandOrControl+T',
        click(){
            createWindowOSCTest();
        } 
    },
      { 
        label: 'Revert to Default Values', 
        accelerator: 'CommandOrControl+Shift+/',
        click() {
          openOriginalFile()
        }

      }
    ]
  },
  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startSpeaking' },
            { role: 'stopSpeaking' }
          ]
        }
      ] : [
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  {
    label: 'Scripts',
    submenu: [
      { 
        label: 'Populate QLab OSC Cues From OBS Scenes',
        accelerator: 'CommandOrControl+1',
        click(){
            qlabCue();
        }
    },
        { 
            label: 'Log All Available Scene Items (Sources)',
            accelerator: 'CommandOrControl+2',
            click(){
                listSceneItems();
            } 
        },
    ]
  },
  {
    role: 'help',
    submenu: [ 
        {
            label: 'Getting Started',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://github.com/jshea2/OBSosc#setup')
          }
        },
        {
            label: 'OSC API',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://github.com/jshea2/OBSosc#osc-command-list')
          }
        },
        {
            label: 'Get Support',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://discord.com/invite/FJ79AKPgSk')
          }
        },
        {
            label: 'Donate to the Project',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://www.paypal.com/paypalme/joeshea2')
          }
        }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)


//Open File
function openFile() {
dialog.showOpenDialog(mainWindow, {
  properties: ['openFile'],
  filters: [{ name: 'Text', extensions: ['txt'] }]
}).then((result) => {
    mainWindow.setSize(windowSizeWidthPost,windowSizelHeight)
  mainWindow.webContents.openDevTools();
  const file = result.filePaths
//console.log(file)
const fileContent = fs.readFileSync(file[0], {encoding:'utf8', flag:'r'})
// Make file an array
let openArray = fileContent.split('\n')
if(openArray[0] !== "OBSosc Config File:"){
    logEverywhere("Invalid File Type!")
    return
}
//OBS IP
obsIp = openArray[1]
console.log(obsIp)
mainWindow.webContents.send("obsip", obsIp)
//OBS Port
obsPort = openArray[2]
console.log(obsPort)
mainWindow.webContents.send("obsport", obsPort)
//OBS Password
obsPassword = openArray[3]
console.log(obsPassword)
mainWindow.webContents.send("obspassword", obsPassword)
//OSC IN IP
oscServerIp = openArray[4]
console.log(oscServerIp)
mainWindow.webContents.send("oscinip", oscServerIp)
//OSC IN IP
oscPortIn = openArray[5]
console.log(oscPortIn)
mainWindow.webContents.send("oscinport", oscPortIn)
//Enable OSC Command Out on Active OBS Scene
enableObs2App = openArray[6]
console.log(enableObs2App)
mainWindow.webContents.send("enableobs2app", enableObs2App)
//OSC OUT IP
oscClientIp = openArray[7]
console.log(oscClientIp)
mainWindow.webContents.send("oscoutip", oscClientIp)
//OSC OUT Port
oscPortOut = openArray[8]
console.log(oscPortOut)
mainWindow.webContents.send("oscoutport", oscPortOut)
//OSC OUT Prefix Message
oscOutPrefix = openArray[9]
console.log(oscOutPrefix)
mainWindow.webContents.send("oscoutprefix", oscOutPrefix)
//OSC OUT Suffix Message
oscOutSuffix = openArray[10]
console.log(oscOutSuffix)
mainWindow.webContents.send("oscoutsuffix", oscOutSuffix)
//OSC OUT TouchOSC Feedback
oscOutSuffix = openArray[11]
console.log(isTouchOSC)
mainWindow.webContents.send("istouchosc", isTouchOSC)

logEverywhere("File Opened!")
})
}

//Open File and Connect
function openFileConnect() {
    dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Text', extensions: ['txt'] }]
    }).then((result) => {
        mainWindow.setSize(windowSizeWidthPost,windowSizelHeight)
      mainWindow.webContents.openDevTools();
      const file = result.filePaths
    console.log(file)
    const fileContent = fs.readFileSync(file[0], {encoding:'utf8', flag:'r'})
    // Make file an array
    let openArray = fileContent.split('\n')
    if(openArray[0] !== "OBSosc Config File:"){
        logEverywhere("Invalid File Type!")
        return
    }
    //OBS IP
    obsIp = openArray[1]
    console.log(obsIp)
    mainWindow.webContents.send("obsip", obsIp)
    //OBS Port
    obsPort = openArray[2]
    console.log(obsPort)
    mainWindow.webContents.send("obsport", obsPort)
    //OBS Password
    obsPassword = openArray[3]
    console.log(obsPassword)
    mainWindow.webContents.send("obspassword", obsPassword)
    //OSC IN IP
    oscServerIp = openArray[4]
    console.log(oscServerIp)
    mainWindow.webContents.send("oscinip", oscServerIp)
    //OSC IN IP
    oscPortIn = openArray[5]
    console.log(oscPortIn)
    mainWindow.webContents.send("oscinport", oscPortIn)
    //Enable OSC Command Out on Active OBS Scene
    enableObs2App = openArray[6]
    console.log(enableObs2App)
    mainWindow.webContents.send("enableobs2app", enableObs2App)
    //OSC OUT IP
    oscClientIp = openArray[7]
    console.log(oscClientIp)
    mainWindow.webContents.send("oscoutip", oscClientIp)
    //OSC OUT Port
    oscPortOut = openArray[8]
    console.log(oscPortOut)
    mainWindow.webContents.send("oscoutport", oscPortOut)
    //OSC OUT Prefix Message
    oscOutPrefix = openArray[9]
    console.log(oscOutPrefix)
    mainWindow.webContents.send("oscoutprefix", oscOutPrefix)
    //OSC OUT Suffix Message
    oscOutSuffix = openArray[10]
    console.log(oscOutSuffix)
    mainWindow.webContents.send("oscoutsuffix", oscOutSuffix)
    //OSC OUT TouchOSC Feedback
    oscOutSuffix = openArray[11]
    console.log(isTouchOSC)
    mainWindow.webContents.send("istouchosc", isTouchOSC)

    mainWindow.webContents.send("obsconnect")

    
    logEverywhere("File Opened!")
    })
    }

//Open Original File
function openOriginalFile() {
    const fileContent = fs.readFileSync(path.join(__dirname, "defaultOriginal.txt"), {encoding:'utf8',flag:'r'})
    // Make file an array
    let openArray = fileContent.split('\n')
    console.log(openArray)
    if(openArray[0] !== "OBSosc Config File:"){
        logEverywhere("Invalid File Type!")
        return
    }
    //OBS IP
    obsIp = openArray[1]
    console.log(obsIp)
    mainWindow.webContents.send("obsip", obsIp)
    //OBS Port
    obsPort = openArray[2]
    console.log(obsPort)
    mainWindow.webContents.send("obsport", obsPort)
    //OBS Password
    obsPassword = openArray[3]
    console.log(obsPassword)
    mainWindow.webContents.send("obspassword", obsPassword)
    //OSC IN IP
    oscServerIp = openArray[4]
    console.log(oscServerIp)
    mainWindow.webContents.send("oscinip", oscServerIp)
    //OSC IN IP
    oscPortIn = openArray[5]
    console.log(oscPortIn)
    mainWindow.webContents.send("oscinport", oscPortIn)
    //Enable OSC Command Out on Active OBS Scene
    enableObs2App = openArray[6]
    console.log(enableObs2App)
    mainWindow.webContents.send("enableobs2app", enableObs2App)
    //OSC OUT IP
    oscClientIp = openArray[7]
    console.log(oscClientIp)
    mainWindow.webContents.send("oscoutip", oscClientIp)
    //OSC OUT Port
    oscPortOut = openArray[8]
    console.log(oscPortOut)
    mainWindow.webContents.send("oscoutport", oscPortOut)
    //OSC OUT Prefix Message
    oscOutPrefix = openArray[9]
    console.log(oscOutPrefix)
    mainWindow.webContents.send("oscoutprefix", oscOutPrefix)
    //OSC OUT Suffix Message
    oscOutSuffix = openArray[10]
    console.log(oscOutSuffix)
    mainWindow.webContents.send("oscoutsuffix", oscOutSuffix)
    //OSC OUT TouchOSC Feedback
    oscOutSuffix = openArray[11]
    console.log(isTouchOSC)
    mainWindow.webContents.send("istouchosc", isTouchOSC)
    //Set Automatically Connect on Startup Off
    autoConnect = false
    menu.items[1].submenu.items[4].checked = false
    
    logEverywhere("Reverted to Original Values.")
    }

//Save File
function saveAsFile(){
    logEverywhere("Make Sure to 'Connect' before you Save!")
  dialog.showSaveDialog({ 
    title: 'Select the File Path to save', 
    defaultPath: app.getPath('documents') + '/obsosc_configfile.txt', 
    // defaultPath: path.join(__dirname, '../assets/'), 
    buttonLabel: 'Save', 
    // Restricting the user to only Text Files. 
    filters: [ 
        { 
            name: 'Text Files', 
            extensions: ['txt', 'docx'] 
        }, ], 
    properties: [] 
}).then(file => { 
    // Stating whether dialog operation was cancelled or not. 
    console.log(file.canceled); 
    if (!file.canceled) { 
        console.log(file.filePath.toString()); 
          
        // Creating and Writing to the sample.txt file 
        fs.writeFile(file.filePath.toString(),  
                     `OBSosc Config File:\n${obsIp}\n${obsPort}\n${obsPassword}\n${oscServerIp}\n${oscPortIn}\n${enableObs2App}\n${oscClientIp}\n${oscPortOut}\n${oscOutPrefix}\n${oscOutSuffix}\n${isTouchOSC}`, function (err) { 
            if (err) throw err; 
            logEverywhere('File Saved!'); 
        }); 
    } 
}).catch(err => { 
    console.log(err) 
}); 
}




  mainWindow.on('closed', function(){
      // On Close it Saves New Default Values
    fs.writeFile(path.join(__dirname, 'default.txt').toString(),  
      `OBSosc Config File:\n${obsIp}\n${obsPort}\n${obsPassword}\n${oscServerIp}\n${oscPortIn}\n${enableObs2App}\n${oscClientIp}\n${oscPortOut}\n${oscOutPrefix}\n${oscOutSuffix}\n${isTouchOSC}\n${autoConnect}`, function (err) { 
if (err) throw err;
}); 
    app.quit()
})

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  //Set Path for Icon 
  const imgpath = path.join(__dirname, 'extraResources', '/icon.png');

  //Send Pathname to Renderer for Logo
  setTimeout(() => {
    mainWindow.webContents.send("imgpath", imgpath)
  }, loadDelay);

  console.log(menu.items[1].submenu.items[4].checked)


// Open Default.txt and Import Values
setTimeout(() => { 
  const fileContent = fs.readFileSync(path.join(__dirname, "default.txt"), {encoding:'utf8', flag:'r'})
  // Make file an array
  let openArray = fileContent.split('\n')
  if(openArray[0] !== "OBSosc Config File:"){
      logEverywhere("Invalid File Type! Loading Default Values")
      mainWindow.setSize(windowSizeWidthPost,windowSizelHeight)
      mainWindow.webContents.openDevTools()
      openOriginalFile()
      return
  }
  //OBS IP
  obsIp = openArray[1]
  console.log(obsIp)
  mainWindow.webContents.send("obsip", obsIp)
  //OBS Port
  obsPort = openArray[2]
  console.log(obsPort)
  mainWindow.webContents.send("obsport", obsPort)
  //OBS Password
  obsPassword = openArray[3]
  console.log(obsPassword)
  mainWindow.webContents.send("obspassword", obsPassword)
  //OSC IN IP
  oscServerIp = openArray[4]
  console.log(oscServerIp)
  mainWindow.webContents.send("oscinip", oscServerIp)
  //OSC IN IP
  oscPortIn = openArray[5]
  console.log(oscPortIn)
  mainWindow.webContents.send("oscinport", oscPortIn)
  //Enable OSC Command Out on Active OBS Scene
  enableObs2App = openArray[6]
  console.log(enableObs2App)
  mainWindow.webContents.send("enableobs2app", enableObs2App)
  //OSC OUT IP
  oscClientIp = openArray[7]
  console.log(oscClientIp)
  mainWindow.webContents.send("oscoutip", oscClientIp)
  //OSC OUT Port
  oscPortOut = openArray[8]
  console.log(oscPortOut)
  mainWindow.webContents.send("oscoutport", oscPortOut)
  //OSC OUT Prefix Message
  oscOutPrefix = openArray[9]
  console.log(oscOutPrefix)
  mainWindow.webContents.send("oscoutprefix", oscOutPrefix)
  //OSC OUT Suffix Message
  oscOutSuffix = openArray[10]
  console.log(oscOutSuffix)
  mainWindow.webContents.send("oscoutsuffix", oscOutSuffix)
  //OSC OUT TouchOSC Feedback
    isTouchOSC = openArray[11]
    console.log(isTouchOSC)
    mainWindow.webContents.send("istouchosc", isTouchOSC)
  //Auto Connect on Startup
  if(openArray[12] === 'true'){
      autoConnect = true
      menu.items[1].submenu.items[4].checked = true
  } else if (openArray[12] === 'false'){
    autoConnect = false
    menu.items[1].submenu.items[4].checked = false
  }
  console.log(autoConnect)

  if(autoConnect === true || autoConnect === "true"){
    mainWindow.setSize(windowSizeWidthPost,windowSizelHeight)
    mainWindow.webContents.openDevTools();
    mainWindow.webContents.send("obsconnect")
  }
  
}, loadDelay);
  

//ipcMain.on gets the data from HTML 

ipcMain.on("submitted", (event, data) => {
    // Open the DevTools.
    mainWindow.setSize(windowSizeWidthPost,windowSizelHeight)
  mainWindow.webContents.openDevTools();
})

  ipcMain.on("obsip", (event, data) => {
    obsIp = data
    console.log(data)
  })

  ipcMain.on("obsport", (event, data) => {
    obsPort = data
    console.log(data)
  })

  ipcMain.on("obspassword", (event, data) => {
    obsPassword = data
    console.log(data)
  })

  ipcMain.on("oscinip", (event, data) => {
    oscServerIp = data
    console.log(data)
  })

  ipcMain.on("oscinport", (event, data) => {
    oscPortIn = data
    console.log(data)
  })

  ipcMain.on("enableoscout", (event, data) => {
    enableObs2App = data
    console.log(data)
  })

  ipcMain.on("istouchosc", (event, data) => {
    isTouchOSC = data
    console.log(data)
  })

  ipcMain.on("oscoutip", (event, data) => {
    oscClientIp = data
    console.log(data)
  })

  ipcMain.on("oscoutport", (event, data) => {
    oscPortOut = data
    console.log(data)
  })

  ipcMain.on("oscoutprepend", (event, data) => {
    oscOutPrefix = data
    console.log(data)
  })

  ipcMain.on("oscoutpostpend", (event, data) => {
    oscOutSuffix = data
    console.log(data)
  })


  // Function that logs to the DevTools
  function logEverywhere(message) {
    if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.executeJavaScript(`console.log(\`${message}\`)`);
    }
    }

  setInterval(() => {
    if(logging !== undefined){
      mainWindow.webContents.send("Logging", logging)
      logging = undefined
    }
  }, 500);


//Default values
//OBS Config
let obsIp = "127.0.0.1"
let obsPort = 4455;
let obsPassword = "secret"
//OSC Server (IN) Config
let oscServerIp = "127.0.0.1";
let oscPortIn = 3333;
//Enable OBS -> App Control
let enableObs2App = false
let isTouchOSC = false
//OSC Client (OUT) Config
let oscClientIp = "127.0.0.1";
let oscPortOut = 53000;
let oscOutPrefix = "/cue/"
let oscOutSuffix = "/start"


//Connect to OBS
ipcMain.on("obsConnect", (event, data) => {
    obs.connect(`ws://${obsIp}:${obsPort}`, `${obsPassword}`)
    .then(() => {
        mainWindow.webContents.send("isstatus", "dotGreen")
        logging = `\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`;
        console.log(logging)
        logEverywhere(`\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`)
    })
    .then(() => {
        return obs.call('GetVersion')
    })
    .then(data => {
            logEverywhere(`Current OBS Studio Version: \n${data['obsVersion']}`)
            logEverywhere(`Current obs-websocket Plugin Version: \n${data['obsWebSocketVersion']}`)
            if (data['obsWebSocketVersion'].includes("4.")) {
                logEverywhere("Error: This Version of OSC for OBS only works with OBS v28 and above and obs-websocket v5 and above.")
            }
            return obs.call('GetSceneList');                                    //Send a Get Scene List Promise
    })
    .then(data => {
        console.log(`\n${data.scenes.length} Available Scenes.` + "\n");    //Log Total Scenes
        console.log(data.scenes)
        logEverywhere(`\n${data.scenes.length} Available Scenes.` + "\n")
        console.log(data.scenes.forEach((thing, index) => {
            console.log((index + 1) + " - " + thing.sceneName);
            logEverywhere((index + 1) + " - " + thing.sceneName)                 //Log List of Available Scenes with OSC Index
        }));

        console.log('-- Reference ( Help > API ) for all OSC Commands --\n\n');      //Log OSC Scene Syntax
        logEverywhere('-- Reference "Help">"API" for all OSC Commands --\n\n')
    })
    .catch(err => {
        mainWindow.webContents.send("isstatus", "dotRed")
        console.log(err);
        logEverywhere(err)                                                 //Log Catch Errors
        console.log("ERROR: Make Sure OBS is Running, Websocket Plugin is Installed, and IP/Port/Password are Correct");
        logEverywhere("ERROR: Make Sure OBS is Running, Websocket Plugin is Installed, and IP/Port/Password are Correct")
    });


//Qlab AutoPopulate Function
qlabCue = function createQlabCues() {
    obs.call('GetSceneList').then(data => {
        data.scenes.slice().reverse().forEach(i => {
            client.send("/new", "network", "1", (err) => {
                if (err) console.error(err);
                    })
            client.send("/cue/selected/customString", `/scene "${i.sceneName}"`, (err) => {
                if (err) console.error(err);
                    })
            client.send("/cue/selected/name", `${i.sceneName}`, (err) => {
                if (err) console.error(err);
                    })
        })
    })
}


//List Scene Items Function
listSceneItems = function listSceneItems(){
    return obs.call("GetSceneList").then(data => {
        logEverywhere("--- Available Scene Items: ---")
        // logEverywhere(data.sceneName)
        // logEverywhere(msg[1])
        data.scenes.slice().reverse().forEach(i => {
            console.log(data)
            obs.call("GetSceneItemList", {
                'sceneName': i.sceneName,
            }).then(data => {
                data.sceneItems.forEach(j => {
                    console.log(j)
                    logEverywhere(j.sourceName)
                })
            }).catch(error => {
                logEverywhere("ERROR: Invalid Syntax")
            })
        })

    })
}

//Get Scene Item Id
let getSceneItemIdValue
let getSceneItemId = (scene, source) => {
    obs.call("GetSceneItemId", {
        sceneName: scene,
        sourceName: source
    }).then(data => {
        console.log(data)
        getSceneItemIdValue = data.sceneItemId
    }).catch(error => {
        console.log("Couldn't get scene index")
    })
}

//Get Scene Item Name
let getSceneItemNameValue
let getSceneItemName = (scene, sourceid) => {
    obs.call("GetSceneItemList", {
        sceneName: scene
    }).then(data => {
        getSceneItemNameValue = data.sceneItems.filter(e => e.includes(sourceid))
        console.log(data)
        getSceneItemNameValue = getSceneItemNameValue.sourceName
    }).catch(error => {
        console.log("Couldn't get scene index")
    })
}

obs.on("MediaInputActionTriggered", data => {
    //console.log(data.mediaAction)
})


//Listen and Log When New Scene is Activated
obs.on('CurrentProgramSceneChanged', data => {
    console.log(`New Active Scene: ${data.sceneName}`);
    logEverywhere(`New Active Scene: ${data.sceneName}`)
});

let currentSceneItem
let sceneItemId
//Save Scene Item as Variable
obs.on("SceneItemSelected", data => {
    sceneItemId = data.sceneItemId
    return obs.call('GetSceneItemList', {
        'sceneName': data.sceneName
    }).then(data => {
        //console.log(data)
        currentSceneItem = data.sceneItems.filter(d => d['sceneItemId'] == sceneItemId)
        console.log(currentSceneItem[0]['sourceName'])
        logEverywhere("Selected Scene Item: " + currentSceneItem[0]['sourceName'])
    }) 
})


//OBS quits and app attempts to reconnect
obs.on("Exiting", data => {
    console.log("YOU HAVE EXITED OBSSSS")
    let connectLoop = setInterval(connectOBS, 2000)
function connectOBS() {
    obs.connect(`ws://${obsIp}:${obsPort}`, `${obsPassword}`)
    .then(() => {
        clearInterval(connectLoop)
        mainWindow.webContents.send("isstatus", "dotGreen")
        logging = `\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`;
        console.log(logging)
        logEverywhere(`\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`)
    })
    .then(() => {
        return obs.call('GetVersion')
    })
    .then(data => {
            logEverywhere(`Current OBS Studio Version: \n${data['obsVersion']}`)
            logEverywhere(`Current obs-websocket Plugin Version: \n${data['obsWebsocketVersion']}`)
            return obs.call('GetSceneList');                                    //Send a Get Scene List Promise
    })
    .then(data => {
        console.log(`\n${data.scenes.length} Available Scenes.` + "\n");    //Log Total Scenes
        logEverywhere(`\n${data.scenes.length} Available Scenes.` + "\n")
        console.log(data.scenes.slice().reverse().forEach((thing, index) => {
            console.log((index + 1) + " - " + thing.sceneName);
            logEverywhere((index + 1) + " - " + thing.sceneName)                 //Log List of Available Scenes with OSC Index
        }));

        console.log('-- Reference ( Help > API ) for all OSC Commands --\n\n');      //Log OSC Scene Syntax
        logEverywhere('-- Reference "Help">"API" for all OSC Commands --\n\n')
    })
    .catch(err => {
        console.log(err);
        logEverywhere("Reconnecting...")                                                 //Log Catch Errors
        console.log("ERROR: Make Sure OBS is Running, Websocket Plugin is Installed, and IP/Port/Password are Correct");
    });
}
    logEverywhere("OBS has Disconnected")
    mainWindow.webContents.send("isstatus", "dotRed")
    connectLoop
})


// Handler to Avoid Uncaught Exceptions.
obs.on('error', err => {
    console.error('socket error:', err);
    logEverywhere(err)
});

//Connect to OSC
const client = new Client(oscClientIp, oscPortOut);
var server = new Server(oscPortIn, oscServerIp);
const clientLoopback = new Client(oscServerIp, oscPortIn);


//OSC Server Listening (IN)
server.on('listening', () => {
  console.log("\n\n" + 'OSC Input is listening on...\n IP: ' + oscServerIp + '\n Port: ' + oscPortIn);
  logEverywhere("\n\n" + 'OSC Input is listening on...\n IP: ' + oscServerIp + '\n Port: ' + oscPortIn)
    console.log('\nOSC Output is sending on...\n IP: ' + oscClientIp + '\n Port: ' + oscPortOut);
  logEverywhere('\nOSC Output is sending on...\n IP: ' + oscClientIp + '\n Port: ' + oscPortOut)

  let enabledisablestring
if(enableObs2App){
    enabledisablestring = "Enabled"
    console.log('\nOBS On Active Scene OSC Output is ' + enabledisablestring );
  logEverywhere('\nOBS On Active Scene OSC Output is ' + enabledisablestring )

} else {
    enabledisablestring = "Disabled"
    console.log('\nOBS On Active Scene OSC Output is ' + enabledisablestring);
  logEverywhere('\nOBS On Active Scene OSC Output is ' + enabledisablestring)

}
  })

//Takes in bundled OSC and converts to individual OSC messages
server.on('bundle', function (bundle) {
    if (bundle.elements == undefined){
        return
    } else {
    bundle.elements.forEach((element, i) => {

    //console.log(`Timestamp: ${bundle.timetag[i]}`);
    if (element.includes("/_samplerate")){
        return
    } else {
        console.log(`Message: ${element}`);
        clientLoopback.send(element)
    }
});
}
});

  // From ipcMain.on from the OSC Tester HTML
  ipcMain.on("oscMessage", (event, data) => {
      console.log(data)
    clientLoopback.send(data)
})


//OSC -> OBS
//When app receives OSC do..
server.on('message', (msg) => {
    
    //Trigger Scene by Index Number
    if (msg[0] === "/scene" && typeof msg[1] === 'number'){ 
      console.log("number thing works")                                     //When OSC Recieves a /scene do...
      var oscMessage = msg[1] - 1;                                          //Convert Index Number to Start at 1
      var oscMessage = Math.floor(oscMessage);                              //Converts Any Float Argument to Lowest Integer
    return obs.call('GetSceneList').then(data => {                          //Request Scene List Array
        console.log(`OSC IN: ${msg[0]} ${oscMessage + 1} (${data.scenes[oscMessage].sceneName})`)
        logEverywhere(`OSC IN: ${msg[0]} ${oscMessage + 1} (${data.scenes[oscMessage].sceneName})`)
        obs.call("SetCurrentProgramScene", {
            'sceneName': data.scenes[oscMessage].sceneName                      //Set to Scene from OSC
            })
        }).catch(() => {
            console.log("Error: Out Of '/scene' Range"); 
            logEverywhere(`Error: Out Of '/scene' Range\nOSC Recieved: ${msg}`)                   //Catch Error
        });
    } 
    //Trigger Scene if Argument is a String and Contains a Space
    else if (msg[0] === "/scene" && msg.length > 2){                      //When OSC Recieves a /scene do...                                       
        var firstIndex = msg.shift();                                       //Removes First Index from 'msg' and Stores it to Another Variable
        oscMultiArg = msg.join(' ')                                         //Converts 'msg' to a String with spaces
      return obs.call('GetSceneList').then(data => {                        //Request Scene List Array
          console.log(`OSC IN: ${firstIndex} ${oscMultiArg}`)
          logEverywhere(`OSC IN: ${firstIndex} ${oscMultiArg}`)
          obs.call("SetCurrentProgramScene", {
              'sceneName': oscMultiArg                                     //Set to Scene from OSC
              }).catch(() => {
                console.log(`Error: There is no Scene "${oscMultiArg}" in OBS. Double check case sensitivity.`);
                logEverywhere(`Error: There is no Scene "${oscMultiArg}" in OBS. Double check case sensitivity.\nOSC Recieved: ${msg}`);
              })
          }).catch((err) => {
              console.log(err) 
              logEverywhere(err)                                                           //Catch Error
          });
    } 
    //Trigger Scene if Argument is a String
    else if (msg[0] === "/scene" && typeof msg[1] === 'string'){          //When OSC Recieves a /scene do...
    var oscMessage = msg[1]; 
    return obs.call('GetSceneList').then(data => {                         //Request Scene List Array
        console.log(`OSC IN: ${msg[0]} ${oscMessage}`)
        logEverywhere(`OSC IN: ${msg[0]} ${oscMessage}`)
        obs.call("SetCurrentProgramScene", {
            'sceneName': oscMessage                                       //Set to Scene from OSC
            }).catch(() => {
            console.log(`Error: There is no Scene "${msg[1]}" in OBS. Double check case sensitivity.`);
            logEverywhere(`Error: There is no Scene "${msg[1]}" in OBS. Double check case sensitivity.\nOSC Recieved: ${msg}`);

            })
        }).catch((err) => {
            console.log(err) 
            logEverywhere(err)                                                           //Catch Error
        });
    } 
    //Trigger Scene if Scene Name is in the OSC String
    else if (msg[0].includes('/scene') && msg.length === 1){
    var msgArray = msg[0].split("/")
    msgArray.shift()
    msgArray.shift()
    obs.call("SetCurrentProgramScene", {
        'sceneName': msgArray[0].split("_").join(" ").toString(),                                          //Set to Scene from OSC
        }).catch(() => {
            console.log(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.`);
            logEverywhere(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.\nOSC Recieved: ${msg}`);

        }).catch((err) => {
        console.log(err) 
        logEverywhere(err)                                               //Catch Error
    });
    }
    //Trigger Scene if Scene Name is in the OSC String and is TouchOSC
    else if (msg[0].includes('/scene') && msg[1] === 1){
        var msgArray = msg[0].split("/")
        msgArray.shift()
        msgArray.shift()
        obs.call("SetCurrentProgramScene", {
            'sceneName': msgArray[0].split("_").join(" ").toString(),                                          //Set to Scene from OSC
            }).catch(() => {
                console.log(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.`);
                logEverywhere(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.\nOSC Recieved: ${msg}`);
    
            }).catch((err) => {
            console.log(err) 
            logEverywhere(err)                                               //Catch Error
        });
        }
    //Trigger Preview Scene if Argument is a String
    else if (msg[0] === "/previewScene" && typeof msg[1] === 'string'){          //When OSC Recieves a /scene do...
    var oscMessage = msg[1]; 
        logEverywhere(`OSC IN: ${msg[0]} ${oscMessage}`)
        obs.call("SetCurrentPreviewScene", {
            'sceneName': oscMessage                                       //Set to Scene from OSC
            }).catch(() => {
            console.log(`Error: There is no Scene "${msg[1]}" in OBS. Double check case sensitivity.`);
            logEverywhere(`Error: There is no Scene "${msg[1]}" in OBS. Double check case sensitivity.`);
            })
    }
    //Trigger Preview Scene if Scene Name is in the OSC String
    else if (msg[0].includes('/previewScene') && msg.length === 1){
    var msgArray = msg[0].split("/")
    msgArray.shift()
    msgArray.shift()
    obs.call("SetCurrentPreviewScene", {
        'sceneName': msgArray[0].split("_").join(" ").toString(),                                          //Set to Scene from OSC
        }).catch(() => {
            console.log(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.`);
            logEverywhere(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.\nOSC Recieved: ${msg}`);

        })
    }

    //Trigger StudioMode Transition
    else if (msg[0] === "/studioTransition"){
    obs.call("TriggerStudioModeTransition", {
        'with-transition': {
            transitionName: msg[1],
            duration: msg[2]
        }
    }).catch(() => {
        logEverywhere(`Error: Must be in Studio Mode to use this command\nOSC Recieved: ${msg}`);
    })
    } 

    //Triggers Previous Scene to go "BACK"
    else if (msg[0] === "/back"){                                          //When OSC Recieves a /go do...
            
        return obs.call('GetSceneList').then(data => {                      //Request Scene List Array
            
            var cleanArray = []
            var rawSceneList = data                                         //Assign Get Scene List 'data' to variable 
            data.scenes.forEach(element => {cleanArray.push(element.sceneName)}); //Converting Scene List To a Cleaner(Less Nested) Array (Getting the Desired Nested Values) 
            return obs.call("GetCurrentProgramScene").then(data => {               //Request Current Scene Name
                console.log(rawSceneList)
                console.log(cleanArray)
                var currentSceneIndex = cleanArray.indexOf(data.currentProgramSceneName)       //Get the Index of the Current Scene Referenced from the Clean Array
                console.log(currentSceneIndex)
                if (currentSceneIndex + 1 >= rawSceneList.scenes.length){   //When the Current Scene is More than the Total Scenes...
                obs.call("SetCurrentProgramScene", {
                        'sceneName': rawSceneList.scenes[0].sceneName           //Set the Scene to First Scene
                })
             } else {
                obs.call("SetCurrentProgramScene", {
                    'sceneName': rawSceneList.scenes[currentSceneIndex + 1].sceneName  //Set Scene to Next Scene (Referenced from the Current Scene and Array)
                    })   
                }
        }).catch(() => {
            console.log("Error: Invalid OSC Message");                              //Catch Error
            logEverywhere(`Error: Invalid OSC Message\nOSC Recieved: ${msg}`);                              //Catch Error

            });
        })
    } 

    //Triggers to "GO" to the Next Scene
    else if (msg[0] === "/go"){                                                 //Same Concept as Above Except Going to the Previous Scene

        return obs.call('GetSceneList').then(data => {
            
            var cleanArray = []
            var rawSceneList = data
            data.scenes.forEach(element => {cleanArray.push(element.sceneName)});
            return obs.call("GetCurrentProgramScene").then(data => {
                var currentSceneIndex = cleanArray.indexOf(data.currentProgramSceneName)
                if (currentSceneIndex - 1 <= -1){
                obs.call("SetCurrentProgramScene", {
                        'sceneName': rawSceneList.scenes[rawSceneList.scenes.length - 1].sceneName 
                })
             } else {
                obs.call("SetCurrentProgramScene", {
                    'sceneName': rawSceneList.scenes[currentSceneIndex - 1].sceneName
                    })   
                }
        }).catch(() => {
            console.log("Error: Invalid OSC Message");
            logEverywhere(`Error: Invalid OSC Message\nOSC Recieved: ${msg}`)
            });
        })


    } 

    //Set Recording by Arg
    else if (msg[0] === "/setRecording"){
        if (msg[1] == 1){
            obs.call("StartRecord").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        } else if (msg[1] == 0){
            obs.call("StopRecord").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        }

    
    } 
    //Triggers Start Recording
    else if (msg[0] === "/startRecording"){
        obs.call("StartRecord").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Stop Recording
    else if (msg[0] === "/stopRecording"){
        obs.call("StopRecord").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    }
    //Triggers Start Recording
    else if (msg[0] === "/pauseRecording"){
        obs.call("PauseRecord").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Stop Recording
    else if (msg[0] === "/resumeRecording"){
        obs.call("ResumeRecord").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    }  
    //Triggers Toggle Recording
    else if (msg[0] === "/toggleRecording"){
        obs.call("ToggleRecord").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Set Streaming by Arg
    else if (msg[0] === "/setStreaming"){
        if (msg[1] == 1){
            obs.call("StartStream").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        } else if (msg[1] == 0){
            obs.call("StopStream").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        }

    
    } 
    //Triggers Start Streaming
    else if (msg[0] === "/startStreaming"){
        obs.call("StartStream").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Stop Streaming
    else if (msg[0] === "/stopStreaming"){
        obs.call("StopStream").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Toggle Streaming
    else if (msg[0] === "/toggleStreaming"){
        obs.call("ToggleStream").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Set VirtualCam by Arg
    else if (msg[0] === "/setVirtualCam"){
        if (msg[1] == 1){
            obs.call("StartVirtualCam").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        } else if (msg[1] == 0){
            obs.call("StopVirtualCam").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        }

    
    } 
    //Triggers Start VirtualCam
    else if (msg[0] === "/startVirtualCam"){
        obs.call("StartVirtualCam").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Stop VirtualCam
    else if (msg[0] === "/stopVirtualCam"){
        obs.call("StopVirtualCam").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Toggle VirtualCam
    else if (msg[0] === "/toggleVirtualCam"){
        obs.call("ToggleVirtualCam").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Pause Recording
    else if (msg[0] === "/pauseRecording"){
        obs.call("PauseRecord").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Resume Recording
    else if (msg[0] === "/resumeRecording"){
        obs.call("ResumeRecord").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    }
    //Set StudioMode by Arg
    else if (msg[0] === "/setStudioMode"){
        if (msg[1] == 1){
            obs.call("SetStudioModeEnabled", {
                studioModeEnabled : true
            }).catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        } else if (msg[1] == 0){
            obs.call("SetStudioModeEnabled", {
                studioModeEnabled : false
            }).catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        }

    
    } 
    //Triggers Enable Studio Mode
    else if (msg[0] === "/enableStudioMode"){
        obs.call("SetStudioModeEnabled", {
            studioModeEnabled : true
        }).catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Disable Studio Mode
    else if (msg[0] === "/disableStudioMode"){
        obs.call("SetStudioModeEnabled", {
            studioModeEnabled : false
        }).catch((err) => {
            console.log(`ERROR: ${err.error}`);
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Toggle Studio Mode
    else if (msg[0] === "/toggleStudioMode"){
        obs.call("GetStudioModeEnabled").then(data => {
            obs.call("SetStudioModeEnabled", {
                studioModeEnabled : !data.studioModeEnabled
            }).catch((err) => {
                console.log(err)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        }).catch((err) => {
            console.log(err)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    } 

    //Triggers Source Visibility On/Off
    else if (msg[0].includes('visible')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("GetSceneItemId", {
            sceneName: msgArray[0].split('_').join(' ').toString(),
            sourceName: msgArray[1].split('_').join(' ').toString()
        }).then(data => {
            console.log(data)
            var visible;
        if(msg[1] === 0 || msg[1] === 'off' || msg[1] === '0' || msg[1] === 'false'){
            visible = false
        } else if(msg[1] === 1 || msg[1] === 'on' || msg[1] === '1' || msg[1] === 'true'){
            visible = true
        }
        obs.call("SetSceneItemEnabled", {
            'sceneName': msgArray[0].split('_').join(' ').toString(),
            'sceneItemId': data.sceneItemId,
            'sceneItemEnabled': visible,
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
            logEverywhere(`Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1\nOSC Recieved: ${msg}`)

        })
        })
        //getSceneItemId(msgArray[0].split('_').join(' ').toString(), msgArray[1].split('_').join(' ').toString())
        
    } 
    //Triggers Filter Visibility On/Off
    else if (msg[0].includes('filterVisibility')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var visiblef;
        if(msg[1] === 0 || msg[1] === 'off' || msg[1] === '0' || msg[1] === 'false'){
            visiblef = false
        } else if(msg[1] === 1 || msg[1] === 'on' || msg[1] === '1' || msg[1] === 'true'){
            visiblef = true
        }
        obs.call("SetSourceFilterEnabled", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterEnabled': visiblef
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
            logEverywhere(`Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1\nOSC Recieved: ${msg}`)

        })
    }

    //Set Text
    else if (msg[0].includes('setText')){
        obs.call("GetInputSettings", {
            inputName : "text"
        }).then(data => {
            console.log(data)
        })
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        console.log(msg[1]);
        obs.call("SetInputSettings", {
            'inputName': msgArray[0].split('_').join(' '),
            'inputSettings':{
                'text': msg[1].toString()
            }
            // 'font': {
            //     size: msg[2],
            //     face: msg[3]
            // }
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. [Source_Name]/setText [string], example: /text1/setText 'new text who dis?'")
            logEverywhere(`Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. [Source_Name]/setText [string], example: /text1/setText 'new text who dis?'\nOSC Recieved: ${msg}`)

        })
    }

    //Triggers the Source Opacity (via Filter > Color Correction)
    else if (msg[0].includes('opacity')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("SetSourceFilterSettings", {
           'sourceName': msgArray[0].split('_').join(' '),
           'filterName': msgArray[1].split('_').join(' '),
           'filterSettings': {'opacity' : msg[1]}
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere(`ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference\nOSC Recieved: ${msg}`)

        })  
    }

    //Adjsuts the Source's Gamma via Color Correction Filter
    else if (msg[0].includes('/gamma')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("SetSourceFilterSettings", {
           'sourceName': msgArray[0].split('_').join(' '),
           'filterName': msgArray[1].split('_').join(' '),
           'filterSettings': { 'gamma' : parseFloat(msg[1]) }
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere(`ERROR: Gamma Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference\nOSC Recieved: ${msg}`)

        })  
    }
    //Adjsuts the Source's Contrast via Color Correction Filter
    else if (msg[0].includes('/contrast')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("SetSourceFilterSettings", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterSettings': { 'contrast' : parseFloat(msg[1]) }
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere(`ERROR: Contrast Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference\nOSC Recieved: ${msg}`)

        })  
    }
    //Adjsuts the Source's Brightness via Color Correction Filter
    else if (msg[0].includes('/brightness')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("SetSourceFilterSettings", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterSettings': { 'brightness' : parseFloat(msg[1]) }
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere(`ERROR: Brightness Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference\nOSC Recieved: ${msg}`)

        })  
    }
    //Adjsuts the Source's Saturation via Color Correction Filter
    else if (msg[0].includes('/saturation')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("SetSourceFilterSettings", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterSettings': { 'saturation' : parseFloat(msg[1]) }
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere(`ERROR: Saturation Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference\nOSC Recieved: ${msg}`)

        })  
    }
    //Adjsuts the Source's Hue Shift via Color Correction Filter
    else if (msg[0].includes('/hueShift')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("SetSourceFilterSettings", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterSettings': { 'hue_shift' : parseFloat(msg[1]) }
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere(`ERROR: Hue Shift Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference\nOSC Recieved: ${msg}`)

        })  
    }

    //Set Transition Type and Duration
    else if (msg[0].includes('/transition')){
            console.log(`OSC IN: ${msg}`)
            //logEverywhere(`OSC IN: ${msg}`)
            var msgArray = msg[0].split("/")
            msgArray.shift()
        if (msgArray[0] === "Cut" || msgArray[0] === "Stinger") {
            console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
            logEverywhere(`OSC IN: ${msg}`)
            obs.call("SetCurrentSceneTransition", {
                'transitionName': msgArray[0].toString()
            }).catch(() => {
                console.log("Whoops")
                logEverywhere(`Error: Transition Syntax Error. See Help > API`)
            })
        } else {
            if (msg[1] == undefined){
                obs.call("GetCurrentSceneTransition").then(data => {
                    var tranisionTime = data["transitionDuration"]
                    console.log(`OSC IN: ${msg[0]} ${msg[1]}\nCurrent Duration: ${tranisionTime}`)
                    logEverywhere(`OSC IN: ${msg[0]}\nCurrent Duration: ${tranisionTime}`)
                }).catch(() => {
                    console.log("Whoops")
                    logEverywhere(`Error: Transition Syntax Error. See Help > API`)
                })
            } else {
            console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
            logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
            }
            var makeSpace = msgArray[0].split('_').join(' ');
            obs.call("SetCurrentSceneTransition", {
                'transitionName': makeSpace.toString()
            }) 
        if(msg.length === 2){
            console.log("duration is working properly")
        obs.call("SetCurrentSceneTransitionDuration", {
            'transitionDuration': msg[1]
        }).catch(() => {
            console.log("Whoops")
            logEverywhere(`Error: Transition Syntax Error. See Help > API`)
        })
    } else if (msg.length === 1) {
        return
    } else {
            console.log("ERROR: Invalid Transition Name. It's Case Sensitive. Or if it contains SPACES use '_' instead")
            logEverywhere(`ERROR: Invalid Transition Name. See Help > API\nOSC Recieved: ${msg}`)
            } 
        }
    }

    //Source Position Translate
    else if (msg[0].includes('position')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = msg[1] //+ 960
        var y = msg[2] //- (msg[2] * 2)
        let getSceneItemIdValue
        obs.call("GetSceneItemId", {
            sceneName: msgArray[0].split('_').join(' ').toString(),
            sourceName: msgArray[1].split('_').join(' ').toString()
        }).then(data => {
            console.log(data)
            getSceneItemIdValue = data.sceneItemId
            let canvasW
            let canvasH
            obs.call("GetVideoSettings").then(data => {
                canvasW = data.baseWidth
                canvasH = data.baseHeight
                obs.call("SetSceneItemTransform", {
                    'sceneName': msgArray[0].toString().split('_').join(' '),
                    'sceneItemId': getSceneItemIdValue,
                    sceneItemTransform: {
                        'positionX': x + (canvasW / 2), 
                        'positionY': y + (canvasH / 2)
                    }
                }).catch(() => {
                    console.log("ERROR: Invalid Position Syntax")
                    logEverywhere("ERROR: Invalid Position Name. See Help > API")
                })
            }).catch(error => {
                console.log("Couldn't get scene index")
            })
            obs.call("GetSceneItemTransform", {
                'sceneName' : msgArray[0].toString().split('_').join(' '),
                'sceneItemId': getSceneItemIdValue
            }).then(data => {
                console.log(data)
            })
        }).catch(error => {
            console.log("Couldn't get scene index")
        })
    }
    //Source Scale Translate
    else if (msg[0].includes('scale')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        let getSceneItemIdValue
        obs.call("GetSceneItemId", {
            sceneName: msgArray[0].split('_').join(' ').toString(),
            sourceName: msgArray[1].split('_').join(' ').toString()
        }).then(data => {
            console.log(data)
            getSceneItemIdValue = data.sceneItemId
                obs.call("SetSceneItemTransform", {
                    'sceneName': msgArray[0].toString().split('_').join(' '),
                    'sceneItemId': getSceneItemIdValue,
                    sceneItemTransform: {
                        'scaleX': msg[1], 
                        'scaleY': msg[1]
                    }
                }).catch(error => {
                console.log("Couldn't get scene index")
            })
            obs.call("GetSceneItemTransform", {
                'sceneName' : msgArray[0].toString().split('_').join(' '),
                'sceneItemId': getSceneItemIdValue
            }).then(data => {
                console.log(data)
            })
        }).catch(error => {
            console.log("Couldn't get scene index")
        })
    } 
    //Source Rotation Translate
    else if (msg[0].includes('rotate')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        let getSceneItemIdValue
        obs.call("GetSceneItemId", {
            sceneName: msgArray[0].split('_').join(' ').toString(),
            sourceName: msgArray[1].split('_').join(' ').toString()
        }).then(data => {
            console.log(data)
            getSceneItemIdValue = data.sceneItemId
                obs.call("SetSceneItemTransform", {
                    'sceneName': msgArray[0].toString().split('_').join(' '),
                    'sceneItemId': getSceneItemIdValue,
                    sceneItemTransform: {
                        'rotation': msg[1],
                    }
                }).catch(error => {
                console.log("Couldn't get scene index")
            })
            obs.call("GetSceneItemTransform", {
                'sceneName' : msgArray[0].toString().split('_').join(' '),
                'sceneItemId': getSceneItemIdValue
            }).then(data => {
                console.log(data)
            })
        }).catch(error => {
            console.log("Couldn't get scene index")
        })
    }  

    //Source Alignment
    else if (msg[0].includes('alignment')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        let getSceneItemIdValue
        obs.call("GetSceneItemId", {
            sceneName: msgArray[0].split('_').join(' ').toString(),
            sourceName: msgArray[1].split('_').join(' ').toString()
        }).then(data => {
            console.log(data)
            getSceneItemIdValue = data.sceneItemId
                obs.call("SetSceneItemTransform", {
                    'sceneName': msgArray[0].toString().split('_').join(' '),
                    'sceneItemId': getSceneItemIdValue,
                    sceneItemTransform: {
                        'alignment': msg[1],
                    }
                }).catch(error => {
                console.log("Couldn't get scene index")
            })
            obs.call("GetSceneItemTransform", {
                'sceneName' : msgArray[0].toString().split('_').join(' '),
                'sceneItemId': getSceneItemIdValue
            }).then(data => {
                console.log(data)
            })
        }).catch(error => {
            console.log("Couldn't get scene index")
        })
    } 

    //Triggers Source UnMute
    else if (msg[0].includes('unmute')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("SetInputMute", {
            'inputName': msgArray[0].split('_').join(' ').toString(),
            'inputMuted': false,
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mute 0 or 1, example: /Audio/mute 1")
            logEverywhere("ERROR: Invalid Unmute Syntax. See Help > API")
        })
    }
    //Triggers Source Mute
    else if (msg[0].includes('mute')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("SetInputMute", {
            'inputName': msgArray[0].split('_').join(' ').toString(),
            'inputMuted': true,
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mute 0 or 1, example: /Audio/mute 1")
            logEverywhere("ERROR: Invalid Mute Syntax. See Help > API")
        })
    }
    //Triggers Source Mute Toggle
    else if (msg[0].includes('audioToggle')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("ToggleInputMute", {
            'inputName': msgArray[0].split('_').join(' ').toString()
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mute 0 or 1, example: /Audio/mute 1")
            logEverywhere("ERROR: Invalid Mute Syntax. See Help > API")
        })
    }
    //Adjust Source Volume
    else if (msg[0].includes('volume')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("SetInputVolume", {
            'inputName': msgArray[0].split('_').join(' ').toString(),
            'inputVolumeMul': msg[1],
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/volume 0-1, example: /Audio/volume 1")
            logEverywhere("ERROR: Invalid Volume Syntax. See Help > API")

        })
    }
    //Set Sources Audio Monitor Off
    else if (msg[0].includes('monitorOff')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        obs.call("SetInputAudioMonitorType", {
            'inputName': msgArray[0].split('_').join(' ').toString(),
            'monitorType': "OBS_MONITORING_TYPE_NONE",
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/volume 0-1, example: /Audio/volume 1")
            logEverywhere("ERROR: Invalid Monitor Off Syntax. See Help > API")

        })
    }
    //Set Sources Audio Monitor Only
    else if (msg[0].includes('monitorOnly')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        obs.call("SetInputAudioMonitorType", {
            'inputName': msgArray[0].split('_').join(' ').toString(),
            'monitorType': "OBS_MONITORING_TYPE_MONITOR_ONLY",
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/volume 0-1, example: /Audio/volume 1")
            logEverywhere("ERROR: Invalid Monitor Only Syntax. See Help > API")

        })
    }
    //Set Sources Audio MonitorandOutput
    else if (msg[0].includes('monitorAndOutput')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        obs.call("SetInputAudioMonitorType", {
            'inputName': msgArray[0].split('_').join(' ').toString(),
            'monitorType': "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT",
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/volume 0-1, example: /Audio/volume 1")
            logEverywhere("ERROR: Invalid Monitor and Output Syntax. See Help > API")

        })
    }

    //Open Video Mix Projector
    else if (msg[0].includes('openProjector')){
        let projectorType
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        if (msgArray[0] == "Source" || msgArray[0] == "Scene") {
            obs.call("OpenSourceProjector", {
                //'type': msgArray[0].split('_').join(' ').toString(),
                'sourceName': msg[2],
                'monitorIndex': msg[1]
            }).catch(() => {
                console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaPlay, example: /Media_Source/mediaPlay")
                logEverywhere("ERROR: Invalid Open Projector Syntax. See Help > API")
    
            })
            return
        }
        if (msgArray[0] == "StudioProgram") {
            projectorType = "OBS_WEBSOCKET_VIDEO_MIX_TYPE_PROGRAM"
        } else if (msgArray[0] == "Preview") {
            projectorType = "OBS_WEBSOCKET_VIDEO_MIX_TYPE_PREVIEW"
        } else if (msgArray[0] == "Multiview") {
            projectorType = "OBS_WEBSOCKET_VIDEO_MIX_TYPE_MULTIVIEW"
        }
        obs.call("OpenVideoMixProjector", {
            'videoMixType': projectorType,
            'monitorIndex': msg[1],
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaPlay, example: /Media_Source/mediaPlay")
            logEverywhere("ERROR: Invalid Open Projector Syntax. See Help > API")

        })
    }

    

    //Media Play
    else if (msg[0].includes('mediaPlay')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("TriggerMediaInputAction", {
            'inputName': msgArray[0].split('_').join(' ').toString(),
            'mediaAction': "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY",
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaPlay, example: /Media_Source/mediaPlay")
            logEverywhere("ERROR: Invalid Media Play Syntax. See Help > API")

        })
    }
    //Media Pause
    else if (msg[0].includes('mediaPause')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("TriggerMediaInputAction", {
            'inputName': msgArray[0].split('_').join(' ').toString(),
            'mediaAction': "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE",
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaPause, example: /Media_Source/mediaPause")
            logEverywhere("ERROR: Invalid Media Pause Syntax. See Help > API")

        })
    }
    //Media Restart
    else if (msg[0].includes('mediaRestart')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("TriggerMediaInputAction", {
            'inputName': msgArray[0].split('_').join(' ').toString(),
            'mediaAction': "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaRestart, example: /Media_Source/mediaRestart")
            logEverywhere("ERROR: Invalid Media Restart Syntax. See Help > API")

        })
    }
    //Media Stop
    else if (msg[0].includes('mediaStop')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("TriggerMediaInputAction", {
            'inputName': msgArray[0].split('_').join(' ').toString(),
            'mediaAction': "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaStop, example: /Media_Source/mediaStop")
            logEverywhere("ERROR: Invalid Media Stop Syntax. See Help > API")

        })
    }
        //Media Cursor
        else if (msg[0].includes('mediaCursor')){
            console.log(`OSC IN: ${msg}`)
            logEverywhere(`OSC IN: ${msg}`)
            var msgArray = msg[0].split("/")
            msgArray.shift()
            obs.call("TriggerMediaInputAction", {
                'inputName': msgArray[0].split('_').join(' ').toString(),
                'mediaCursor': msg[1],
            }).catch(() => {
                console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaStop, example: /Media_Source/mediaStop")
                logEverywhere("ERROR: Invalid Media Stop Syntax. See Help > API")
    
            })
        }
    //Browser Refresh
    else if (msg[0].includes('refreshBrowser')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.call("PressInputPropertiesButton", {
            'inputName': msgArray[0].split('_').join(' ').toString(),
            'propertyName': "refreshnocache" 
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaStop, example: /Media_Source/mediaStop")
            logEverywhere("ERROR: Invalid Refresh Browser Syntax. See Help > API")

        })
    }

    //Set Source Collection
    else if (msg[0] === "/setSceneCollection"){
        obs.call("SetCurrentSceneCollection", {
            'sceneCollectionName': msg[1].toString()
        }).catch(() => {
            logEverywhere("ERROR: Invalid) Refresh Browser Syntax. See Help > API")
        })
    }
    //Set Profile
    else if (msg[0] === "/setProfile"){
        obs.call("SetCurrentProfile", {
            'profileName': msg[1].toString()
        }).catch(() => {
            logEverywhere("ERROR: Invalid) Refresh Browser Syntax. See Help > API")
        })
    }
    //Set Recording File Path
    else if (msg[0] === "/recFilePath"){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        obs.call("SetProfileParameter", {
            'parameterCategory': 'SimpleOutput',
            'parameterName': 'FilePath',
            'parameterValue': msg[1].toString()
        }).catch(() => {
            logEverywhere("ERROR: Invalid Recording File Path Syntax. See Help > API")
        })
    }

    //Set Recording File Name
    else if (msg[0] === "/recFileName"){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        obs.call("SetProfileParameter", {
            'parameterCategory': 'Output',
            'parameterName': 'FilenameFormatting',
            'parameterValue': msg[1].toString()
        }).catch(() => {
            logEverywhere("ERROR: Invalid Recording File Name Syntax. See Help > API")
        })
    }

    // ----- TouchOSC COMMANDS: ------

    //Log ALL Scene Items
    else if (msg[0] === '/logAllSceneItems'){
        return obs.call("GetSceneList").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        logEverywhere("--- Available Scene Items: ---")
        // logEverywhere(data.sceneName)
        // logEverywhere(msg[1])
        data.scenes.forEach(i => {
            obs.call("GetSceneItemList", {
                'sceneName': i.sceneName,
            }).then(data => {
                data.sceneItems.forEach(j => {
                    console.log(j)
                    logEverywhere(j.sourceName)
                })
            }).catch(() => {
                console.log("ERROR: Invalis Position Syntax")
                logEverywhere("ERROR: Invalid Log Scene Items Syntax. See Help > API")
            })
        })

    })
    }
    //Create Scene Item
    else if (msg[0] === '/addSceneItem'){
        return obs.call("GetCurrentProgramScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        // logEverywhere(data.sceneName)
        // logEverywhere(msg[1])
        obs.call("CreateInput", {
            'sceneName': data.currentProgramSceneName,
            'inputName': msg[1].toString(),
            'inputKind': msg[2].toString()
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Add Scene Item Syntax. See Help > API")
        })
    })
    }
    //Source Position Select Move
    else if (msg[0] === '/move'){
        return obs.call("GetCurrentProgramScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = Math.floor((msg[2]*2000)+540)
        var y = Math.floor((msg[1]*2000) + 960)
        console.log(x + " " + y)
        logEverywhere(x + " " + y)
        let currentProgramSceneName = data.currentProgramSceneName
        console.log(`${currentProgramSceneName} ${currentSceneItem[0].sceneItemId}`)
        obs.call("SetSceneItemTransform", {
            'sceneName': currentProgramSceneName.toString().split('_').join(' '),
            'sceneItemId': currentSceneItem[0].sceneItemId,
            sceneItemTransform: {
                'positionX': x,
                'positionY': y
            }
        }).catch(error => {
        console.log("Couldn't get scene index")
        })
    })
    }
    //Source Position Select MoveX
    else if (msg[0] === '/movex'){
        return obs.call("GetCurrentProgramScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = Math.floor((msg[1]*2000)+540)
        var y = Math.floor((msg[1]*2000) + 960)
        console.log(x + " " + y)
        logEverywhere(x + " " + y)
        let currentProgramSceneName = data.currentProgramSceneName
        console.log(`${currentProgramSceneName} ${currentSceneItem[0].sceneItemId}`)
        obs.call("SetSceneItemTransform", {
            'sceneName': currentProgramSceneName.toString().split('_').join(' '),
            'sceneItemId': currentSceneItem[0].sceneItemId,
            sceneItemTransform: {
                'positionX': x
            }
        }).catch(error => {
        console.log("Couldn't get scene index")
        })
    })
    }
    //Source Position Select MoveY
    else if (msg[0] === '/movey'){
        return obs.call("GetCurrentProgramScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = Math.floor((msg[2]*2000))
        var y = Math.floor((msg[1]*2000) + 960)
        console.log(x + " " + y)
        logEverywhere(x + " " + y)
        let currentProgramSceneName = data.currentProgramSceneName
        console.log(`${currentProgramSceneName} ${currentSceneItem[0].sceneItemId}`)
        obs.call("SetSceneItemTransform", {
            'sceneName': currentProgramSceneName.toString().split('_').join(' '),
            'sceneItemId': currentSceneItem[0].sceneItemId,
            sceneItemTransform: {
                'positionY': y
            }
        }).catch(error => {
        console.log("Couldn't get scene index")
        })
    })
    }   
    //Source Align
    else if (msg[0] === '/align'){
        return obs.call("GetCurrentProgramScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        console.log("Scene NAme: " + data.currentProgramSceneName)
        console.log("Scene NAme: " + currentSceneItem)
        console.log(currentSceneItem)
        let currentProgramSceneName = data.currentProgramSceneName
        console.log(`${currentProgramSceneName} ${currentSceneItem[0].sceneItemId}`)
        obs.call("SetSceneItemTransform", {
            'sceneName': currentProgramSceneName.toString().split('_').join(' '),
            'sceneItemId': currentSceneItem[0].sceneItemId,
            sceneItemTransform: {
                'alignment': msg[1]
            }
        }).catch(error => {
        console.log("Couldn't get scene index")
        })
    })
    }
    //Set Transition Override
    else if(msg[0].includes('/transOverrideType')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log("Messge array: " + msgArray)
        //logEverywhere("Messge array: " + msgArray)
        return obs.call("GetCurrentProgramScene").then(data => {
        obs.call("SetSceneSceneTransitionOverride", {
            'sceneName': data.currentProgramSceneName,
            'transitionName': msgArray[1].split('_').join(' ').toString(),
            'transitionDuration': msg[1]
        }).catch(() => {
            logEverywhere("ERROR: Invalid Transition Override Type Syntax. See Help > API")
        })
    })
    }
    //Source Size
    else if (msg[0] === '/size'){
        return obs.call("GetCurrentProgramScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        let currentProgramSceneName = data.currentProgramSceneName
        console.log(`${currentProgramSceneName} ${currentSceneItem[0].sceneItemId}`)
        obs.call("SetSceneItemTransform", {
            'sceneName': currentProgramSceneName.toString().split('_').join(' '),
            'sceneItemId': currentSceneItem[0].sceneItemId,
            sceneItemTransform: {
                'scaleX': msg[1],
                'scaleY': msg[1]
            }
        }).catch(error => {
        console.log("Couldn't get scene index")
        })
    })
    }
    //Source Rotate
    else if (msg[0] === '/spin'){
        return obs.call("GetCurrentProgramScene").then(data => {
            console.log(`OSC IN: ${msg}`)
            logEverywhere(`OSC IN: ${msg}`)
            let currentProgramSceneName = data.currentProgramSceneName
        console.log(`${currentProgramSceneName} ${currentSceneItem[0].sceneItemId}`)
        obs.call("SetSceneItemTransform", {
            'sceneName': currentProgramSceneName.toString().split('_').join(' '),
            'sceneItemId': currentSceneItem[0].sceneItemId,
            sceneItemTransform: {
                'rotation': msg[1]
            }
        }).catch(error => {
        console.log("Couldn't get scene index")
        })
        })
        }
    else if (msg[0] === '/getSceneItemTransform'){
        obs.call("GetSceneItemTransform", {
            sceneItemId: sceneItemId,
            sceneName: "Scene Last"
        }).then(data => {
            logEverywhere(JSON.stringify(data))
        }).catch(err => {
            console.log(err)
        })
    }

    //Trigger Hotkey
    else if (msg[0].includes('/hotkey')){
        let shift
        let control
        let alt
        let command
        let hotkey
        var msgArray = msg[0].split("/")
        msgArray.shift()
        msgArray.pop()
        hotkey = msgArray[1].toUpperCase()
        console.log(msgArray)
        if (msgArray[0].includes("shift")){
            shift = true
        } else {
            shift = false
        }
        if (msgArray[0].includes("control")){
            control = true
        } else {
            control = false
        }
        if (msgArray[0].includes("alt")){
            alt = true
        } else {
            alt = false
        }
        if (msgArray[0].includes("command")){
            command = true
        } else {
            command = false
        }
        obs.call("TriggerHotkeyByKeySequence", {
            keyId: `OBS_KEY_${msgArray[1]}`,
            keyModifiers:{
                shift: shift,
                control: control,
                alt: alt,
                command: command
            }

        }).then(() => {
            console.log(`${shift} + ${control} + ${alt} + ${command} + ${hotkey}`)
        }).catch(err => {
            logEverywhere(`Error: There is no Hotkey for ${msgArray[0]} + ${msgArray[1]}`)
        })
    }

    //Fit to Screen
    else if (msg[0] === '/fitToScreen'){
        return obs.call("GetCurrentProgramScene").then(data => {
            console.log(`OSC IN: ${msg}`)
            logEverywhere(`OSC IN: ${msg}`)
            let currentScene = data
        obs.call("GetVideoSettings").then(data => {

            obs.call("SetSceneItemTransform", {
            "sceneName": currentScene.currentProgramSceneName.toString(),
            "sceneItemId": sceneItemId,
            "sceneItemTransform": {
                alignment: 5,
                positionX: 0,
                positionY: 0,
                boundsType: 'OBS_BOUNDS_NONE',
                //boundsWidth: data.baseWidth,
                //boundsHeight: data.baseHeight,
                width: 1920,
                height: 1080
            }
        }).catch((err) => {
            console.log("Error set: Select A Scene Item in OBS for Size" + err)
            logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
        })
        
        }).catch(() => {
            console.log("Error get: Select A Scene Item in OBS for Size")
            logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
        })
    }).catch(() => {
        console.log("Error: Select A Scene Item in OBS for Size")
        logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
    })
    }
    //Duplicate Current Scene
    else if (msg[0] === '/duplicateCurrentScene'){
        return obs.call("GetCurrentProgramScene").then(data => {
            console.log(`OSC IN: ${msg}`)
            logEverywhere(`OSC IN: ${msg}`)
            let currentScene = data
            console.log(currentScene)
            console.log(currentScene.sources[0].sceneName)
                obs.call("CreateScene", {
                    sceneName: `${currentScene.sceneName} 2`
                }).then(() => {
                    currentScene.sources.forEach(item => {
                        obs.call("DuplicateSceneItem", {
                            fromScene: currentScene.sceneName,
                            toScene: `${currentScene.sceneName} 2`,
                            item: {
                                name: item.sceneName,
                                id: item.id
                            }
                        })
                    })
                }).catch((err) => {
                    console.log(err)
                    if (err.error === "scene with this name already exists"){
                        obs.call("CreateScene", {
                            sceneName: `${currentScene.sceneName} 2 3`
                        }).then(() => {
                            currentScene.sources.forEach(item => {
                                obs.call("DuplicateSceneItem", {
                                    fromScene: currentScene.sceneName,
                                    toScene: `${currentScene.sceneName} 2 3`,
                                    item: {
                                        name: item.sceneName,
                                        id: item.id
                                    }
                                })
                            })
                        }).catch(()=>{console.log("Same Name")})
                    }
                    console.log("Error: Select A Scene Item in OBS for Size")
            })
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Size")
            logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
        })
    }


    // Rename Source
    else if (msg[0] === '/rename'){
        logEverywhere(`OSC IN: ${msg}`)
        obs.call('SetInputName', {
            inputName: msg[1].split("_").join(" ").toString(),
            newInputName: msg[2].split("_").join(" ").toString()
        }).then(() => {
            logEverywhere(`Renamed ${msg[1]} to ${msg[2]}`)
        }).catch((err) => {
            console.log(err)
        })
    }

    // Send CC
    else if (msg[0] === '/sendCC'){
        logEverywhere(`OSC IN: ${msg}`)
        obs.call('SendStreamCaption', {
            captionText: msg[1].split("_").join(" ").toString()
        }).then(() => {
            logEverywhere(`Captions "${msg[1]}" were sent.`)
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Size")
            logEverywhere("ERROR: Invalid CC Syntax. See Help > API")
        })
    }

    //Active Scene Item Visibility by Index
    else if (msg[0].includes("/activeSceneItemVisibility")){
        let visible
        var msgArray = msg[0].split("/")
        let sceneArray = []
        msgArray.shift()
        msgArray.pop()
        if (msg[1] == "1" || msg[1] == 1){
            visible = true
        } else if (msg[1] == "0" || msg[1] == 0){
            visible = false
        }
        obs.call("GetSceneItemList")
        .then(data => {
            data.sceneItems.forEach(e => {
                sceneArray.push(e['sourceName'].toString())
            })
        })
        .then(() => {
            sceneArray.reverse()
            console.log(msgArray[0])
            obs.call("SetSceneItemProperties", {
                'item': sceneArray[parseInt(msgArray[0])],
                'visible': visible,
            }).catch(() => {
                console.log("yes")
                logEverywhere(`Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1\nOSC Recieved: ${msg}`)
    
            })
        })
    }

    //Scene Item Visibility by Index
    else if (msg[0].includes("/itemVisibility")){
        let visible
        var msgArray = msg[0].split("/")
        msgArray.shift()
        let sceneName = msgArray[0]
        let sceneArray = []
        msgArray.shift()
        msgArray.pop()
        if (msg[1] == "1" || msg[1] == 1){
            visible = true
        } else if (msg[1] == "0" || msg[1] == 0){
            visible = false
        }
        obs.call("GetSceneItemList", {
            'sceneName': sceneName.split('_').join(' ').toString()
        })
        .then(data => {
            data.sceneItems.forEach(e => {
                sceneArray.push(e['sourceName'].toString())
            })
        })
        .then(() => {
            sceneArray.reverse()
            console.log(msgArray[0])
            obs.call("SetSceneItemEnabled", {
                'sceneName': sceneName.split('_').join(' ').toString(),
                'sceneItem': sceneArray[parseInt(msgArray[0])],
                'sceneItemEnabled': visible,
            }).catch(() => {
                console.log("yes")
                logEverywhere(`Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1\nOSC Recieved: ${msg}`)
    
            })
        })
    }

    //Get Text (Freetype) repeatedly
    else if (msg[0].includes('/getTextFreetype')){
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        function getTextLoop(){
            obs.call('GetInputSettings', {
                inputName: msgArray[0].split('_').join(' ').toString()
            }).then((data) => {

                client.send(`/${msgArray[0]}text`, data.inputSettings.text, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                    if (err) console.log(err);
                        })
                logEverywhere(`OSC OUT: /${msgArray[0]}text ${data.inputSettings.text}`)
                if (msg[1] == 0){
                    clearInterval(loopGetText)
                    logEverywhere("STOPPPPP")
                }
            }).catch((err) =>{
                console.log(err)
            })
        }
        
        if (msg[1] == 1){
        let loopGetText = setInterval(getTextLoop,500)
        loopGetText
        } 


}

    //Get Text (GDI) repeatedly
    else if (msg[0].includes('/getTextGDI')){
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        function getTextLoop(){
            obs.call('GetInputSettings', {
                inputName: msgArray[0].split('_').join(' ').toString()
            }).then((data) => {

                client.send(`/${msgArray[0]}text`, data.inputSettings.text, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                    if (err) console.log(err);
                        })
                logEverywhere(`OSC OUT: /${msgArray[0]}text ${data.text}`)
                if (msg[1] == 0){
                    clearInterval(loopGetText)
                    logEverywhere("STOPPPPP")
                }
            }).catch((err) =>{
                console.log(err)
            })
        }
        
        if (msg[1] == 1){
        let loopGetText = setInterval(getTextLoop,500)
        loopGetText
        } 


}

    //Start Output NDI
    else if (msg[0] === "/startOutput"){
        obs.call('StartOutput', {
            outputName: `${msg[1]}`
        }).catch((err)=>{
            console.log(err)
        })
    }
    //Stop Output NDI
    else if (msg[0] === "/stopOutput"){
        obs.call('StopOutput', {
            outputName: `${msg[1]}`
        }).catch((err)=>{
            console.log(err)
        })
    }
    //List Outputs
    else if (msg[0] === "/listOutputs"){
        logEverywhere("--List of Outputs names:--")
        obs.call('GetOutputList').then((data)=>{
            data.outputs.forEach((i) => {
                logEverywhere(i.outputName)
            })
        }).catch((err)=>{
            console.log(err)
        })
    }

    //Take Screenshot
    else if (msg[0] === "/takeScreenshot"){
        obs.call("GetCurrentProgramScene").then(data => {
            obs.call("SaveSourceScreenshot", {
                sourceName: data.currentProgramSceneName,
                imageFormat: "png",
                imageFilePath: app.getPath('documents') + `/OBS_Screenshot${Date.now()}.png`,
    
            }).catch((err) =>{
                console.log(err)
            })
        }).catch((err) =>{
            console.log(err)
        })
        logEverywhere(`Screenshot Taken\nOSC Recieved: ${msg}`)
    }

    //Open External File
    else if (msg[0] === "/openExternal"){
        const { shell } = require('electron')
        logEverywhere(`Open External ${msg[1]}\nOSC Recieved: ${msg}`)
        shell.openExternal(`${msg[1]}`).catch((err) =>{logEverywhere(err)})
    }

    //Simulate Keypress
    else if (msg[0] === "/keypress"){
        logEverywhere(`Keypress ${msg[1]}\nOSC Recieved: ${msg}`)
        if (msg[1].includes(',')){
            let msgArray = msg[1].split(",")
            if (msg[1].includes('shift') || msg[1].includes('control') || msg[1].includes('alt') || msg[1].includes('@55')){
                ks.sendCombination(msgArray).catch(err => {
                    logEverywhere("Error: Make sure Java is installed and restart computer")
                });
                console.log(msgArray)
            } else {
                ks.sendKeys(msgArray).catch(err => {
                    logEverywhere("Error: Make sure Java is installed and restart computer")
                });
                console.log("justkeys")
            }
        } else {
            ks.sendKey(msg[1].toString()).catch(err => {
                logEverywhere("Error: Make sure Java is installed and restart computer")
            })
            console.log("single key")
        }
    }

    //Get Source Settings
    else if (msg[0] === ('/getSourceSettings')){
        obs.call('GetInputSettings', {
            inputName: msg[1].split("_").join(" ").toString()
        }).then((data) => {
            let json = JSON.stringify(data) 
            json = json.split(",").join("\n")
            logEverywhere(`Get Source Settings \nOSC Recieved: ${msg}`)
            logEverywhere(json)
        }).catch((err) => {
            console.log(err)
        })
    }

    // //Next Media
    // else if (msg[0] === ('/nextMedia')){
    //     obs.call('NextMedia', {
    //         sourceName: msg[1].split("_").join(" ").toString()
    //     })
    // }

    // //Previous Media
    // else if (msg[0] === ('/previousMedia')){
    //     obs.call('PreviousMedia', {
    //         sourceName: msg[1].split("_").join(" ").toString()
    //     })
    // }

    //Slideshow Update
    // else if (msg[0] === "/slideshowSpeed"){
    //     obs.call('SetSourceSettings', {
    //         sourceName: 'img',
    //         sourceSettings: {
    //             transitionSpeed: msg[1]
    //         }
    //     }).then(() => {logEverywhere(`Slideshow Speed at ${msg[1]}`)})
    //     .catch((err) => {console.error(err);})
    // }

    
    
    //Log Error
    else {
        console.log("Error: Invalid OSC command. Please refer to Node OBSosc on Github for Command List")
        logEverywhere("Error: Invalid OSC command. Please refer to OBSosc OSC Command List in 'Help' > 'API'")
    }
});

//OBS -> OSC Client (OUT)
obs.on('CurrentProgramSceneChanged', data => {

    

    obs.call('GetCurrentProgramScene').then(data => {
        currentScene = data.currentProgramSceneName
    })

    if(enableObs2App === "false"){
        enableObs2App = false
    } else if(enableObs2App === "true"){
        enableObs2App = true
    }
    //sceneNow = data['fromScene']
    // if (!data['fromScene']){
    //     sceneNow = currentScene            
    // }
    //console.log(currentScene + " " + sceneNow)
    //logEverywhere(`New Active Scene: ${currentScene}`)
    if (enableObs2App && !isTouchOSC){
    client.send(`${oscOutPrefix}${data.sceneName.split(' ').join('_').toString()}${oscOutSuffix}`, 1, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
        if (err) console.log(err);
            });
    } else if (enableObs2App && isTouchOSC){

        //Update TouchOSC Scenes
        for (let i = 0; i < 50; i++){
            client.send(`/item/${i}/visibility`, 0, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                if (err) console.log(err);
                    })
            client.send(`/item/${i}/name`, "-", (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                if (err) console.log(err);
                    })
        }

        let sceneArray = []
        let visibleArray = []
        obs.call("GetCurrentProgramScene").then(data => {
            currentScene = data.currentProgramSceneName
            obs.call("GetSceneItemList", {
                sceneName: currentScene
            }).then(data => {
                console.log(data.sceneItems)
                data.sceneItems.forEach(e => {
                    sceneArray.push(e['sourceName'].toString())
                })
            })
            .then(() => {
                sceneArray.reverse()
                console.log("testing testing")
                console.log(sceneArray)
                sceneArray.forEach((element, index) => {
                    let currentVisible
                    obs.call('GetSceneItemId', {
                        sceneName: currentScene,
                        sourceName: `${element}`
                    }).then(data => {
                        console.log("testingagain")
                        let currentSceneItemId = data.sceneItemId
                        obs.call('GetSceneItemEnabled', {
                            sceneName: currentScene,
                            sceneItemId: currentSceneItemId
                        })
                        .then(data => {
                            console.log("testingagain22222")
                            console.log(data.sceneItemEnabled)
                            currentVisible = data.sceneItemEnabled
                            if (currentVisible == true){
                                currentVisible = 1
                            } else if (currentVisible == false){
                                currentVisible = 0
                            }
                        })
                        .then(() => {
                            visibleArray.push(currentVisible)
                            //console.log(visibleArray)
                        })
                        .catch((err) => {
                            console.log(err)
                        })
        
                        setTimeout(() => {
                            client.send(`/item/${index}/visibility`, currentVisible, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                                if (err) console.log(err);
                                    })
                            client.send(`/item/${index}/name`, element, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                                if (err) console.log(err);
                                    })
                        }, 200);

                        // client.send(`/activeScene`, data.currentProgramSceneName, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        //     if (err) console.log(err);
                        //         });
                        // client.send(`/scene/${sceneNow.split(' ').join('_').toString()}`, 0, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        //     if (err) console.log(err);
                        //         });
                        // client.send(`/scene/${data['toScene'].split(' ').join('_').toString()}`, 1, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        //     if (err) console.log(err);
                        //         });
                
                        obs.call('GetCurrentSceneTransition').then(data => {
                            console.log("transitionyoooooo")
                            client.send(`/transitionType`, data.transitionName, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                                if (err) console.log(err);
                                    }) 
                            client.send(`/transitionDuration`, data.transitionDuration, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                                if (err) console.log(err);
                                    })
                            })
                    })
                })
            })
        })
    }
    })

    if(enableObs2App && isTouchOSC){
        let streaming
        let recording
        let mutedState

        obs.on('SceneTransitionEnded', data => {
            obs.call("GetCurrentProgramScene").then(data => {
                client.send(`/activeSceneCompleted`, data.currentProgramSceneName.toString(), (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                    if (err) console.log(err);
                        });
            })
        })

        obs.on("InputVolumeChanged", data => {
            console.log(Math.round(data.inputVolumeMul * 100) / 100)
            client.send(`/${data.inputName.split(' ').join('_').toString()}/volume`, Math.round(data.inputVolumeMul * 100) / 100, (err) => {
                console.log(err)
            })
        })

        obs.on('MediaInputPlaybackStarted', data => {
            client.send(`/${data.inputName.split(' ').join('_').toString()}/mediaPlay`, 1, (err) => {
                console.log(err)
            })
            client.send(`/${data.inputName.split(' ').join('_').toString()}/mediaPause`, 0, (err) => {
                console.log(err)
            })
            client.send(`/${data.inputName.split(' ').join('_').toString()}/mediaStop`, 0, (err) => {
                console.log(err)
            })
        })

        obs.on('MediaInputPlaybackEnded', data => {
            client.send(`/${data.inputName.split(' ').join('_').toString()}/mediaStop`, 1, (err) => {
                console.log(err)
            })
            client.send(`/${data.inputName.split(' ').join('_').toString()}/mediaPlay`, 0, (err) => {
                console.log(err)
            })
            client.send(`/${data.inputName.split(' ').join('_').toString()}/mediaPause`, 0, (err) => {
                console.log(err)
            })
        })

        obs.on('MediaInputActionTriggered', data => {
            if (data.mediaAction == "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE")
            client.send(`/${data.inputName.split(' ').join('_').toString()}/mediaPause`, 1, (err) => {
                console.log(err)
            })
            client.send(`/${data.inputName.split(' ').join('_').toString()}/mediaStop`, 0, (err) => {
                console.log(err)
            })
            client.send(`/${data.inputName.split(' ').join('_').toString()}/mediaPlay`, 0, (err) => {
                console.log(err)
            })
        })

        obs.on('InputMuteStateChanged', data => {
            if (data.inputMuted == true){
                mutedState = 1 
            } else {
                mutedState = 0
            }
            client.send(`/${data.inputName.split(' ').join('_').toString()}/audioToggle`, mutedState, (err) => {
                console.log(err)
            })
        })

        obs.on('SceneItemEnableStateChanged', data => {
            let visibilityState
            if (data['sceneItemEnabled'] === true){
                visibilityState = 1
            } else if (data['sceneItemEnabled'] === false){
                visibilityState = 0
            }
            client.send(`/${data['sceneName'].split(' ').join('_').toString()}/${data['item-name'].split(' ').join('_').toString()}/visible`, visibilityState, (err) => {
                console.log(err)
            })
            //Update TouchOSC Scenes
        let sceneArray = []
        let visibleArray = []
        obs.call("GetCurrentProgramScene").then(data => {
            currentScene = data.currentProgramSceneName
            obs.call("GetSceneItemList", {
                sceneName: currentScene
            }).then(data => {
                console.log(data.sceneItems)
                data.sceneItems.forEach(e => {
                    sceneArray.push(e['sourceName'].toString())
                })
            })
            .then(() => {
                sceneArray.reverse()
                console.log("testing testing")
                console.log(sceneArray)
                sceneArray.forEach((element, index) => {
                    let currentVisible
                    obs.call('GetSceneItemId', {
                        sceneName: currentScene,
                        sourceName: `${element}`
                    }).then(data => {
                        console.log("testingagain")
                        let currentSceneItemId = data.sceneItemId
                        obs.call('GetSceneItemEnabled', {
                            sceneName: currentScene,
                            sceneItemId: currentSceneItemId
                        })
                        .then(data => {
                            console.log("testingagain22222")
                            console.log(data.sceneItemEnabled)
                            currentVisible = data.sceneItemEnabled
                            if (currentVisible == true){
                                currentVisible = 1
                            } else if (currentVisible == false){
                                currentVisible = 0
                            }
                        })
                        .then(() => {
                            visibleArray.push(currentVisible)
                            //console.log(visibleArray)
                        })
                        .catch((err) => {
                            console.log(err)
                        })
        
                        setTimeout(() => {
                            client.send(`/item/${index}/visibility`, currentVisible, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                                if (err) console.log(err);
                                    })
                            client.send(`/item/${index}/name`, element, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                                if (err) console.log(err);
                                    })
                        }, 200);

                        // client.send(`/activeScene`, data.currentProgramSceneName, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        //     if (err) console.log(err);
                        //         });
                        // client.send(`/scene/${sceneNow.split(' ').join('_').toString()}`, 0, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        //     if (err) console.log(err);
                        //         });
                        // client.send(`/scene/${data['toScene'].split(' ').join('_').toString()}`, 1, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        //     if (err) console.log(err);
                        //         });
                
                        obs.call('GetCurrentSceneTransition').then(data => {
                            console.log("transitionyoooooo")
                            client.send(`/transitionType`, data.transitionName, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                                if (err) console.log(err);
                                    }) 
                            client.send(`/transitionDuration`, data.transitionDuration, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                                if (err) console.log(err);
                                    })
                            })
                    })
                })
            })
        })
            })

        obs.on('SourceOrderChanged', () => {
            //Update TouchOSC Scenes
        let sceneArray = []
        let visibleArray = []
        obs.call("GetSceneItemList").then(data => {
            data.sceneItems.forEach(e => {
                sceneArray.push(e['sourceName'].toString())
            })
        })
        .then(() => {
            sceneArray.reverse()
            console.log(sceneArray)
            sceneArray.forEach((element, index) => {
                let currentVisible
                obs.call('GetSceneItemProperties', {
                    item: `${element}`
                })
                .then(data => {
                    console.log(data.visible)
                    currentVisible = data.visible
                    if (currentVisible == true){
                        currentVisible = 1
                    } else if (currentVisible == false){
                        currentVisible = 0
                    }
                })
                .then(() => {
                    visibleArray.push(currentVisible)
                    //console.log(visibleArray)
                })
                .catch((err) => {
                    console.log(err)
                })

                setTimeout(() => {
                    client.send(`/item/${index}/visibility`, currentVisible, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        if (err) console.log(err);
                            })
                    client.send(`/item/${index}/name`, element, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        if (err) console.log(err);
                            })
                }, 200);

            })
        })
        })

        obs.on('SceneItemAdded', () => {
            //Update TouchOSC Scenes
        let sceneArray = []
        let visibleArray = []
        for (i = 0; i < 50; i++) {
            client.send(`/item/${i}/visibility`, 0, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                if (err) console.log(err);
                    })
            client.send(`/item/${i}/name`, "", (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                if (err) console.log(err);
                    })
          }
        obs.call("GetSceneItemList").then(data => {
            data.sceneItems.forEach(e => {
                sceneArray.push(e['sourceName'].toString())
            })
        })
        .then(() => {
            sceneArray.reverse()
            console.log(sceneArray)
            sceneArray.forEach((element, index) => {
                let currentVisible
                obs.call('GetSceneItemProperties', {
                    item: `${element}`
                })
                .then(data => {
                    console.log(data.visible)
                    currentVisible = data.visible
                    if (currentVisible == true){
                        currentVisible = 1
                    } else if (currentVisible == false){
                        currentVisible = 0
                    }
                })
                .then(() => {
                    visibleArray.push(currentVisible)
                    //console.log(visibleArray)
                })
                .catch((err) => {
                    console.log(err)
                })

                setTimeout(() => {
                    client.send(`/item/${index}/visibility`, currentVisible, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        if (err) console.log(err);
                            })
                    client.send(`/item/${index}/name`, element, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        if (err) console.log(err);
                            })
                }, 200);

            })
        })
        })

        obs.on('SceneItemRemoved', () => {
            //Update TouchOSC Scenes
        let sceneArray = []
        let visibleArray = []
        for (i = 0; i < 50; i++) {
            client.send(`/item/${i}/visibility`, 0, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                if (err) console.log(err);
                    })
            client.send(`/item/${i}/name`, "", (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                if (err) console.log(err);
                    })
          }
        obs.call("GetSceneItemList").then(data => {
            data.sceneItems.forEach(e => {
                sceneArray.push(e['sourceName'].toString())
            })
        })
        .then(() => {
            sceneArray.reverse()
            console.log(sceneArray)
            sceneArray.forEach((element, index) => {
                let currentVisible
                obs.call('GetSceneItemProperties', {
                    item: `${element}`
                })
                .then(data => {
                    console.log(data.visible)
                    currentVisible = data.visible
                    if (currentVisible == true){
                        currentVisible = 1
                    } else if (currentVisible == false){
                        currentVisible = 0
                    }
                })
                .then(() => {
                    visibleArray.push(currentVisible)
                    //console.log(visibleArray)
                })
                .catch((err) => {
                    console.log(err)
                })

                setTimeout(() => {
                    client.send(`/item/${index}/visibility`, currentVisible, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        if (err) console.log(err);
                            })
                    client.send(`/item/${index}/name`, element, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                        if (err) console.log(err);
                            })
                }, 200);

            })
        })
        })



        obs.on("RecordStateChanged", data => {
            if (data.outputActive == true){
                recording = 1
            } else {
                recording = 0
            }
            client.send(`/recording`, recording, (err) => {
                console.log(err)
            })
        })

        obs.on("StreamStateChanged", data => {
            if (data.outputActive == true){
                streaming = 1
            } else {
                streaming = 0
            }
            client.send(`/streaming`, streaming, (err) => {
                console.log(err)
            })
        })

        obs.on('GetStats', data => {
            client.send(`/fps`, `${Math.floor(data.activeFps)} fps`, (err) => {
                console.log(err)
            })
            console.log(data.activeFps)
            
            client.send(`/streamTime`, toHHMMSS(data['total-stream-time']), (err) => {
                console.log(err)
            })
            client.send(`/cpuUsage`, `${Math.round(data['cpuUsage'])}% cpu`, (err) => {
                console.log(err)
            })
            client.send(`/freeDiskSpace`, `${Math.round(data['availableDiskSpace'])} free disk space`, (err) => {
                console.log(err)
            })
            client.send(`/averageFrameTime`, `${Math.round(data['averageFrameRenderTime'])} avg frames dropped`, (err) => {
                console.log(err)
            })
            client.send(`/memoryUsage`, `${Math.round(data['memoryUsage'])} memory usage`, (err) => {
                console.log(err)
            })
            client.send(`/kbpsEncoder`, `${Math.round(data['kbits-per-sec'])} kbps`, (err) => {
                console.log(err)
            })
        })
    }

})
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
