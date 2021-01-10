const Movements = require('mineflayer-pathfinder').Movements
const { GoalFollow } = require('mineflayer-pathfinder').goals
/**
 * This behavior will attempt to interact with the target block. If the target
 * block could not be interacted with for any reason, this behavior fails silently.
 */
class BehaviorFollow {
    /**
     * Creates a new mine block behavior.
     *
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
    constructor(bot, movements, targets) {
        this.stateName = 'follow';
        this.active = false;
        this.cancelled = false;
        this.bot = bot;
        this.targets = targets;

        this.movements = movements

        this.bot.on('death', () => {
          if (this.cancelled)
            return

          if(!this.active)
            return

          this.onStateExited()
        })
    }
    
    onStateEntered() {
      this.active = true
      this.cancelled = false;

      if(!this.targets.entity) {
        console.log("Nothing to follow")

        this.active = false
        return
      }

      this.bot.pathfinder.setMovements(this.movements)
      this.bot.pathfinder.setGoal(new GoalFollow(this.targets.entity, 3), true)
    }

    onStateExited() {
      console.log('cancel following')
      this.bot.pathfinder.setGoal(null)
      this.cancelled = true
    }

    isFollowing() {
      this.active
    }

    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorFollow;
