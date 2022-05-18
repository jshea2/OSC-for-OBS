//OSC for OBS
//by Joe Shea


const { app, BrowserWindow, ipcRenderer, ipcMain, Menu, dialog } = require('electron');
const fs = require('fs')
const path = require('path');
//const os = require('os-utils')
const OBSWebSocket = require('obs-websocket-js');
const { Client, Server } = require('node-osc');
const { error } = require('console');
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
let windowSizelHeight = 610
let loadDelay = 1000

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
    const fileContent = fs.readFileSync(path.join(__dirname, "defaultOriginal.txt"), {encoding:'utf8', flag:'r'})
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
let obsPort = 4444;
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
obs.connect({
        address: obsIp + ':'+ obsPort,
        password: obsPassword
    })
    .then(() => {
        mainWindow.webContents.send("isstatus", "dotGreen")
        logging = `\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`;
        console.log(logging)
        logEverywhere(`\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`)
    })
    .then(() => {
        return obs.send('GetVersion')
    })
    .then(data => {
            logEverywhere(`Current OBS Studio Version: \n${data['obs-studio-version']}`)
            logEverywhere(`Current obs-websocket Plugin Version: \n${data['obs-websocket-version']}`)
            return obs.send('GetSceneList');                                    //Send a Get Scene List Promise
    })
    .then(data => {
        console.log(`\n${data.scenes.length} Available Scenes.` + "\n");    //Log Total Scenes
        logEverywhere(`\n${data.scenes.length} Available Scenes.` + "\n")
        console.log(data.scenes.forEach((thing, index) => {
            console.log((index + 1) + " - " + thing.name);
            logEverywhere((index + 1) + " - " + thing.name)                 //Log List of Available Scenes with OSC Index
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
    obs.send('GetSceneList').then(data => {
        data.scenes.forEach(i => {
            client.send("/new", "network", "1", (err) => {
                if (err) console.error(err);
                    })
            client.send("/cue/selected/customString", `/scene "${i.name}"`, (err) => {
                if (err) console.error(err);
                    })
            client.send("/cue/selected/name", `${i.name}`, (err) => {
                if (err) console.error(err);
                    })
        })
    })
}


//List Scene Items Function
listSceneItems = function listSceneItems(){
    return obs.send("GetSceneList").then(data => {
        logEverywhere("--- Available Scene Items: ---")
        // logEverywhere(data.name)
        // logEverywhere(msg[1])
        data.scenes.forEach(i => {
            obs.send("GetSceneItemList", {
                'sceneName': i.name,
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


//Listen and Log When New Scene is Activated
obs.on('SwitchScenes', data => {
    console.log(`New Active Scene: ${data.sceneName}`);
    // logEverywhere(`New Active Scene: ${data.sceneName}`)
});

let currentSceneItem
//Save Scene Item as Variable
obs.on("SceneItemSelected", data => {
    currentSceneItem = data['item-name']
    logEverywhere("Selected Scene Item: " + currentSceneItem)
    
})


//OBS quits and app attempts to reconnect
obs.on("Exiting", data => {
    console.log("YOU HAVE EXITED OBSSSS")
    let connectLoop = setInterval(connectOBS, 2000)
function connectOBS() {
    obs.connect({
        address: obsIp + ':'+ obsPort,
        password: obsPassword
    })
    .then(() => {
        clearInterval(connectLoop)
        mainWindow.webContents.send("isstatus", "dotGreen")
        logging = `\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`;
        console.log(logging)
        logEverywhere(`\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`)
    })
    .then(() => {
        return obs.send('GetVersion')
    })
    .then(data => {
            logEverywhere(`Current OBS Studio Version: \n${data['obs-studio-version']}`)
            logEverywhere(`Current obs-websocket Plugin Version: \n${data['obs-websocket-version']}`)
            return obs.send('GetSceneList');                                    //Send a Get Scene List Promise
    })
    .then(data => {
        console.log(`\n${data.scenes.length} Available Scenes.` + "\n");    //Log Total Scenes
        logEverywhere(`\n${data.scenes.length} Available Scenes.` + "\n")
        console.log(data.scenes.forEach((thing, index) => {
            console.log((index + 1) + " - " + thing.name);
            logEverywhere((index + 1) + " - " + thing.name)                 //Log List of Available Scenes with OSC Index
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


//OSC -> OBS
//When app receives OSC do..
server.on('message', (msg) => {
    
    //Trigger Scene by Index Number
    if (msg[0] === "/scene" && typeof msg[1] === 'number'){ 
      console.log("number thing works")                                     //When OSC Recieves a /scene do...
      var oscMessage = msg[1] - 1;                                          //Convert Index Number to Start at 1
      var oscMessage = Math.floor(oscMessage);                              //Converts Any Float Argument to Lowest Integer
    return obs.send('GetSceneList').then(data => {                          //Request Scene List Array
        console.log(`OSC IN: ${msg[0]} ${oscMessage + 1} (${data.scenes[oscMessage].name})`)
        logEverywhere(`OSC IN: ${msg[0]} ${oscMessage + 1} (${data.scenes[oscMessage].name})`)
        obs.send("SetCurrentScene", {
            'scene-name': data.scenes[oscMessage].name                      //Set to Scene from OSC
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
      return obs.send('GetSceneList').then(data => {                        //Request Scene List Array
          console.log(`OSC IN: ${firstIndex} ${oscMultiArg}`)
          logEverywhere(`OSC IN: ${firstIndex} ${oscMultiArg}`)
          obs.send("SetCurrentScene", {
              'scene-name': oscMultiArg                                     //Set to Scene from OSC
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
    return obs.send('GetSceneList').then(data => {                         //Request Scene List Array
        console.log(`OSC IN: ${msg[0]} ${oscMessage}`)
        logEverywhere(`OSC IN: ${msg[0]} ${oscMessage}`)
        obs.send("SetCurrentScene", {
            'scene-name': oscMessage                                       //Set to Scene from OSC
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
    obs.send("SetCurrentScene", {
        'scene-name': msgArray[0].split("_").join(" ").toString(),                                          //Set to Scene from OSC
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
        obs.send("SetCurrentScene", {
            'scene-name': msgArray[0].split("_").join(" ").toString(),                                          //Set to Scene from OSC
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
        obs.send("SetPreviewScene", {
            'scene-name': oscMessage                                       //Set to Scene from OSC
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
    obs.send("SetPreviewScene", {
        'scene-name': msgArray[0].split("_").join(" ").toString(),                                          //Set to Scene from OSC
        }).catch(() => {
            console.log(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.`);
            logEverywhere(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.\nOSC Recieved: ${msg}`);

        })
    }

    //Trigger StudioMode Transition
    else if (msg[0] === "/studioTransition"){
    obs.send("TransitionToProgram", {
        'with-transition': {
            name: msg[1],
            duration: msg[2]
        }
    }).catch(() => {
        logEverywhere(`Error: There is no Scene Transition "${msg[1]}" in OBS. Double check case sensitivity.\nOSC Recieved: ${msg}`);
    })
    } 

    //Triggers to "GO" to the Next Scene
    else if (msg[0] === "/go"){                                          //When OSC Recieves a /go do...
            
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
            console.log("Error: Invalid OSC Message");                              //Catch Error
            logEverywhere(`Error: Invalid OSC Message\nOSC Recieved: ${msg}`);                              //Catch Error

            });
        })
    } 
    //Triggers Previous Scene to go "BACK"
    else if (msg[0] === "/back"){                                                 //Same Concept as Above Except Going to the Previous Scene

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
            logEverywhere(`Error: Invalid OSC Message\nOSC Recieved: ${msg}`)
            });
        })


    } 

    //Set Recording by Arg
    else if (msg[0] === "/setRecording"){
        if (msg[1] == 1){
            obs.send("StartRecording").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        } else if (msg[1] == 0){
            obs.send("StopRecording").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        }

    
    } 
    //Triggers Start Recording
    else if (msg[0] === "/startRecording"){
        obs.send("StartRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Stop Recording
    else if (msg[0] === "/stopRecording"){
        obs.send("StopRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Toggle Recording
    else if (msg[0] === "/toggleRecording"){
        obs.send("StartStopRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Set Streaming by Arg
    else if (msg[0] === "/setStreaming"){
        if (msg[1] == 1){
            obs.send("StartStreaming").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        } else if (msg[1] == 0){
            obs.send("StopStreaming").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        }

    
    } 
    //Triggers Start Streaming
    else if (msg[0] === "/startStreaming"){
        obs.send("StartStreaming").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Stop Streaming
    else if (msg[0] === "/stopStreaming"){
        obs.send("StopStreaming").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Toggle Streaming
    else if (msg[0] === "/toggleStreaming"){
        obs.send("StartStopStreaming").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Set VirtualCam by Arg
    else if (msg[0] === "/setVirtualCam"){
        if (msg[1] == 1){
            obs.send("StartVirtualCam").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        } else if (msg[1] == 0){
            obs.send("StopVirtualCam").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        }

    
    } 
    //Triggers Start VirtualCam
    else if (msg[0] === "/startVirtualCam"){
        obs.send("StartVirtualCam").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Stop VirtualCam
    else if (msg[0] === "/stopVirtualCam"){
        obs.send("StopVirtualCam").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Toggle VirtualCam
    else if (msg[0] === "/toggleVirtualCam"){
        obs.send("StartStopVirtualCam").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Pause Recording
    else if (msg[0] === "/pauseRecording"){
        obs.send("PauseRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Resume Recording
    else if (msg[0] === "/resumeRecording"){
        obs.send("ResumeRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    }
    //Set StudioMode by Arg
    else if (msg[0] === "/setStudioMode"){
        if (msg[1] == 1){
            obs.send("EnableStudioMode").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        } else if (msg[1] == 0){
            obs.send("DisableStudioMode").catch((err) => {
                console.log(`ERROR: ${err.error}`)
                logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
            })
        }

    
    } 
    //Triggers Enable Studio Mode
    else if (msg[0] === "/enableStudioMode"){
        obs.send("EnableStudioMode").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Disable Studio Mode
    else if (msg[0] === "/disableStudioMode"){
        obs.send("DisableStudioMode").catch((err) => {
            console.log(`ERROR: ${err.error}`);
            logEverywhere(`ERROR: ${err}\nOSC Recieved: ${msg}`)
        })
    
    } 
    //Triggers Toggle Studio Mode
    else if (msg[0] === "/toggleStudioMode"){
        obs.send("ToggleStudioMode").catch((err) => {
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
        var visible;
        if(msg[1] === 0 || msg[1] === 'off' || msg[1] === '0' || msg[1] === 'false'){
            visible = false
        } else if(msg[1] === 1 || msg[1] === 'on' || msg[1] === '1' || msg[1] === 'true'){
            visible = true
        }
        obs.send("SetSceneItemProperties", {
            'scene-name': msgArray[0].split('_').join(' ').toString(),
            'item': msgArray[1].split('_').join(' ').toString(),
            'visible': visible,
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
            logEverywhere(`Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1\nOSC Recieved: ${msg}`)

        })
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
        obs.send("SetSourceFilterVisibility", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterEnabled': visiblef
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
            logEverywhere(`Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1\nOSC Recieved: ${msg}`)

        })
    }

    //SetTextFreetype2 Text
    else if (msg[0].includes('setText')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        console.log(msg[1]);
        obs.send("SetTextFreetype2Properties", {
            'source': msgArray[0].split('_').join(' '),
            'text': msg[1].toString(),
            'font': {
                size: msg[2],
                face: msg[3]
            }
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
        obs.send("SetSourceFilterSettings", {
           'sourceName': msgArray[0].split('_').join(' '),
           'filterName': msgArray[1].split('_').join(' '),
           'filterSettings': {'opacity' : parseInt(msg[1])}
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
        obs.send("SetSourceFilterSettings", {
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
        obs.send("SetSourceFilterSettings", {
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
        obs.send("SetSourceFilterSettings", {
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
        obs.send("SetSourceFilterSettings", {
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
        obs.send("SetSourceFilterSettings", {
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
            obs.send("SetCurrentTransition", {
                'transition-name': msgArray[0].toString()
            }).catch(() => {
                console.log("Whoops")
                logEverywhere(`Error: Transition Syntax Error. See Help > API`)
            })
        } else {
            if (msg[1] == undefined){
                obs.send("GetTransitionDuration").then(data => {
                    var tranisionTime = data["transition-duration"]
                    console.log(`OSC IN: ${msg[0]} ${msg[1]}\nCurrent Duration: ${tranisionTime}`)
                    logEverywhere(`OSC IN: ${msg[0]}\nCurrent Duration: ${tranisionTime}`)
                })
            } else {
            console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
            logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
            }
            var makeSpace = msgArray[0].split('_').join(' ');
            obs.send("SetCurrentTransition", {
                'transition-name': makeSpace.toString()
            }) 
        if(msg.length === 2){
        obs.send("SetTransitionDuration", {
            'duration': msg[1]
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
        var x = msg[1] + 960
        var y = msg[2] - (msg[2] * 2)
        obs.send("SetSceneItemProperties", {
            'scene-name': msgArray[0].toString().split('_').join(' '),
            'item': msgArray[1].toString().split('_').join(' '),
            'position': { 'x': x, 'y': y + 540}
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Position Name. See Help > API")
        })
    }
    //Source Scale Translate
    else if (msg[0].includes('scale')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var visible;
        obs.send("SetSceneItemProperties", {
            'scene-name': msgArray[0].split('_').join(' ').toString(),
            'item': msgArray[1].split('_').join(' ').toString(),
            'scale': { 'x': msg[1], 'y': msg[1]}
        }).catch(() => {
            console.log("Error: Invalid Scale Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
            logEverywhere("ERROR: Invalid Scale Syntax. See Help > API")
        })
    } 
    //Source Rotation Translate
    else if (msg[0].includes('rotate')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetSceneItemProperties", {
            'scene-name': msgArray[0].split('_').join(' ').toString(),
            'item': msgArray[1].split('_').join(' ').toString(),
            'rotation': msg[1]
        }).catch(() => {
            console.log("Error: Invalid Rotation Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/rotate 0 or 1, example: /Wide/VOX/rotate 1")
            logEverywhere("Error: Invalid Rotation Syntax. See Help > API")
        })
    }  

    //Triggers Source UnMute
    else if (msg[0].includes('unmute')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetMute", {
            'source': msgArray[0].split('_').join(' ').toString(),
            'mute': false,
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
        obs.send("SetMute", {
            'source': msgArray[0].split('_').join(' ').toString(),
            'mute': true,
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mute 0 or 1, example: /Audio/mute 1")
            logEverywhere("ERROR: Invalid Mute Syntax. See Help > API")
        })
    }
    //Triggers Source Mute Toggle
    else if (msg[0].includes('audioToggle')){
        let isMute = msg[1]
        if (isMute == 1){
            isMute = true
        } else if(isMute == 0){
            isMute = false
        }
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetMute", {
            'source': msgArray[0].split('_').join(' ').toString(),
            'mute': isMute,
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
        obs.send("SetVolume", {
            'source': msgArray[0].split('_').join(' ').toString(),
            'volume': msg[1],
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
        obs.send("SetAudioMonitorType", {
            'sourceName': msgArray[0].split('_').join(' ').toString(),
            'monitorType': "none",
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
        obs.send("SetAudioMonitorType", {
            'sourceName': msgArray[0].split('_').join(' ').toString(),
            'monitorType': "monitorOnly",
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
        obs.send("SetAudioMonitorType", {
            'sourceName': msgArray[0].split('_').join(' ').toString(),
            'monitorType': "monitorAndOutput",
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/volume 0-1, example: /Audio/volume 1")
            logEverywhere("ERROR: Invalid Monitor and Output Syntax. See Help > API")

        })
    }

    //Open Projector
    else if (msg[0].includes('openProjector')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("OpenProjector", {
            'type': msgArray[0].split('_').join(' ').toString(),
            'monitor': msg[1],
            'name': msg[2]
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
        obs.send("PlayPauseMedia", {
            'sourceName': msgArray[0].split('_').join(' ').toString(),
            'playPause': false,
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
        obs.send("PlayPauseMedia", {
            'sourceName': msgArray[0].split('_').join(' ').toString(),
            'playPause': true,
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
        obs.send("RestartMedia", {
            'sourceName': msgArray[0].split('_').join(' ').toString()
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
        obs.send("StopMedia", {
            'sourceName': msgArray[0].split('_').join(' ').toString()
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaStop, example: /Media_Source/mediaStop")
            logEverywhere("ERROR: Invalid Media Stop Syntax. See Help > API")

        })
    }
    //Media Stop
    else if (msg[0].includes('refreshBrowser')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("RefreshBrowserSource", {
            'sourceName': msgArray[0].split('_').join(' ').toString()
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Source Name]/mediaStop, example: /Media_Source/mediaStop")
            logEverywhere("ERROR: Invalid Refresh Browser Syntax. See Help > API")

        })
    }

    //Set Source Collection
    else if (msg[0] === "/setSceneCollection"){
        obs.send("SetCurrentSceneCollection", {
            'sc-name': msg[1].toString()
        }).catch(() => {
            logEverywhere("ERROR: Invalid) Refresh Browser Syntax. See Help > API")
        })
    }
    //Set Profile
    else if (msg[0] === "/setProfile"){
        obs.send("SetCurrentProfile", {
            'profile-name': msg[1].toString()
        }).catch(() => {
            logEverywhere("ERROR: Invalid) Refresh Browser Syntax. See Help > API")
        })
    }

    else if (msg[0] === "/recFileName"){
        obs.send("SetFilenameFormatting", {
            'filename-formatting': msg[1].toString()
        }).catch(() => {
            logEverywhere("ERROR: Invalid) Refresh Browser Syntax. See Help > API")
        })
    }

    // ----- TouchOSC COMMANDS: ------

    //Log ALL Scene Items
    else if (msg[0] === '/logAllSceneItems'){
        return obs.send("GetSceneList").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        logEverywhere("--- Available Scene Items: ---")
        // logEverywhere(data.name)
        // logEverywhere(msg[1])
        data.scenes.forEach(i => {
            obs.send("GetSceneItemList", {
                'sceneName': i.name,
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
    //Source Position Select Move
    else if (msg[0] === '/addSceneItem'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        // logEverywhere(data.name)
        // logEverywhere(msg[1])
        obs.send("AddSceneItem", {
            'sceneName': data.name,
            'sourceName': msg[1].toString(),
            'setVisible': true
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Add Scene Item Syntax. See Help > API")
        })
    })
    }
    //Source Position Select Move
    else if (msg[0] === '/move'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = Math.floor((msg[2]*2000))
        var y = Math.floor((msg[1]*2000) + 960)
        console.log(x + " " + y)
        logEverywhere(x + " " + y)
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name,
            'item': currentSceneItem,
            'position': { 'x': x + 540, 'y': y, 'alignment': 0}
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Move Syntax. See Help > API")
        })
    })
    }
    //Source Position Select MoveX
    else if (msg[0] === '/movex'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = Math.floor((msg[1]*2000))
        var y = Math.floor((msg[1]*2000) + 960)
        console.log(x + " " + y)
        logEverywhere(x + " " + y)
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name,
            'item': currentSceneItem,
            'position': { 'x': x + 540, 'alignment': 0}
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Move X Syntax. See Help > API")
        })
    })
    }
    //Source Position Select MoveY
    else if (msg[0] === '/movey'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = Math.floor((msg[2]*2000))
        var y = Math.floor((msg[1]*2000) + 960)
        console.log(x + " " + y)
        logEverywhere(x + " " + y)
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name,
            'item': currentSceneItem,
            'position': { 'y': y, 'alignment': 0}
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Move Y Syntax. See Help > API")
        })
    })
    }   
    //Source Align
    else if (msg[0] === '/align'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        console.log("Scene NAme: " + data.name)
        console.log("Scene NAme: " + currentSceneItem)
        var x = 0 + 960
        var y = 0 + 540
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name.toString(),
            'item': currentSceneItem,
            'position': {'x': x, 'y': y, 'alignment': msg[1]}
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Alignment")
            logEverywhere("ERROR: Invalid Alignment Syntax. See Help > API")
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
        return obs.send("GetCurrentScene").then(data => {
        obs.send("SetSceneTransitionOverride", {
            'sceneName': data.name,
            'transitionName': msgArray[1].split('_').join(' ').toString(),
        }).catch(() => {
            logEverywhere("ERROR: Invalid Transition Override Type Syntax. See Help > API")
        })
    })
    }
    //Set Transition Override
    else if(msg[0] === '/transOverrideDuration'){
        let currentSceneName
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        return obs.send("GetCurrentScene").then(data => {
            currentSceneName = data.name
        return obs.send("GetSceneTransitionOverride", {
            'sceneName': currentSceneName
        }).then(data => {
            obs.send("SetSceneTransitionOverride", {
                'sceneName': currentSceneName,
                'transitionName': data.transitionName,
                'transitionDuration': Math.floor(msg[1])
            })
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalid Transition Override Duration Syntax. See Help > API")
        })
    })
    }
    //Source Size
    else if (msg[0] === '/size'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name.toString(),
            'item': currentSceneItem,
            'scale': {'x': msg[1], 'y': msg[1]}
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Size")
            logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
        })
    })
    }
    //Source Rotate
    else if (msg[0] === '/spin'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name.toString(),
            'item': currentSceneItem,
            'rotation': msg[1]
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Size")
            logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
        })
    })
    }
    //Fit to Screen
    else if (msg[0] === '/fitToScreen'){
        return obs.send("GetCurrentScene").then(data => {
            console.log(`OSC IN: ${msg}`)
            logEverywhere(`OSC IN: ${msg}`)
            let currentScene = data
        obs.send("GetVideoInfo").then(data => {

            obs.send("SetSceneItemProperties", {
            "scene-name": currentScene.name.toString(),
            item: {
                name: currentSceneItem.toString(),
            },
            position: {
                x: 0,
                y: 0
            },
            bounds: {
               type: "OBS_BOUNDS_SCALE_INNER",
               x: data.baseWidth,
               y: data.baseHeight
            }
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Size")
            logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
        })
        
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Size")
            logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
        })
    }).catch(() => {
        console.log("Error: Select A Scene Item in OBS for Size")
        logEverywhere("ERROR: Invalid Size Syntax. See Help > API")
    })
    }
    //Duplicate Current Scene
    else if (msg[0] === '/duplicateCurrentScene'){
        return obs.send("GetCurrentScene").then(data => {
            console.log(`OSC IN: ${msg}`)
            logEverywhere(`OSC IN: ${msg}`)
            let currentScene = data
            console.log(currentScene)
            console.log(currentScene.sources[0].name)
                obs.send("CreateScene", {
                    sceneName: `${currentScene.name} 2`
                }).then(() => {
                    currentScene.sources.forEach(item => {
                        obs.send("DuplicateSceneItem", {
                            fromScene: currentScene.name,
                            toScene: `${currentScene.name} 2`,
                            item: {
                                name: item.name,
                                id: item.id
                            }
                        })
                    })
                }).catch((err) => {
                    console.log(err)
                    if (err.error === "scene with this name already exists"){
                        obs.send("CreateScene", {
                            sceneName: `${currentScene.name} 2 3`
                        }).then(() => {
                            currentScene.sources.forEach(item => {
                                obs.send("DuplicateSceneItem", {
                                    fromScene: currentScene.name,
                                    toScene: `${currentScene.name} 2 3`,
                                    item: {
                                        name: item.name,
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
        obs.send('SetSourceName', {
            sourceName: msg[1].split("_").join(" ").toString(),
            newName: msg[2].split("_").join(" ").toString()
        }).then(() => {
            logEverywhere(`Renamed ${msg[1]} to ${msg[2]}`)
        }).catch((err) => {
            console.log(err)
        })
    }

    // Send CC
    else if (msg[0] === '/sendCC'){
        logEverywhere(`OSC IN: ${msg}`)
        obs.send('SendCaptions', {
            text: msg[1].split("_").join(" ").toString()
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
        obs.send("GetSceneItemList")
        .then(data => {
            data.sceneItems.forEach(e => {
                sceneArray.push(e['sourceName'].toString())
            })
        })
        .then(() => {
            sceneArray.reverse()
            console.log(msgArray[0])
            obs.send("SetSceneItemProperties", {
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
        obs.send("GetSceneItemList", {
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
            obs.send("SetSceneItemProperties", {
                'scene-name': sceneName.split('_').join(' ').toString(),
                'item': sceneArray[parseInt(msgArray[0])],
                'visible': visible,
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
            obs.send('GetTextFreetype2Properties', {
                source: msgArray[0].split('_').join(' ').toString()
            }).then((data) => {

                client.send(`/${msgArray[0]}text`, data.text, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
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

    //Get Text (GDI) repeatedly
    else if (msg[0].includes('/getTextGDI')){
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log(msgArray[0])
        function getTextLoop(){
            obs.send('GetTextGDIPlusProperties', {
                source: msgArray[0].split('_').join(' ').toString()
            }).then((data) => {

                client.send(`/${msgArray[0]}text`, data.text, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
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
        obs.send('StartOutput', {
            outputName: `${msg[1]}`
        }).catch((err)=>{
            console.log(err)
        })
    }
    //Stop Output NDI
    else if (msg[0] === "/stopOutput"){
        obs.send('StopOutput', {
            outputName: `${msg[1]}`
        }).catch((err)=>{
            console.log(err)
        })
    }
    //Stop Output NDI
    else if (msg[0] === "/listOutputs"){
        logEverywhere("--List of Outputs names:--")
        obs.send('ListOutputs').then((data)=>{
            data.outputs.forEach((i) => {
                logEverywhere(i.name)
            })
        }).catch((err)=>{
            console.log(err)
        })
    }

    //Take Screenshot
    else if (msg[0] === "/takeScreenshot"){
        obs.send("TakeSourceScreenshot", {
            embedPictureFormat: "png",
            saveToFilePath: app.getPath('documents') + `/OBS_Screenshot${Date.now()}.png`,

        }).catch((err) =>{
            console.log(err)
        })
    }

    //Open External File
    else if (msg[0] === "/openExternal"){
        const { shell } = require('electron')
        shell.openExternal(`${msg[1]}`).catch((err) =>{logEverywhere(err)})
    }

    //Simulate Keypress
    else if (msg[0] === "/keypress"){
        if (msg[1].includes(',')){
            let msgArray = msg[1].split(",")
            if (msg[1].includes('shift') || msg[1].includes('control') || msg[1].includes('alt') || msg[1].includes('@55')){
                ks.sendCombination(msgArray);
                console.log(msgArray)
            } else {
                ks.sendKeys(msgArray);
                console.log("justkeys")
            }
        } else {
            ks.sendKey(msg[1].toString()).catch((err) =>{console.log(err)})
            console.log("single key")
        }
    }

    //Get Source Settings
    else if (msg[0] === ('/getSourceSettings')){
        obs.send('GetSourceSettings', {
            sourceName: msg[1].split("_").join(" ").toString()
        }).then((data) => {
            let json = JSON.stringify(data) 
            json = json.split(",").join("\n")
            logEverywhere(json)
        }).catch((err) => {
            console.log(err)
        })
    }

    //Next Media
    else if (msg[0] === ('/nextMedia')){
        obs.send('NextMedia', {
            sourceName: msg[1].split("_").join(" ").toString()
        })
    }

    //Previous Media
    else if (msg[0] === ('/previousMedia')){
        obs.send('PreviousMedia', {
            sourceName: msg[1].split("_").join(" ").toString()
        })
    }

    //Slideshow Update
    else if (msg[0] === "/slideshowSpeed"){
        obs.send('SetSourceSettings', {
            sourceName: 'img',
            sourceSettings: {
                transition_speed: msg[1]
            }
        }).then(() => {logEverywhere(`Slideshow Speed at ${msg[1]}`)})
        .catch((err) => {console.error(err);})
    }

    
    
    //Log Error
    else {
        console.log("Error: Invalid OSC command. Please refer to Node OBSosc on Github for Command List")
        logEverywhere("Error: Invalid OSC command. Please refer to OBSosc OSC Command List in 'Help' > 'API'")
    }
});

//OBS -> OSC Client (OUT)
obs.on('TransitionBegin', data => {

    obs.send('GetCurrentScene').then(data => {
        currentScene = data.name
    })

    if(enableObs2App === "false"){
        enableObs2App = false
    } else if(enableObs2App === "true"){
        enableObs2App = true
    }
    sceneNow = data['from-scene']
    if (!data['from-scene']){
        sceneNow = currentScene            
    }
    console.log(currentScene + " " + sceneNow)
    logEverywhere(`New Active Scene: ${data['to-scene']}`)
    if (enableObs2App && !isTouchOSC){
    client.send(`${oscOutPrefix}${data['to-scene'].split(' ').join('_').toString()}${oscOutSuffix}`, 1, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
        if (err) console.log(err);
            });
    } else if (enableObs2App && isTouchOSC){

        //Update TouchOSC Scenes
        let sceneArray = []
        let visibleArray = []
        obs.send("GetSceneItemList").then(data => {
            data.sceneItems.forEach(e => {
                sceneArray.push(e['sourceName'].toString())
            })
        })
        .then(() => {
            sceneArray.reverse()
            console.log(sceneArray)
            sceneArray.forEach((element, index) => {
                let currentVisible
                obs.send('GetSceneItemProperties', {
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

        client.send(`/activeScene`, data['to-scene'].toString(), (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
            if (err) console.log(err);
                });
        client.send(`/scene/${sceneNow.split(' ').join('_').toString()}`, 0, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
            if (err) console.log(err);
                });
        client.send(`/scene/${data['to-scene'].split(' ').join('_').toString()}`, 1, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
            if (err) console.log(err);
                });
        client.send(`/transitionType`, data.type, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
            if (err) console.log(err);
                }) 
        client.send(`/transitionDuration`, data.duration, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
            if (err) console.log(err);
                })
        }
    })

    if(enableObs2App && isTouchOSC){
        let streaming
        let recording
        let mutedState

        obs.on('TransitionEnd', data => {
            client.send(`/activeSceneCompleted`, data['to-scene'].toString(), (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
                if (err) console.log(err);
                    });
        })

        obs.on('SourceVolumeChanged', data => {
            console.log(Math.round(data.volume * 100) / 100)
            client.send(`/${data.sourceName.split(' ').join('_').toString()}/volume`, Math.round(data.volume * 100) / 100, (err) => {
                console.log(err)
            })
        })

        obs.on('MediaPlaying', data => {
            client.send(`/${data.sourceName.split(' ').join('_').toString()}/mediaPlay`, 1, (err) => {
                console.log(err)
            })
            client.send(`/${data.sourceName.split(' ').join('_').toString()}/mediaStop`, 0, (err) => {
                console.log(err)
            })
            client.send(`/${data.sourceName.split(' ').join('_').toString()}/mediaPause`, 0, (err) => {
                console.log(err)
            })
        })

        obs.on('MediaPaused', data => {
            client.send(`/${data.sourceName.split(' ').join('_').toString()}/mediaPause`, 1, (err) => {
                console.log(err)
            })
            client.send(`/${data.sourceName.split(' ').join('_').toString()}/mediaPlay`, 0, (err) => {
                console.log(err)
            })
            client.send(`/${data.sourceName.split(' ').join('_').toString()}/mediaStop`, 0, (err) => {
                console.log(err)
            })
        })

        obs.on('MediaStopped', data => {
            client.send(`/${data.sourceName.split(' ').join('_').toString()}/mediaStop`, 1, (err) => {
                console.log(err)
            })
            client.send(`/${data.sourceName.split(' ').join('_').toString()}/mediaPause`, 0, (err) => {
                console.log(err)
            })
            client.send(`/${data.sourceName.split(' ').join('_').toString()}/mediaPlay`, 0, (err) => {
                console.log(err)
            })
        })

        obs.on('SourceMuteStateChanged', data => {
            if (data.muted == true){
                mutedState = 1 
            } else {
                mutedState = 0
            }
            client.send(`/${data.sourceName.split(' ').join('_').toString()}/audioToggle`, mutedState, (err) => {
                console.log(err)
            })
        })

        obs.on('StreamStarted', () => {
            client.send(`/streaming`, 1, (err) => {
                console.log(err)
            })
        })

        obs.on('StreamStopped', () => {
            client.send(`/streaming`, 0, (err) => {
                console.log(err)
            })
        })

        obs.on('SceneItemVisibilityChanged', data => {
            let visibilityState
            if (data['item-visible'] === true){
                visibilityState = 1
            } else if (data['item-visible'] === false){
                visibilityState = 0
            }
            client.send(`/${data['scene-name'].split(' ').join('_').toString()}/${data['item-name'].split(' ').join('_').toString()}/visible`, visibilityState, (err) => {
                console.log(err)
            })
            //Update TouchOSC Scenes
            let sceneArray = []
            let visibleArray = []
            obs.send("GetSceneItemList").then(data => {
                data.sceneItems.forEach(e => {
                    sceneArray.push(e['sourceName'].toString())
                })
            })
            .then(() => {
                sceneArray.reverse()
                console.log(sceneArray)
                sceneArray.forEach((element, index) => {
                    let currentVisible
                    obs.send('GetSceneItemProperties', {
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

        obs.on('SourceOrderChanged', () => {
            //Update TouchOSC Scenes
        let sceneArray = []
        let visibleArray = []
        obs.send("GetSceneItemList").then(data => {
            data.sceneItems.forEach(e => {
                sceneArray.push(e['sourceName'].toString())
            })
        })
        .then(() => {
            sceneArray.reverse()
            console.log(sceneArray)
            sceneArray.forEach((element, index) => {
                let currentVisible
                obs.send('GetSceneItemProperties', {
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
        obs.send("GetSceneItemList").then(data => {
            data.sceneItems.forEach(e => {
                sceneArray.push(e['sourceName'].toString())
            })
        })
        .then(() => {
            sceneArray.reverse()
            console.log(sceneArray)
            sceneArray.forEach((element, index) => {
                let currentVisible
                obs.send('GetSceneItemProperties', {
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
        obs.send("GetSceneItemList").then(data => {
            data.sceneItems.forEach(e => {
                sceneArray.push(e['sourceName'].toString())
            })
        })
        .then(() => {
            sceneArray.reverse()
            console.log(sceneArray)
            sceneArray.forEach((element, index) => {
                let currentVisible
                obs.send('GetSceneItemProperties', {
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

        obs.on('StreamStatus', data => {
            client.send(`/fps`, `${Math.floor(data.fps)} fps`, (err) => {
                console.log(err)
            })
            console.log(data.fps)
            if (data.recording == 1){
                recording = 1
            } else {
                recording = 0
            }
            client.send(`/recording`, recording, (err) => {
                console.log(err)
            })
            client.send(`/streamTime`, toHHMMSS(data['total-stream-time']), (err) => {
                console.log(err)
            })
            client.send(`/cpuUsage`, `${Math.round(data['cpu-usage'])}% cpu`, (err) => {
                console.log(err)
            })
            client.send(`/freeDiskSpace`, `${Math.round(data['free-disk-space'])} free disk space`, (err) => {
                console.log(err)
            })
            client.send(`/averageFrameTime`, `${Math.round(data['average-frame-time'])} avg frames dropped`, (err) => {
                console.log(err)
            })
            client.send(`/memoryUsage`, `${Math.round(data['memory-usage'])} memory usage`, (err) => {
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
