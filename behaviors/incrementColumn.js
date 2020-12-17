"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviorIncrementColumn = void 0;
/**
 * This behavior will attempt to interact with the target block. If the target
 * block could not be interacted with for any reason, this behavior fails silently.
 */
class BehaviorIncrementColumn {
    /**
     * Creates a new mine block behavior.
     *
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
    constructor(bot, targets) {
        this.stateName = 'incrementColumn';
        this.active = false;
        this.bot = bot;
        this.targets = targets;
    }
    
    onStateEntered() {
      this.active = true
      this.targets.currentCol += 1
      this.targets.colDone = false
      this.active = false
    }

    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorIncrementColumn;