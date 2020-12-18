const {
    StateTransition,
    BehaviorIdle,
    NestedStateMachine, 
} = require('mineflayer-statemachine');
  
const BehaviorFollow = require('../behaviors/follow.js');
const BehaviorEatMelon = require('../behaviors/eatMelon');

// sub state to fetch any required tools
function createFollowState(bot, targets) {
  const myTargets = {
    entity: targets.followEntity
  }

  const idle = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const follow = new BehaviorFollow(bot, myTargets)
  const eatMelon = new BehaviorEatMelon(bot, targets)

  const transitions = [
    new StateTransition({
        parent: idle,
        child: follow,
        name: "get a pickaxe",
        shouldTransition: () => true,
        onTransition: () => {
          console.log("followState.follow_target"),
          myTargets.entity = targets.followEntity
        }
    }),

    // eat
    new StateTransition({
        parent: follow,
        child: eatMelon,
        name: "eat some tasty melon",
        shouldTransition: () => bot.isHungry() && bot.hasFood(),
        onTransition: () => console.log("followState.eat_melon"),
    }),
    
    new StateTransition({
        parent: eatMelon,
        child: idle,
        shouldTransition: () => eatMelon.isFinished(),
        onTransition: () => console.log("followState.idle"),
    }),
  
    new StateTransition({
        parent: follow,
        child: idleEnd,
        shouldTransition: () => follow.isFinished(),
        onTransition: () => console.log("followState.idle_end"),
    }),
  ]

  return new NestedStateMachine(transitions, idle, idleEnd)
}

module.exports = createFollowState