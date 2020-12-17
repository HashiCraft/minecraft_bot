"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviorEatMelon = void 0;
/**
 * This behavior will attempt to interact with the target block. If the target
 * block could not be interacted with for any reason, this behavior fails silently.
 */
class BehaviorEatMelon {
    /**
     * Creates a new mine block behavior.
     *
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
    constructor(bot, targets) {
        this.stateName = 'eatMelon';
        this.active = false;
        this.bot = bot;
        this.targets = targets;
        this.cancelled = false
    }
    
    onStateEntered() {
      this.active = true
      this.cancelled = false
      
      const melon = this.bot.inventory.findInventoryItem(this.bot.mcData.itemsByName["melon_slice"].id, null);

      if(!melon) {
        this.bot.chat("I'm hungy but there is no melon :(")
        console.log("Can't eat, no melon")
      
        this.active = false
        return
      }

      const self = this
      self.eatMelon(melon)

      this.timeout = setTimeout(() => {
        console.log('Timeout twisting my melon man')
        self.active = false
      }, 30000)
    }
    
    onStateExited() {
      this.cancelled = true
      this.active = false
    }

    eatMelon(melon) {
      const self = this
      this.bot.equip(melon, 'hand', (error) => {
        if (error) {
          self.done()
          return
        }

        self.bot.consume((error) => {
          if (error) {
            console.log('error eating my melons', error)
          }

          console.log('munch munch, nice melon')
          self.done()
          return
        })

      })
    }

    done() {
      this.active = false
      clearTimeout(this.timeout)
    }

    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorEatMelon;