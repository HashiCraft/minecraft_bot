"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviorCollectItems = void 0;

const { GoalBlock } = require('mineflayer-pathfinder').goals

/**
 * This behavior will attempt to collect items which have been dropped nearby
 */
class BehaviorCollectItems {
    /**
     * Creates a new mine block behavior.
     *
     * @param bot - The bot preforming the mining function.
     * @param movements - The bot movements for pathfinding
     * @param targets - The bot targets objects.
     */
    constructor(bot, movements, targets) {
      this.stateName = 'collectItems'
      this.active = false
      this.bot = bot
      this.targets = targets
      this.movements = movements
      
      this.bot.on('path_update', (r) => {
        if(!this.active)
          return

        //console.log(r)
        if (r.status === 'noPath') { 
          console.log('[MoveTo] No path to target!') 
          this.cancel()
        }
      })

      this.bot.on('goal_reached', () => {
        if(!this.active)
          return

        console.log('reached')
        this.cancel()
        //this.bot.pathfinder.setGoal(null)

        // check for more items
        //this.collectItems()
      })
    }
    
    onStateEntered() {
      this.active = true
      
      this.collectItems()
    }

    goalReached() {
    }

    collectItems() {
      const e = this.bot.nearestEntity((entity) => {
        if (entity.objectType !== 'Item') 
          return  false

        const dt = entity.position.distanceTo(this.bot.entity.position)
        if(dt > 16)
          return false

        return true
      })

      console.log(e)
      if(!e) {
        this.cancel()
        return
      }

      // we have an item go fetch it
      const goal = new GoalBlock(
        e.position.x, 
        e.position.y, 
        e.position.z
      ) 

      this.bot.pathfinder.setMovements(this.movements)
      this.bot.pathfinder.setGoal(goal, false)
      console.log('goal set', goal, this.bot.entity.position)
    }

    onStateExit() {
      this.cancel()
    }

    cancel() {
      this.bot.pathfinder.setGoal(null)
      this.active = false
    }

    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorCollectItems;
