/**
 * This behavior attempts to find nearby mineable items
 */
class BehaviorMineNearbyItems {
    /**
     * Creates a new mine block behavior.
     *
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
    constructor(bot, targets) {
        this.stateName = 'findNearByItems';
        this.active = false;
        this.cancelled = false
        this.checks = 0
        this.bot = bot;
        this.targets = targets;
        this.mcData = this.bot.mcData

        const self = this
        this.bot.on('diggingCompleted', () => {
          if (self.cancelled)
            return

          if(!self.active)
            return

          self.bot.stopDigging()
        })
        
        this.bot.on('diggingAborted', () => {
          if (self.cancelled)
            return

          if(!self.active)
            return

          self.bot.stopDigging()
        })
    }
    
    onStateEntered() {
      this.active = true
      this.cancelled = false
      this.checks = 0

      this.checkNearby()
    }

    onStateExited() {
      this.cancelled = true
      this.active = false
      this.bot.stopDigging()
    }

    checkNearby() {
      // if there is Lava nearby do not mine
      const lava = this.bot.findBlock({
        matching: ['lava','water'].map(
          name => this.mcData.blocksByName[name].id), maxDistance: 8
      })
      
      if (!lava) {
        this.active = false
        return
      }

      const nearby = this.bot.findBlocks({
        matching: ['iron_ore', 'diamond_ore', 'redstone_ore', 'coal_ore', 'gold_ore', 'coal_ore', 'emerald_ore', 'lapis_ore'].map(
          name => this.mcData.blocksByName[name].id), maxDistance: 32, count: 6
      })

      if (!nearby) {
        this.active = false
        return
      }

      const pickaxe = this.bot.getPickAxe()
      if (!pickaxe) {
        console.log("Can't dig, no pickaxe")
        this.active = false
        return
      }

      this.bot.equip(pickaxe, 'hand', (error) => {
          if(error) {
            console.log('Unable to equip pickaxe', error)
            this.active = false
            return 
          }

        this.mineItem(nearby)
      })
    }

    mineItem(items) {
      if(this.cancelled)
        return

      const item = items.pop()
      if (!item) {
        // test nearby again to make sure we got all the blocks
        if(this.checks < 3) {
          this.checks += 1
          this.checkNearby()
          return
        }

        // no more items to be found
        this.active = false
        return
      }

      // get the block and check that it can be dug
      const block = this.bot.blockAt(item)
      if (block !== null && block !== undefined && block.position != null && this.bot.canDigBlock(block)) {

        const self = this
        if (!self.bot.canSeeBlock(block)) {
          self.mineItem(items)
          return
        }

        console.log("Mining nearby item : ", block.name)
        self.bot.dig(block).then(() => {
          self.mineItem(items) 
        }).catch(err => {
          console.log(err)
        })

      } else {
        //console.log("ignoring block:", block.name, "can dig:", this.bot.canDigBlock(block))
        this.mineItem(items)
      }
    }

    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorMineNearbyItems;
