"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviorDropInventoryAtChest = void 0;

const common = require('../common')

/**
 * This behavior will attempt to interact with the target block. If the target
 * block could not be interacted with for any reason, this behavior fails silently.
 */
class BehaviorDropInventoryAtChest {
    /**
     * Creates a new mine block behavior.
     *
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
    constructor(bot, targets) {
        this.stateName = 'dropInventoryAtChest'
        this.active = false
        this.bot = bot
        this.targets = targets
        this.mcData = this.bot.mcData
        this.cancelled = false
        this.tools = this.targets.tools
    }
    
    onStateEntered() {
      this.chestClosed = true
      this.active = true
      this.cancelled = false

      const self = this

      // find a chest
      const chestToOpen = this.bot.findBlock({
        matching: ['chest', 'ender_chest', 'trapped_chest'].map(
          name => this.mcData.blocksByName[name].id), maxDistance: 4
      })

      if (!chestToOpen) {
        console.log("Unable to find chest at location", this.targets.position)
        this.active = false
        return
      }

      // set a timeout incase the chest does not open
      this.timeout = setTimeout(() => {
        console.log("Timeout waiting for dropping items")
        self.active = false
      },10000)

      const chest = this.bot.openChest(chestToOpen)
      const items = this.bot.inventory.items()

      chest.on('open', function() {
        self.chestClosed = false
        self.depositItem(chest, items)
      })

      chest.on('close', function() {
        self.chestClosed = true
      })
    }

    onStateExited() {
      console.log('cancelled')
      this.cancelled = true
      this.active = false
      
      clearTimeout(this.timeout)
    }

    done(chest) {
      clearTimeout(this.timeout)
      this.active = false
      if (!this.chestClosed)
        chest.close()
    }

    // recursively deposit all items until none remain
    depositItem(chest, items) {
      if (this.cancelled) {
        return
      }

      const item = items.pop()
      if (!item) {
        this.done(chest)
        console.log("Done adding items")
        return
      }
     
      // do not deposit our tools
      if (!this.shouldDeposit(item)) {
        this.depositItem(chest, items)
        return
      }

      console.log("Adding " + item.count + " " + item.displayName + " to the chest")
      const self = this
      chest.deposit(item.type, item.metadata, item.count, function(error) {
        if (error) {
          console.log("Error adding items to chest", error)
          self.depositItem(chest, items)
        }

        console.log("Added " + item.count + " " + item.displayName + " to the chest")

        self.depositItem(chest, items)
      })
    }

    shouldDeposit(item) {
        
      var deposit = true

      common.equipmentList.forEach((di) => {
        if(this.tools) {
          // if we are depositing tools
          if(item.name.includes(di.name))
            deposit = true
        } else {
          if(item.name.includes(di.name))
            deposit = false
        }
      })

      return deposit
    }

    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorDropInventoryAtChest;