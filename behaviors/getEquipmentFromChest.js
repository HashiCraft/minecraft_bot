"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviorGetEquipmentFromChest = void 0;
/**
 * This behavior will attempt to interact with the target block. If the target
 * block could not be interacted with for any reason, this behavior fails silently.
 */

const common = require('../common')

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

        this.mcData = this.bot.mcData
        this.targets.itemsMissing = false
    }
    
    onStateEntered() {
      this.active = true
      this.cancelled = false
      this.targets.itemsMissing = false

      // find a chest
      const chestToOpen = this.bot.findBlock({
        matching: ['chest', 'ender_chest', 'trapped_chest'].map(
          name => this.mcData.blocksByName[name].id), maxDistance: 4
      })

      if(!chestToOpen) {
        this.bot.chat('Sorry but there is no chest here.' + this.bot.entity.position)
        console.log('Unable to open chest, chest does not exist at location', this.bot.entity.position)
        return
      }

      const chest = this.bot.openChest(chestToOpen)
      const self = this
      this.bot.lookAt(chestToOpen.position, true, () => {
        var itemList = [...common.equipmentList]

        //console.log("opening chest", chest, chestToOpen)
        chest.on('open', function() {
          //console.log("open chest")
          self.fetchItem(chest, itemList)
        })
      })
    }

    onStateExited() {
      console.log("get equipment cancelled")
      this.cancelled = true
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
      if (!inventoryItem || !inventoryItem.name.includes(item.name)) {
        inventoryItem = this.bot.findInventoryItem(item.name)
      }

      if (inventoryItem) {
        // we have the item so don't get another
        this.fetchItem(chest, items)
        return
      }
      
      const item_id = this.getItemId(item.name, chest)

      if (!item_id && item.required && (!this.bot.hasFood() && item.type === 'food')) {
        this.bot.chat("How I am supposed to get a " + item.name + " when there is not one in the chest?")
        console.log("No " + item.name + " in chest")

        this.active = false
        this.targets.itemsMissing = true

        chest.close()
        return
      } else {
        const self = this
        
        var itemsToFetch = chest.count(item_id, null) //12
        itemsToFetch = (itemsToFetch < item.count) ? itemsToFetch : item.count
      
        console.log('Fetching ' + item.name + ' from chest')
        chest.withdraw(item_id, null, itemsToFetch,function () {
          self.fetchItem(chest, items)
        })
      }
    }

    // gets the first itemid which matches name
    getItemId(name, chest) {
      const items = chest.items()
      var id

      items.forEach((i) => {
        if(i.name.includes(name)) {
          id = i.type
        }
      })

      return id
    }
    
    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorGetEquipmentFromChest;