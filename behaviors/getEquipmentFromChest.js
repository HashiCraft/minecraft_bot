"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviorGetEquipmentFromChest = void 0;
/**
 * This behavior will attempt to interact with the target block. If the target
 * block could not be interacted with for any reason, this behavior fails silently.
 */
class BehaviorGetEquipmentFromChest {
    /**
     * Creates a new mine block behavior.
     *
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
    constructor(bot, targets) {
        this.stateName = 'getPickaxeFromChest';
        this.active = false;
        this.cancelled = true;
        this.bot = bot;
        this.targets = targets;
        this.equipmentList = ['iron_pickaxe', 'iron_sword', 'shield', 'melon_slice', 'torch', 'iron_shovel']
        this.mcData = this.bot.mcData
        this.itemsMissing = false
    }
    
    onStateEntered() {
      this.active = true
      this.cancelled = false

      // find a chest
      const chestToOpen = this.bot.findBlock({
        matching: ['chest', 'ender_chest', 'trapped_chest'].map(
          name => this.mcData.blocksByName[name].id), maxDistance: 10
      })

      if(!chestToOpen) {
        this.bot.chat('Sorry but there is no chest here.' + this.bot.entity.position)
        console.log('Unable to open chest, chest does not exist at location', this.bot.entity.position)
        return
      }

      const chest = this.bot.openChest(chestToOpen)
      const self = this
      var itemList = [...this.equipmentList]

      chest.on('open', function() {
        self.fetchItem(chest, itemList)
      })
    }

    onStateExited() {
      this.cancelled = true
      this.active = false
    }

    fetchItem(chest, items) {
      if (this.cancelled)
        return

      // get an item from the list
      const item = items.pop()
      if (!item) {
        // no more items fetch
        this.active = false
        chest.close()
        return
      }

      // check if we have the item
      // can be equipped so check hands first
      var inventoryItem = this.bot.inventory.slots[this.bot.getEquipmentDestSlot('off-hand')];
      if (!inventoryItem || !inventoryItem.name.includes(item)) {
        inventoryItem = this.bot.inventory.findInventoryItem(this.mcData.itemsByName[item].id, null);
      }

      if (inventoryItem) {
        // we have the item so don't get another
        this.fetchItem(chest, items)
        return
      }
      
      console.log('Fetching ' + item + ' from chest')
      const item_count = chest.count(this.mcData.itemsByName[item].id) 
      if (item_count < 1) {
        this.bot.chat("How I am supposed to get a " + item + " when there is not one in the chest?")
        console.log("No " + item + " in chest")
        this.active = false
        this.targets.itemsMissing = true
        chest.close()
        return
      } else {
        const self = this

        var itemsToFetch = 1
        if (item === 'melon_slice' || item === 'torch') {
          itemsToFetch = (item_count > 64) ? 64 : item_count
        }

        chest.withdraw(self.mcData.itemsByName[item].id,null,itemsToFetch,function () {
          self.fetchItem(chest, items)
        })
      }
    }
    
    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorGetEquipmentFromChest;