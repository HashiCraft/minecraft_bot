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
const BehaviorFight = require('./behaviors/fightMobs.js');
const BehaviorEatMelon = require('./behaviors/eatMelon');

const {
    BotStateMachine,
    BehaviorIdle,
    StateTransition,
    NestedStateMachine,
    BehaviorMoveTo,
} = require('mineflayer-statemachine');

const common = require('./common')

require('events').EventEmitter.defaultMaxListeners = 50;

class Miner {
  constructor() {}

   async createBot(settings, callback) {
    this.settings = settings
    this.bot = mineflayer.createBot(settings)

    this.bot.loadPlugin(pathfinder)
    this.bot.loadPlugin(pvp)

    this.prevState = common.STATE_STOPPED
    this.state = common.STATE_STOPPED
    this.targets = {
      colDone: false,
      allDone: false,
      dropOffChestLocation: null,
      equipmentChestLocation: null,
      mineStart: null,
      mineEnd: null,
      lastPos: new Vec3(1,1,1),
      followEntity: null,
      blocksBroken: 0,
    };

    // checks if the bot has the mandatory food
    this.bot.hasTools = () => {
      return this.bot.getPickAxe() && this.bot.getTorch() && this.bot.getFood()
    }
   
    // does the bot have the weapons needed to fight?
    this.bot.hasWeapons = () => {
      return this.bot.getSword() && this.bot.getShield()
    }
    
    this.bot.hasFood = () => {
      return this.bot.getFood()
    }
    
    this.bot.getShield = () => {
      // shield can be equipped so check hands first
      const slot = this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')];
      if (slot && slot.name.includes('shield'))
        return slot
      
      return this.bot.findInventoryItem('shield');
    }
    
    this.bot.getSword = () => {
      return this.bot.findInventoryItem('sword');
    }
    
    this.bot.getShovel = () => {
      return this.bot.findInventoryItem('shovel');
    }

    this.bot.getFood = () => {
      return this.bot.findInventoryItem(common.foodTypes);
    }

    this.bot.getPickAxe = () => {
      return this.bot.findInventoryItem('pickaxe');
    }
    
    this.bot.getTorch = () => {
      return this.bot.findInventoryItem('torch');
    }
    
    this.bot.inDanger = () => {
      // Only look for mobs within 16 blocks
      const filter = e => e.type === 'mob' && e.position.distanceTo(this.bot.entity.position) < 16 &&
        common.hostileTypes.includes(e.name)

      const mob = this.bot.nearestEntity(filter)
      if (mob && mob.position) {
        // can we see the mob try to look at its block
        const block = this.bot.blockAt(mob.position)
        if(block && this.bot.canSeeBlock(block)) {
          console.log('Oh a', mob.name)
          return true
        }
      }

      return false
    }
    
    this.bot.isHungry = () => {
      return (this.bot.food < 18)
    }

    // finds an item in the inventory by name or part of name
    this.bot.findInventoryItem = (name) => {
      var returnItem = null
      var names = name
       if(!Array.isArray(name)){
         names = [name]
       }

      const items = this.bot.inventory.items()
      items.forEach((item) => {
        names.forEach((n) => {
          if(item.name.includes(n)) {
            returnItem = item
          }
        })
      })

      return returnItem
    }

    this.bot.equippedItem = () => {
      const slot = this.bot.inventory.slots[this.bot.getEquipmentDestSlot('hand')]
      if(slot)
        return slot.name
    }

    this.bot.on('kicked', (reason, loggedIn) => {
      console.log('Bot kicked', reason ,loggedIn)
      this.killBot()
    })

    this.bot.on('login', () => {
      console.log("Logged in")
    });

    this.bot.on('physicTick', () => {
      if(this.state === common.STATE_FIGHTING || 
        this.state === common.STATE_EAT) {
          return
      }

      // if the bot is in danger stop what you are doing and fight
      if(this.bot.inDanger()) {
        console.log('In danger fighting')

        this.setNewState(common.STATE_FIGHTING)
      }
      
      if(this.bot.isHungry() && this.bot.hasFood()) {
        console.log('Hungry time for a snack', this.state)

        this.setNewState(common.STATE_EAT)
      }
    })

    this.bot.on('error', err => console.log('Error:', err))

    this.bot.once('spawn', () => {
      console.log('Bot joined server')

      this.bot.mcData = require('minecraft-data')(this.bot.version)
      this.defaultMove = new Movements(this.bot, this.bot.mcData)

      // ensure only certain blocks are broken
      common.blockIgnoreList.forEach((block) => {
        this.defaultMove.blocksCantBreak.add(this.bot.mcData.blocksByName[block].id)
      })

      this.setupEvents()
      this.setupRootState()

      if(settings.viewer_port) {
        //mineflayerViewer(self.bot, { port: settings.viewer_port, firstPerson: true })
      }

      this.bot.chat("Oh, what do you clowns need now?")

      if(callback)
        callback()
    })
    
    this.bot.on('death', () => {
    })
  }

  killBot(f) {
    this.clearKillTimer()

    this.prevState = this.state
    this.state = common.STATE_QUIT
    if(this.bot) {
      this.bot.once('end', () => {
        this.prevState = this.state
        this.state = common.STATE_STOPPED
        this.bot = null
       
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
    bot.on('whisper', (username, message) => {
      
      const messageParts = message.split(' ')
      
      if (message === 'mine start') {
        if (!this.startMining()) {
          bot.chat('Before I can start mining you need to tell me the area, where I can get my tools and where I should drop the diamonds')
          return
        }

        bot.chat('Mine, mine, mine, you never ask me to play, just mine')
      }
      
      if (message === 'inventory') {
        bot.chat(this.getInventory())
      }

      if(message === 'status'){
        bot.chat('Checking up on me? I might be ' + this.state + ' but then again I might be slacking off playing minecraft')
      }
      
      if (message === 'position') {
        bot.chat('Where am I? You are not my boss. Well if you must know, ' + this.bot.entity.position)
      }
      
      if (message === 'drop') {
        this.dropItems()
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
        this.goto(sa[0], sa[1], sa[2])
      }
      
      if (message === 'follow') {
        const target = bot.players[username].entity
        this.targets.followEntity = target

        bot.chat('Whatever you say, following you ' + username)
        
        this.setNewState(common.STATE_FOLLOW)
      }
      
      if (message === 'defend') {
        const target = bot.players[username].entity
        this.targets.followEntity = target
        bot.chat('Your meat shield now am I ' + username + '?')
        
        this.setNewState(common.STATE_DEFEND)
      }
      
      if (message === 'stop') {
        this.stop()
        console.log("stop")
        bot.chat('What? I can quit? Finally I can watch that episode of Stampy Big Nose')
      }

      if (messageParts.length === 4 && messageParts[1] === "area") {
        // get the start area
        const sa = messageParts[2].split(',')
        const ea = messageParts[3].split(',')

        if(sa.length !== 3 || ea.length !==3) {
          bot.chat('Which area would you like to mine? "mine area <x,y,z> <x,y,z>')
          return
        }

        this.setMineStart(sa[0], sa[1], sa[2])
        this.setMineEnd(ea[0], ea[1], ea[2])
        
        bot.chat("I have set the mining area to " + messageParts[2] + " " + messageParts[3])
        console.log(this.targets)
      }
      
      if (messageParts.length === 3 && messageParts[1] === "tools") {
        const tools = messageParts[2].split(',')

        if(tools.length !== 3) {
          bot.chat('What is the location of the tools chest? "mine tools <x,y,z>')
          return
        }

        this.setEquipmentChestLocation(tools[0], tools[1], tools[2])
        bot.chat("I have set the tools chest location to " + messageParts[2])
      }
      
      if (messageParts.length === 3 && messageParts[1] === "drop") {
        const drop = messageParts[2].split(',')

        if(drop.length !== 3) {
          bot.chat('What is the location of the drop off chest? "mine drop <x,y,z>')
          return
        }

        this.setDropOffChestLocation(drop[0], drop[1], drop[2])
        bot.chat("I have set the drop off chest location to " + messageParts[2])
      }
    })

    bot.on('kicked', (reason, loggedIn) => {
      this.setNewState(common.STATE_STOPPED)
    })
    
    this.bot.on('death', () => {
      this.clearKillTimer()
      console.log('Bot has met an unfortunate end, old:', this.prevState, "current: ", this.state)
      bot.chat('Ow, you can not believe how much that hurt')

      this.setNewState(common.STATE_DEAD)
    })

    bot.on('spawn', () => {
      console.log('Bot back again, old state:', this.prevState, 'current:', this.state)

      if(this.state === common.STATE_DEAD) {
        bot.chat('Oh, so I die in the line of duty and you expect me to get right back to work? Wow, the compassion')
        this.state = this.prevState
        this.prevState = common.STATE_DEAD

        if(this.state === common.STATE_STOPPED)
          this.setKillTimer()
      }
    })
  }

  setMineStart(x,y,z) {
    this.targets.mineStart = new Vec3(parseInt(x), parseInt(y), parseInt(z))
    this.targets.lastPos = null
    this.targets.allDone = false
    this.targets.colDone = false
    this.targets.lastTorchDrop = null
    this.targets.blocksBroken = 0
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
    this.setNewState(common.STATE_GOTO)
  }

  startMining() {
    if (!this.targets.mineStart ||
        !this.targets.mineEnd || 
        !this.targets.dropOffChestLocation ||
        !this.targets.equipmentChestLocation) {
          return false
    }

    this.setNewState(common.STATE_MINING)
    return true
  }
  
  stop() {
    this.setNewState(common.STATE_STOPPED)
    this.setKillTimer()
  }

  dropItems() {
    this.setNewState(common.STATE_DROP)
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

  // set a timer to remove the bot after 
  // 5 minutes inactivity
  setKillTimer()  {
    console.log('Set kill timer')
    this.clearKillTimer()

    //  set a timeout for 5 mins
    this.timeout  = setInterval(() => {
      console.log('Kill bot due to inactivity')
      this.bot.chat('Seems like you don\'t need me around here, I\'m off before you change your mind!')
      this.killBot()
    },300000)
  }

  clearKillTimer()  {
    if(this.timeout) {
      console.log('clear kill timer')
      clearTimeout(this.timeout)
    }
  }


  setupRootState() {
    const bot = this.bot
    const miningRoot = createRootState(this.bot, this.defaultMove, this.targets)
    const idle = new BehaviorIdle();
    const idleEnd = new BehaviorIdle();
    const follow = createFollowState(this.bot, this.defaultMove, this.targets)
    const defend = createDefendState(this.bot, this.targets)
    const drop = createDropState(this.bot, this.targets)
    const goto = new BehaviorMoveTo(this.bot, this.targets)
    const fight = new BehaviorFight(this.bot, this.targets)
    const eat = new BehaviorEatMelon(this.bot, this.targets)

    //  start the idle timer
    this.setKillTimer()

    const transitions = [
      new StateTransition({
          parent: idle,
          child: fight,
          name: "Start fighting",
          shouldTransition: () => this.state === common.STATE_FIGHTING,
          onTransition: () => {
            this.clearKillTimer()
            console.log("root.start_fighting")
          }
      }),

      new StateTransition({
          parent: fight,
          child: idle,
          name: "Stop fighting",
          shouldTransition: () => fight.isFinished() || this.state !== common.STATE_FIGHTING,
          onTransition: () => {
            console.log("root.stop_fighting")
            this.setPreviousState(common.STATE_FIGHTING)
          },
      }),
      
      new StateTransition({
          parent: idle,
          child: eat,
          name: "Start eating",
          shouldTransition: () => this.state === common.STATE_EAT,
          onTransition: () => {
            this.clearKillTimer()
            console.log("root.start_eating")
          }
      }),

      new StateTransition({
          parent: eat,
          child: idle,
          name: "Stop eating",
          shouldTransition: () => eat.isFinished() || this.state !== common.STATE_EAT,
          onTransition: () => {
            console.log("root.stop_eating")
            this.setPreviousState(common.STATE_EAT)
          },
      }),

      // needs tools
      new StateTransition({
          parent: idle,
          child: miningRoot,
          name: "Start mining",
          shouldTransition: () => this.state === common.STATE_MINING,
          onTransition: () => {
            this.clearKillTimer()
            console.log("root.start_mining")
          }
      }),

      new StateTransition({
          parent: miningRoot,
          child: idle,
          name: "Stop Mining",
          shouldTransition: () => miningRoot.isFinished() || this.state !== common.STATE_MINING,
          onTransition: () => {
            console.log("root.stop_mining")
            this.setStoppedState(common.STATE_MINING)
          },
      }),
     
      // follow
      new StateTransition({
          parent: idle,
          child: follow,
          name: "Start following",
          shouldTransition: () => this.state === common.STATE_FOLLOW,
          onTransition: () => {
            console.log("root.start_following")
            this.clearKillTimer()
          }
      }),
      
      new StateTransition({
          parent: follow,
          child: idle,
          name: "Stop following",
          shouldTransition: () => follow.isFinished() || this.state !== common.STATE_FOLLOW,
          onTransition: () => {
            console.log("root.stop_following")
            this.setStoppedState(common.STATE_FOLLOW)
          },
      }),
      // end follow

      // defend
      new StateTransition({
          parent: idle,
          child: defend,
          name: "Start defending",
          shouldTransition: () => this.state === common.STATE_DEFEND,
          onTransition: () => {
            console.log("root.start_defending")
            this.clearKillTimer()
          }
      }),
      
      new StateTransition({
          parent: defend,
          child: idle,
          name: "Stop following",
          shouldTransition: () => defend.isFinished() || this.state !== common.STATE_DEFEND,
          onTransition: () => {
            console.log("root.stop_defending")
            this.setStoppedState(common.STATE_DEFEND)
          },
      }),
      
      new StateTransition({
          parent: idle,
          child: drop,
          name: "Drop items",
          shouldTransition: () => this.state === common.STATE_DROP,
          onTransition: () => {
            console.log("root.drop_items")
            this.clearKillTimer()
          }
      }),
      
      new StateTransition({
          parent: drop,
          child: idle,
          name: "Drop items done",
          shouldTransition: () => drop.isFinished() || this.state !== common.STATE_DROP,
          onTransition: () => {
            console.log("root.idle")
            this.setStoppedState(common.STATE_DROP)
          }
      }),
      
      new StateTransition({
          parent: idle,
          child: goto,
          name: "Goto position",
          shouldTransition: () => this.state === common.STATE_GOTO,
          onTransition: () => {
            goto.setMoveTarget(this.targets.position)
            console.log("root.move_goto")
            this.clearKillTimer()
          },
      }),
      
      new StateTransition({
          parent: goto,
          child: idle,
          name: "Goto done",
          shouldTransition: () => goto.isFinished() || this.state !== common.STATE_GOTO,
          onTransition: () => {
            console.log("root.idle")
            this.setStoppedState(common.STATE_GOTO)
          }
      }),
      
      new StateTransition({
          parent: idle,
          child: idleEnd,
          name: "Bot quit",
          shouldTransition: () => this.state === common.STATE_QUIT,
          onTransition: () => {
            console.log("root.quitting")
            this.bot.quit('Gracefully shutting down')
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
      this.state = common.STATE_STOPPED 
      this.setKillTimer()
    }
  }
  
  setPreviousState(myState) {
    if(this.state == myState) {
      // do not set the previous state if the 
      this.state = this.prevState
      this.prevState = myState 
      this.setKillTimer()
    }
  }

  setNewState(myState) {
    console.log('set new state to:', myState, 'old:', this.prevState, 'current:', this.state)
    const oldState = this.state
   
    // set the new state
    this.state = myState
 
    // if we are not changing state do nothing
    if(oldState === myState)
      return
 
    // death, fighting and eating are temporary states and should not override the old previous state
    if(oldState === common.STATE_FIGHTING || oldState === common.STATE_EAT || oldState === common.STATE_DEAD)
      return

    this.prevState = oldState
  }
}

module.exports = Miner;
