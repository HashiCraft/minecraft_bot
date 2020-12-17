"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviorDropInventoryAtChest = void 0;
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
    }
    
    onStateEntered() {
      this.chestClosed = true
      this.active = true
      this.cancelled = false

      const self = this

      // print the player stats
      console.log('bot health', this.bot.health, 'bot food', this.bot.food)

      // find a chest
      const chestToOpen = this.bot.findBlock({
        matching: ['chest', 'ender_chest', 'trapped_chest'].map(
          name => this.mcData.blocksByName[name].id), maxDistance: 4
      })

      if (!chestToOpen) {
        console.log("Unable to find chest")
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
      if (
        item.name === 'iron_pickaxe' || 
        item.name === 'torch' || 
        item.name === 'melon_slice' ||
        item.name === 'iron_sword' || 
        item.name === 'shield' ||
        item.name === 'iron_shovel'
      ) {
        this.depositItem(chest, items)
        return
      }

      const self = this
      console.log("Adding " + item.count + " " + item.displayName + " to the chest")
      chest.deposit(item.type, item.metadata, item.count, function(error) {
        if (error) {
          console.log("Error adding items to chest", error)
          self.depositItem(chest, items)
        }

        self.bot.chat("Added " + item.count + " " + item.displayName + " to the chest")
        console.log("Added " + item.count + " " + item.displayName + " to the chest")

        self.depositItem(chest, items)
      })
    }

    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorDropInventoryAtChest;
