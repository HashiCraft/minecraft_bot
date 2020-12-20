const Miner = require('./miner')

var tty = require("tty");
const nodeFlags = require('node-flag')

const express = require('express')
const http = require('http')
var bodyParser = require('body-parser')
const uuidv4 = require("uuid/v4")

// Settings
const bindAddress = process.env.BIND_ADDR || '0.0.0.0'
const bindPort = process.env.BIND_PORT || 3000

const rootSettings = {
  host: process.env.HOST, // optional
  port: process.env.PORT || 25565,       // optional
  username: process.env.BOT_USERNAME, // email and password are required only for
  password: process.env.BOT_PASSWORD,          // online-mode=true servers
  version: false, 
  //viewer_port: 3007
}

const app = express()
const server = http.createServer(app)

const miner = new Miner()

// graceful shutdown
process.on('SIGINT', function() {
  console.log("Killing the bot");
  var t = setTimeout(() => process.exit(), 5000)

  miner.killBot(() => {
    clearTimeout(t)
    process.exit();
  })

  server.close(() => {
    console.log('HTTP server closed')
  })
});


app.use(bodyParser.json())

app.get('/health', (req, res) => {
  res.send('OK')
})

app.post('/bot', (req, res) => {
  const jb = req.body
  // create the settings
  var s = rootSettings
  console.log(jb)
  
  if(jb) {
    s = {
      host: jb.host || rootSettings.host, 
      port: jb.port || rootSettings.port,
      username: jb.username || rootSettings.username,
      password: jb.password || rootSettings.password,
      version: rootSettings.version,
      viewer_port: rootSettings.viewer_port
    }
  }

  miner.createBot(s)

  res.send(
    {
      id: uuidv4(),
      message: 'bot started'
    }
  )
})

app.delete('/bot/:id', (req, res) => {
  miner.killBot()
  res.send(
    {
    id: req.params.id,
    message: 'bot killed'
    }
  )
})

app.post('/bot/:id/configure',(req, res) => {
  const d = req.body
  console.log(d)

  // process the mineStart
  const ms = d.mine_start
  if(!ms) {
    res.status(400)
    res.send({message: 'Please specify the mine_start parameter as a comma separated string x,y,z'})
    return
  }

  const msParts = ms.split(',')
  if(!msParts || msParts.length !== 3) {
    res.status(400)
    res.send({message: 'Please specify the mine_start parameter as a comma separated string x,y,z'})
    return
  }
  
  // process the mineEnd
  const me = d.mine_end
  if(!me) {
    res.status(400)
    res.send({message: 'Please specify the mine_end parameter as a comma separated string x,y,z'})
    return
  }

  const meParts = me.split(',')
  if(!meParts || meParts.length !== 3) {
    res.status(400)
    res.send({message: 'Please specify the mine_end parameter as a comma separated string x,y,z'})
    return
  }
  
  // process the tool_chest
  const tc = d.tool_chest
  if(!tc) {
    res.status(400)
    res.send({message: 'Please specify the tool_chest parameter as a comma separated string x,y,z'})
    return
  }

  const tcParts = tc.split(',')
  if(!tcParts || tcParts.length !== 3) {
    res.status(400)
    res.send({message: 'Please specify the tool_chest parameter as a comma separated string x,y,z'})
    return
  }
  
  // process the drop_chest
  const dc = d.drop_chest
  if(!dc) {
    res.status(400)
    res.send({message: 'Please specify the drop_chest parameter as a comma separated string x,y,z'})
    return
  }

  const dcParts = dc.split(',')
  if(!dcParts || dcParts.length !== 3) {
    res.status(400)
    res.send({message: 'Please specify the drop_chest parameter as a comma separated string x,y,z'})
    return
  }

  miner.setMineStart(msParts[0], msParts[1], msParts[2])
  miner.setMineEnd(meParts[0], me[1], me[2])
  miner.setDropOffChestLocation(dcParts[0], dcParts[1], dcParts[2])
  miner.setEquipmentChestLocation(tcParts[0], tcParts[1], tcParts[2])

  res.send(
    {
    id: req.params.id,
    message: 'bot configured'
    }
  )
})

app.get('/bot/:id/start',(req, res) => {
  miner.startMining()
  res.send(
    {
    id: req.params.id,
    message: 'started mining'
    }
  )
})

app.get('/bot/:id/stop',(req, res) => {
  miner.stopMining()
  res.send(
    {
    id: req.params.id,
    message: 'started mining'
    }
  )
})

app.get('/bot/:id/inventory',(req, res) => {
  const inv = miner.getInventory()

  res.send(
    {
    id: req.params.id,
    message: inv
    }
  )
})


// should we autostart the bot?
if(nodeFlags.isset('start')) {
  console.log('Starting bot', rootSettings)
  miner.createBot(rootSettings)
}

console.log('Starting HTTP server on:', bindAddress, bindPort)
server.listen(bindPort, bindAddress)