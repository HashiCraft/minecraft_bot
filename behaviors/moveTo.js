
const { GoalBlock, GoalNear } = require('mineflayer-pathfinder').goals
/**
 * Causes the bot to move to the target position.
 *
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
class BehaviorMoveTo {
  stateName = 'moveTo'
  active = false

  /**
     * How close the bot should attempt to get to this location before
     * considering the goal reached. A value of 0 will mean the bot must
     * be inside the target position.
     */
  distance = 0

  constructor (bot, movements, targets) {
    this.bot = bot
    this.targets = targets

    this.movements = movements
    this.cancelled = false
    this.active = false

    // @ts-expect-error
    bot.on('path_update', (r) => {
      if (r.status === 'noPath') { console.log('[MoveTo] No path to target!') }
    })

    // @ts-expect-error
    bot.on('goal_reached', () => {
    })

    const self = this
    bot.on('death', () => {
      if (self.cancelled)
        return

      if(!self.active)
        return

      console.log('Bot died, cancel move')
      self.onStateExited()
    })
  }

  onStateEntered () {
    this.cancelled = false
    this.active = true
    this.startMoving()
  }

  onStateExited () {
    this.cancelled = true
    this.stopMoving()
  }

  /**
     * Sets the target block position to move to. If the bot
     * is currently moving, it will stop and move to here instead.
     *
     * If the bot is not currently in this behavior state, the entity
     * will still be assigned as the target position when this state
     * is entered.
     *
     * This method updates the target position.
     *
     * @param position - The position to move to.
     */
  setMoveTarget (position) {
    if (this.targets.position === position) { return }

    this.targets.position = position
    this.restart()
  }

  /**
     * Cancels the current path finding operation.
     */
  stopMoving () {
    this.active = false
    // @ts-expect-error
    const pathfinder = this.bot.pathfinder
    pathfinder.setGoal(null)
  }

  /**
     * Starts a new path finding operation.
     */
  startMoving () {
    const position = this.targets.position
    if (position == null) {
      return
    }

    // @ts-expect-error
    const pathfinder = this.bot.pathfinder

    let goal

    if (this.distance === 0) { 
      goal = new GoalBlock(position.x, position.y, position.z) 
    } else { 
      goal = new GoalNear(position.x, position.y, position.z, this.distance) 
    }

    pathfinder.setMovements(this.movements)
    pathfinder.setGoal(goal)
  }

  /**
     * Stops and restarts this movement behavior. Does nothing if
     * this behavior is not active.
     */
  restart() {
    if (!this.active) { return }

    this.stopMoving()
    this.startMoving()
  }

  /**
     * Checks if the bot has finished moving or not.
     */
  isFinished() {
    // @ts-expect-error
    const pathfinder = this.bot.pathfinder
    return !pathfinder.isMoving()
  }

  /**
     * Gets the distance to the target position.
     *
     * @returns The distance, or 0 if no target position is assigned.
     */
  distanceToTarget () {
    const position = this.targets.position
    if (position == null) return 0

    return this.bot.entity.position.distanceTo(position)
  }
}

module.exports = BehaviorMoveTo;