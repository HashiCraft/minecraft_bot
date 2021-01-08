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
    
      // set a timeout for this operation
      this.timer = setTimeout(() => {
        console.log('eat timeout')
        this.active = false
      }, 30000)

      this.eatFood(food)
    }
    
    onStateExited() {
      this.cancelled = true
    }

    eatFood(food) {
      if(!food) {
        this.done()
        return
      }

      this.bot.equip(food, 'hand', (error) => {
        if (error) {
          console.log('error equiping food', error)
          this.done()
          return
        }

        this.bot.consume((error) => {
          if (error) {
            console.log('error eating my food', error)
            this.done()
            return
          }

          console.log('munch munch, nice ' + food.name)

          // wait 5 seconds and check if we still need to eat
          setTimeout(() => {
            if(this.bot.food !== 20) {
              this.eatFood(this.bot.getFood())
            } else {
              this.done()
            }
          }, 5000)

        })

      })
    }

    done() {
      this.active = false
      clearTimeout(this.timer)
    }

    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorEatMelon;
