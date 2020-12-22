// ms -454,8,49
// ms -400,8,88
// ec -444,5,47
// dc -463,6,40

const Vec3 = require('vec3').Vec3

const Movements = require('mineflayer-pathfinder').Movements
const mineflayer = require('mineflayer')
const pathfinder = require('mineflayer-pathfinder').pathfinder
const pvp = require('mineflayer-pvp').plugin

const createRootState = require('./states/root')
const createFollowState = require('./states/doFollow')
const createDefendState = require('./states/defendTarget')
const createDropState = require('./states/dropItems')

const {
    BotStateMachine,
    BehaviorIdle,
    StateTransition,
    NestedStateMachine,
    BehaviorMoveTo,
} = require('mineflayer-statemachine');


const STATE_STOPPED = 'STATE_STOPPED'
const STATE_MINING = 'STATE_MINING'
const STATE_FOLLOW = 'STATE_FOLLOW'
const STATE_GOTO = 'STATE_GOTO'
const STATE_DEFEND = 'STATE_DEFEND'
const STATE_DEAD = 'STATE_DEAD'
const STATE_DROP = 'STATE_DROP'
const STATE_QUIT = 'STATE_QUIT'

const blockIgnoreList = [
  'powered_rail',
  'rail',
  'redstone_torch',
  'hopper',
] 

const foodTypes = [
  'melon_slice',
  'baked_potato',
  'cooked_chicken',
  'cooked_porkchop',
  'cooked_mutton',
  'cooked_beef',
  'bread',
]

class Miner {
  constructor() {}

   async createBot(settings) {
    this.settings = settings
    this.bot = mineflayer.createBot(settings)

    this.bot.loadPlugin(pathfinder)
    this.bot.loadPlugin(pvp)

    this.prevState = STATE_STOPPED
    this.state = STATE_STOPPED
    this.targets = {
      colDone: false,
      allDone: false,
      currentCol: 0,
      dropOffChestLocation: null,
      equipmentChestLocation: null,
      mineStart: null,
      mineEnd: null,
      lastPos: new Vec3(1,1,1),
      followEntity: null,
    };

    const self = this

    // checks if the bot has the mandatory food
    this.bot.hasTools = function() {
      return self.bot.getPickAxe() && self.bot.getTorch() && self.bot.getFood()
    }
   
    // does the bot have the weapons needed to fight?
    this.bot.hasWeapons = function() {
      return self.bot.getSword() && self.bot.getShield()
    }
    
    this.bot.hasFood = function() {
      return self.bot.getFood()
    }
    
    this.bot.getShield = function() {
      // shield can be equipped so check hands first
      const slot = self.bot.inventory.slots[self.bot.getEquipmentDestSlot('off-hand')];
      if (slot && slot.name.includes('shield'))
        return slot
      
      return self.bot.findInventoryItem('shield');
    }
    
    this.bot.getSword = function() {
      return self.bot.findInventoryItem('sword');
    }
    
    this.bot.getShovel = function() {
      return self.bot.findInventoryItem('shovel');
    }

    this.bot.getFood = function() {
      return self.bot.findInventoryItem(foodTypes);
    }

    this.bot.getPickAxe = function() {
      return self.bot.findInventoryItem('pickaxe');
    }
    
    this.bot.getTorch = function() {
      return self.bot.findInventoryItem('torch');
    }
    
    this.bot.inDanger = function() {
      const hostileTypes = [
        'cave_spider', 
        'spider', 
        'creeper', 
        'skeleton', 
        'phantom', 
        'shulker', 
        'slime', 
        'witch',
        'zombie', 
        'zombie_villager'
      ]

      // Only look for mobs within 16 blocks
      const filter = e => e.type === 'mob' && e.position.distanceTo(self.bot.entity.position) < 16 &&
        hostileTypes.includes(e.name)

      const mob = self.bot.nearestEntity(filter)
      if (mob && mob.position) {
        // can we see the mob try to look at its block
        const block = self.bot.blockAt(mob.position)
        if(block && self.bot.canSeeBlock(block)) {
          return true
        }
      }

      return false
    }
    
    this.bot.isHungry = function() {
      return (self.bot.food < 18)
    }

    // finds an item in the inventory by name or part of name
    this.bot.findInventoryItem = function(name) {
      var returnItem = null
      var names = name
       if(!Array.isArray(name)){
         names = [name]
       }

      const items = self.bot.inventory.items()
      items.forEach((item) => {
        names.forEach((n) => {
          if(item.name.includes(n)) {
            returnItem = item
          }
        })
      })

      return returnItem
    }

    this.bot.equippedItem = function() {
      const slot = self.bot.inventory.slots[self.bot.getEquipmentDestSlot('hand')]
      if(slot)
        return slot.name
    }

    this.bot.on('kicked', (reason, loggedIn) => {
      console.log('Bot kicked', reason)
    })

    this.bot.on('login', function() {
      console.log("Logged in")
    });

    this.bot.on('error', err => console.log('Error:', err))

    this.bot.once('spawn', () => {
      console.log('Bot joined server')

      self.bot.mcData = require('minecraft-data')(self.bot.version)
      self.defaultMove = new Movements(self.bot, self.bot.mcData)

      // ensure only certain blocks are broken
      blockIgnoreList.forEach((block) => {
        self.defaultMove.blocksCantBreak.add(self.bot.mcData.blocksByName[block].id)
      })

      self.setupEvents()
      self.setupRootState()

      if(settings.viewer_port) {
        //mineflayerViewer(self.bot, { port: settings.viewer_port, firstPerson: true })
      }

      self.bot.chat("Oh, what do you clowns need now?")
    })
    
    this.bot.on('death', () => {
      console.log('Bot has met an unfortunate end')
    })
  }

  killBot(f) {
    const self = this
    self.prevState = self.state
    self.state = STATE_QUIT
    if(this.bot) {
      this.bot.once('end', () => {
        self.prevState = self.state
        self.state = STATE_STOPPED
        self.bot = null
       
        // if there is a call back 
        if(f)
          f()
      })
    }
  }

  getBot() {
    return this.bot
  }

  setupEvents() {
    const bot = this.bot
    const self = this
    bot.on('whisper', function(username, message) {
      
      const messageParts = message.split(' ')
      
      if (message === 'mine start') {
        if (!self.startMining()) {
          bot.chat('Before I can start mining you need to tell me the area, where I can get my tools and where I should drop the diamonds')
          return
        }

        bot.chat('Mine, mine, mine, you never ask me to play, just mine')
      }
      
      if (message === 'inventory') {
        bot.chat(self.getInventory())
      }

      if(message === 'status'){
        bot.chat('Checking up on me? I might be ' + self.status + ' but then again I might be slacking off playing minecraft')
      }
      
      if (message === 'position') {
        bot.chat('Where am I? You are not my boss. Well if you must know, ' + self.bot.entity.position)
      }
      
      if (message === 'drop') {
        self.dropItems()
        bot.chat('Oh sure, I have nothing better to do that interrupt my work with a trip to the chest')
      }
      
      if (messageParts.length === 2 && messageParts[0] === "goto") {
        // get the start area
        const sa = messageParts[1].split(',')

        if(sa.length !== 3) {
          bot.chat('Where would you like me to go to? /tell bot goto <x,y,z>')
          return
        }
      
        bot.chat('Stay still, follow me, defend me, now go to ' + messageParts[1])
        self.goto(sa[0], sa[1], sa[2])
      }
      
      if (message === 'follow') {
        const target = bot.players[username].entity
        self.targets.followEntity = target
        self.prevState = self.state
        self.state = STATE_FOLLOW
        bot.chat('Whatever you say, following you ' + username)
      }
      
      if (message === 'defend') {
        const target = bot.players[username].entity
        self.targets.followEntity = target
        self.prevState = self.state
        self.state = STATE_DEFEND
        bot.chat('Your meat shield now am i ' + username + '?')
      }
      
      if (message === 'stop') {
        self.stop()
        console.log("stop")
        bot.chat('What? I can quit? Finally I can watch that episode of Spampy Big Nose')
      }

      if (messageParts.length === 4 && messageParts[1] === "area") {
        // get the start area
        const sa = messageParts[2].split(',')
        const ea = messageParts[3].split(',')

        if(sa.length !== 3 || ea.length !==3) {
          bot.chat('Which area would you like to mine? "mine area <x,y,z> <x,y,z>')
          return
        }

        self.setMineStart(sa[0], sa[1], sa[2])
        self.setMineEnd(ea[0], ea[1], ea[2])
        
        bot.chat("I have set the mining area to " + messageParts[2] + " " + messageParts[3])
        console.log(self.targets)
      }
      
      if (messageParts.length === 3 && messageParts[1] === "tools") {
        const tools = messageParts[2].split(',')

        if(tools.length !== 3) {
          bot.chat('What is the location of the tools chest? "mine tools <x,y,z>')
          return
        }

        self.setEquipmentChestLocation(tools[0], tools[1], tools[2])
        bot.chat("I have set the tools chest location to " + messageParts[2])
      }
      
      if (messageParts.length === 3 && messageParts[1] === "drop") {
        const drop = messageParts[2].split(',')

        if(drop.length !== 3) {
          bot.chat('What is the location of the drop off chest? "mine drop <x,y,z>')
          return
        }

        self.setDropOffChestLocation(drop[0], drop[1], drop[2])
        bot.chat("I have set the drop off chest location to " + messageParts[2])
      }
    })

    bot.on('kicked', (reason, loggedIn) => {
      self.prevState = self.state
      self.state = STATE_STOPPED
    })
    
    bot.on('death', () => {
      self.prevState = self.state
      self.state = STATE_DEAD
      bot.chat('Ow, you can not believe how much that hurt')
    })

    bot.on('spawn', () => {
      console.log('Bot back again, old state:', self.prevState)

      if(self.state = STATE_DEAD) {
        bot.chat('Oh, so I die in the line of duty and you expect me to get right back to work? Wow, the compassion')
        self.state = self.prevState
        self.prevState = STATE_DEAD
      }
    })

  }

  setMineStart(x,y,z) {
    this.targets.mineStart = new Vec3(parseInt(x), parseInt(y), parseInt(z))
    this.targets.lastPos = null
    this.targets.allDone = false
    this.targets.colDone = false
    this.targets.currentCol = 0
    this.targets.lastTorchDrop = null
  }
  
  setMineEnd(x,y,z) {
    this.targets.mineEnd = new Vec3(parseInt(x), parseInt(y), parseInt(z))
    this.targets.allDone = false
    this.targets.colDone = false
    this.targets.currentCol = 0
    this.targets.lastTorchDrop = null
  }
  
  setEquipmentChestLocation(x,y,z) {
    this.targets.equipmentChestLocation = new Vec3(parseInt(x), parseInt(y), parseInt(z))
  }
  
  setDropOffChestLocation(x,y,z) {
    this.targets.dropOffChestLocation = new Vec3(parseInt(x), parseInt(y), parseInt(z))
  }

  goto(x,y,z) {
    this.targets.position = new Vec3(parseInt(x), parseInt(y), parseInt(z))
    this.prevState = this.state
    this.state = STATE_GOTO
  }

  startMining() {
    if (!this.targets.mineStart ||
        !this.targets.mineEnd || 
        !this.targets.dropOffChestLocation ||
        !this.targets.equipmentChestLocation) {
          return false
    }

    this.prevState = this.state
    this.state = STATE_MINING
    return true
  }
  
  stop() {
    this.prevState = this.state
    this.state = STATE_STOPPED
  }

  dropItems() {
    this.prevState = this.state
    this.state = STATE_DROP
  }

  getInventory() {
    const slots = this.bot.inventory.slots
    var message = "I have: "
    slots.forEach((item) => {
      if (item) {
        message += item.count + ' ' + item.name + ', '
      }
    })

    return message
  }

  status(){
    return this.state
  }

  setupRootState() {
    const bot = this.bot
    const miningRoot = createRootState(this.bot, this.defaultMove, this.targets)
    const idle = new BehaviorIdle();
    const idleEnd = new BehaviorIdle();
    const follow = createFollowState(this.bot, this.targets)
    const defend = createDefendState(this.bot, this.targets)
    const drop = createDropState(this.bot, this.targets)
    const goto = new BehaviorMoveTo(this.bot, this.targets)
    
    const self = this
    const transitions = [
      // needs tools
      new StateTransition({
          parent: idle,
          child: miningRoot,
          name: "Start mining",
          shouldTransition: () => self.state === STATE_MINING,
          onTransition: () => console.log("root.start_mining"),
      }),

      new StateTransition({
          parent: miningRoot,
          child: idle,
          name: "Stop Mining",
          shouldTransition: () => miningRoot.isFinished() || self.state !== STATE_MINING,
          onTransition: () => {
            console.log("root.stop_mining")
            self.setStoppedState(STATE_MINING)
          },
      }),
     
      // follow
      new StateTransition({
          parent: idle,
          child: follow,
          name: "Start following",
          shouldTransition: () => self.state === STATE_FOLLOW,
          onTransition: () => console.log("root.start_following"),
      }),
      
      new StateTransition({
          parent: follow,
          child: idle,
          name: "Stop following",
          shouldTransition: () => follow.isFinished() || self.state !== STATE_FOLLOW,
          onTransition: () => {
            console.log("root.stop_following")
            self.setStoppedState(STATE_FOLLOW)
          },
      }),
      // end follow

      // defend
      new StateTransition({
          parent: idle,
          child: defend,
          name: "Start defending",
          shouldTransition: () => self.state === STATE_DEFEND,
          onTransition: () => console.log("root.start_defending"),
      }),
      
      new StateTransition({
          parent: defend,
          child: idle,
          name: "Stop following",
          shouldTransition: () => defend.isFinished() || self.state !== STATE_DEFEND,
          onTransition: () => {
            console.log("root.stop_defending")
            self.setStoppedState(STATE_DEFEND)
          },
      }),
      
      new StateTransition({
          parent: idle,
          child: drop,
          name: "Drop items",
          shouldTransition: () => self.state === STATE_DROP,
          onTransition: () => console.log("root.drop_items"),
      }),
      
      new StateTransition({
          parent: drop,
          child: idle,
          name: "Drop items done",
          shouldTransition: () => drop.isFinished() || self.state !== STATE_DROP,
          onTransition: () => {
            console.log("root.idle")
            self.setStoppedState(STATE_DROP)
          }
      }),
      
      new StateTransition({
          parent: idle,
          child: goto,
          name: "Goto position",
          shouldTransition: () => self.state === STATE_GOTO,
          onTransition: () => {
            goto.setMoveTarget(self.targets.position)
            console.log("root.move_goto")
          },
      }),
      
      new StateTransition({
          parent: goto,
          child: idle,
          name: "Goto done",
          shouldTransition: () => goto.isFinished() || self.state !== STATE_GOTO,
          onTransition: () => {
            console.log("root.idle")
            self.setStoppedState(STATE_GOTO)
          }
      }),
      
      new StateTransition({
          parent: idle,
          child: idleEnd,
          name: "Bot quit",
          shouldTransition: () => self.state === STATE_QUIT,
          onTransition: () => {
            console.log("root.quitting")
            self.bot.quit('Gracefully shutting down')
          }
      }),
    ]

    const rootState =  new NestedStateMachine(transitions, idle, idleEnd);
    rootState.name = "rootState";
  
    new BotStateMachine(bot, rootState)
  }

  setStoppedState(myState) {
    if(this.state == myState) {
      this.prevState = this.state
      this.state = STATE_STOPPED 
    }
  }

}

module.exports = Miner;