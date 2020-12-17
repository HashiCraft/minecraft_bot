const mineflayer = require('mineflayer')
const pathfinder = require('mineflayer-pathfinder').pathfinder
const pvp = require('mineflayer-pvp').plugin
const Movements = require('mineflayer-pathfinder').Movements
const mineflayerViewer = require('prismarine-viewer').mineflayer

const Vec3 = require('vec3').Vec3

const { GoalNear, GoalFollow, GoalBlock } = require('mineflayer-pathfinder').goals

const Miner = require('./miner')

const bot = mineflayer.createBot({
  host: process.env.HOST, // optional
  port: process.env.PORT || 25565,       // optional
  username: process.env.USER, // email and password are required only for
  password: process.env.PASSWORD,          // online-mode=true servers
  version: false                 // false corresponds to auto version detection (that's the default), put for example "1.8.8" if you need a specific version
})

bot.loadPlugin(pathfinder)
bot.loadPlugin(pvp)

bot.once('spawn', () => {

  const mcData = require('minecraft-data')(bot.version)
  const defaultMove = new Movements(bot, mcData)
  defaultMove.canDig = false;
  
  mineflayerViewer(bot, { port: 3007, firstPerson: true })

  const minerOptions = {
    dropOffChestLocation: new Vec3(-464, 6, 40),
    equipmentChestLocation: new Vec3(-444, 5, 47),
    mineStart: new Vec3(-476, 8, 48),
    mineEnd: new Vec3(-500, 8, 100)
  }

  const m = new Miner(bot)
  m.startBot(minerOptions)
}

// Log errors and kick reasons:
bot.on('kicked', (reason, loggedIn) => console.log(reason, loggedIn))
bot.on('error', err => console.log(err))