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

        this.collectItems = this.collectItems.bind(this)
        this.goalReached = this.goalReached.bind(this)
    }
    
    onStateEntered() {
      this.active = true

      this.bot.on('path_update', this.pathUpdate)
      this.bot.on('goal_reached', this.goalReached)
      
      this.collectItems()
    }

    pathUpdate(r) {
      if (r.status === 'noPath') { 
        //console.log('[MoveTo] No path to target!') 
        this.cancel()
      }
    }

    goalReached() {
      console.log('reached')
      this.bot.pathfinder.setGoal(null)
      this.collectItems()
    }

    collectItems() {
      const self = this
      const e = this.bot.nearestEntity((entity) => {
        if (entity.objectType !== 'Item') 
          return  false

        if(entity.position.distanceTo(self.bot.entity.position) > 16)
          return false

        return true
      })

      console.log(e)
      if(!e) {
        this.cancel()
        return
      }

      // we have an item go fetch it
      //console.log('fetching item', e)

      const goal = new GoalBlock(e.position.x, e.position.y, e.position.z) 

      this.bot.pathfinder.setMovements(this.movements)
      this.bot.pathfinder.setGoal(goal)
    }

    onStateExit() {
      this.cancel()
    }

    cancel() {
      this.bot.removeListener('path_update', this.pathUpdate)
      this.bot.removeListener('goal_reached', this.goalReached)

      this.bot.pathfinder.setGoal(null)
      
      this.active = false
    }

    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorCollectItems;