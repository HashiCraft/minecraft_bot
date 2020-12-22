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
        this.stateName = 'eatFood';
        this.active = false;
        this.bot = bot;
        this.targets = targets;
        this.cancelled = false
    }
    
    onStateEntered() {
      this.active = true
      this.cancelled = false
      
      const food = this.bot.getFood()

      if(!food) {
        this.bot.chat("I'm hungry but there is no food :(")
        console.log("Can't eat, no food")
      
        this.active = false
        return
      }

      this.eatMelon(food)

      const self = this
      this.timeout = setTimeout(() => {
        console.log('Timeout twisting my melon man')
        self.active = false
      }, 30000)
    }
    
    onStateExited() {
      this.cancelled = true
    }

    eatMelon(food) {
      const self = this
      this.bot.equip(food, 'hand', (error) => {
        if (error) {
          console.log('error equiping food', error)
          self.done()
          return
        }

        self.bot.consume((error) => {
          if (error) {
            console.log('error eating my food', error)
          }

          console.log('munch munch, nice ' + food.name)
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