const Miner = require('./miner')
const auth = require('./auth')

var tty = require("tty");
const nodeFlags = require('node-flag')

const express = require('express')
const http = require('http')
var bodyParser = require('body-parser')
const {v4: uuidv4} = require("uuid")

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

const bots = new Map()

// graceful shutdown
process.on('SIGINT', function() {
  server.close(() => {
    console.log('HTTP server closed')
  })

  var t = setTimeout(() => process.exit(), 5000)
  var n = 0
 
  // watch for all bots to be killed and exit
  setInterval(() => {
    if(n === 0){
      clearTimeout(t)
      process.exit()
    }
  },200)

  console.log("Killing the bots");
  bots.forEach((v,id) => {
    console.log('killing bot', id)
    n++

    v.killBot(() => {
      n++
    })
  })

})


app.use(bodyParser.json())
app.use(auth)

app.get('/health', (req, res) => {
  res.send('OK')
})

app.post('/bot', (req, res) => {
  const jb = req.body // get custom settings from the request
  var s = rootSettings // create the settings
  
  
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

  const miner = new Miner()
  
  // add the bot to the collection
  const id = uuidv4()
  bots.set(id, miner)

  console.log('Create new bot id: ', id, 'with settings:', s)
  
  miner.createBot(s, () => {
    console.log('Bot started id:', id)
    res.send(
      {
        id: id,
        message: 'bot started'
      }
    )
  })
})

app.delete('/bot/:id', (req, res) => {
  const id = req.params.id
  if(notExist(id, res))
    return

  bots.get(id).killBot()
  res.send(
    {
    id: id,
    message: 'bot killed'
    }
  )

  bots.delete(id)
})

app.post('/bot/:id/configure',(req, res) => {
  const d = req.body
  const id = req.params.id
  if(notExist(id, res))
    return

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

  bots.get(id).setMineStart(msParts[0], msParts[1], msParts[2])
  bots.get(id).setMineEnd(meParts[0], meParts[1], meParts[2])
  bots.get(id).setDropOffChestLocation(dcParts[0], dcParts[1], dcParts[2])
  bots.get(id).setEquipmentChestLocation(tcParts[0], tcParts[1], tcParts[2])

  res.send(
    {
    id: id,
    message: 'bot configured'
    }
  )
})

app.get('/bot/:id/start',(req, res) => {
  const id = req.params.id
  if(notExist(id, res))
    return
  
  bots.get(id).startMining()
  res.send(
    {
    id: req.params.id,
    message: 'started mining'
    }
  )
})

app.get('/bot/:id/stop',(req, res) => {
  miner.stop()
  res.send(
    {
    id: req.params.id,
    message: 'stopped doing what I was doing'
    }
  )
})

app.get('/bot/:id/status',(req, res) => {
  res.send(
    {
    id: req.params.id,
    status: miner.status()
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

// checks if a bot exists if not writes a 404
function notExist(id, res) {
  if(bots.has(id))
    return false

  res.status(404)
  res.send({message: 'Bot with id ' + id + ' does not exist'})

  console.log('Bot',id,'does not exist')
  return true
}


// should we autostart the bot?
if(nodeFlags.isset('start')) {
  console.log('Starting bot', rootSettings)
  const miner = new Miner()
  // add the bot to the collection
  const id = uuidv4()
  bots.set(id, miner)
  miner.createBot(rootSettings)
}

console.log('Starting HTTP server on:', bindAddress, bindPort)
server.listen(bindPort, bindAddress)
