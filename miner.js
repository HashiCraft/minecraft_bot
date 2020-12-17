const Vec3 = require('vec3').Vec3

const Movements = require('mineflayer-pathfinder').Movements

const createRootState = require('./states/root')
const createDropState = require('./states/dropItems')

const {
    BotStateMachine,
    BehaviorIdle,
    StateTransition,
    NestedStateMachine,
} = require('mineflayer-statemachine');

class Miner {
  constructor(bot) {

    this.bot = bot

    var mcData = require('minecraft-data')(this.bot.version)
    this.bot.mcData = mcData
    
    this.defaultMove = new Movements(this.bot, this.bot.mcData)

    this.bot.hasTools = function() {
      return (bot.getPickAxe() && bot.getTorch() && bot.getMelon() && bot.getShield() && bot.getSword()) && bot.getShovel()
    }
    
    this.bot.getShield = function() {
      // shield can be equipped so check hands first
      const slot = bot.inventory.slots[bot.getEquipmentDestSlot('off-hand')];
      if (slot && slot.name.includes('shield'))
        return slot
      
      return bot.inventory.findInventoryItem(bot.mcData.itemsByName["shield"].id, null);
    }
    
    this.bot.getSword = function() {
      return bot.inventory.findInventoryItem(bot.mcData.itemsByName["iron_sword"].id, null);
    }
    
    this.bot.getShovel = function() {
      return bot.inventory.findInventoryItem(bot.mcData.itemsByName["iron_shovel"].id, null);
    }

    this.bot.getMelon = function() {
      return bot.inventory.findInventoryItem(bot.mcData.itemsByName["melon_slice"].id, null);
    }

    this.bot.getPickAxe = function() {
      return bot.inventory.findInventoryItem(bot.mcData.itemsByName["iron_pickaxe"].id, null);
    }
    
    this.bot.getTorch = function() {
      return bot.inventory.findInventoryItem(bot.mcData.itemsByName["torch"].id, null);
    }
    
    this.bot.inDanger = function() {
      // Only look for mobs within 16 blocks
      const filter = e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16 &&
      e.mobType !== 'Armor Stand' // Mojang classifies armor stands as mobs for some reason?

      const mob = bot.nearestEntity(filter)
      if (mob && mob.position) {
        // can we see the mob try to look at its block
        const block = bot.blockAt(mob.position)
        if(block && bot.canSeeBlock(block)) {
          return true
        }
      }

      return false
    }
    
    this.bot.isHungry = function() {
      return (bot.food < 18)
    }
  }

  startBot(options) {
    const targets = {
      colDone: false,
      allDone: false,
      currentCol: 0,
      dropOffChestLocation: options.dropOffChestLocation,
      equipmentChestLocation: options.equipmentChestLocation,
      mineStart: options.mineStart,
      mineEnd: options.mineEnd
    };

    const bot = this.bot
    const miningRoot = createRootState(this.bot, targets)
    const idle = new BehaviorIdle();
    const idleEnd = new BehaviorIdle();
    
    var shouldMine = false
    var isDead = false

    bot.on('whisper', function(username, message) {
      if (message === 'mine') {
        console.log("mine")
        bot.chat('Mine, mine, mine, you never ask me to play, just mine')
        shouldMine = true
      }
      
      if (message === 'inventory') {
        const slots = bot.inventory.slots
        var message = "I have: "
        slots.forEach((item) => {
          if (item) {
            message += item.count + ' ' + item.name + ', '
          }
        })

        bot.chat(message)
      }
      
      if (message === 'stop') {
        console.log("mine")
        bot.chat('What? I can quit? Finally I can watch that episode of Spampy Big Nose')
        shouldMine = false
      }
    })

    bot.on('kicked', (reason, loggedIn) => shouldMine = false)
    
    bot.on('death', () => {
      shouldMine = false
      isDead = true
      bot.chat('Ow, you can not believe how much that hurt')
    })

    bot.on('spawn', () => {
      if(isDead = true) {
        bot.chat('Oh, so I die in the line of duty and your first task is go mining? Wow, the compassion')
        shouldMine = true
      }

      isDead = false
    })

    const transitions = [
      // needs tools
      new StateTransition({
          parent: idle,
          child: miningRoot,
          name: "Start mining",
          shouldTransition: () => shouldMine,
          onTransition: () => console.log("root.start_mining"),
      }),

      new StateTransition({
          parent: miningRoot,
          child: idle,
          name: "Stop Mining",
          shouldTransition: () => miningRoot.isFinished() || isDead || !shouldMine,
          onTransition: () => console.log("root.stop_mining"),
      }),
    ]

    const rootState =  new NestedStateMachine(transitions, idle, idleEnd);
    rootState.name = "rootState";
  
    new BotStateMachine(bot, rootState)

    bot.chat("Oh, what do you clowns need now?")
  }

  startMining() {
  }

  dropItems() {
    const root = createDropState()
    root.name = "dropState";
    new BotStateMachine(this.bot, root)
  }
}

module.exports = Miner;