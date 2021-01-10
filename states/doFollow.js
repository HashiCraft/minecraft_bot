const {
    StateTransition,
    BehaviorIdle,
    NestedStateMachine, 
} = require('mineflayer-statemachine');
  
const BehaviorFollow = require('../behaviors/follow.js');

// sub state to fetch any required tools
function createFollowState(bot, movements, targets) {
  const myTargets = {
    entity: targets.followEntity
  }

  const idle = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const follow = new BehaviorFollow(bot, movements, myTargets)

  const transitions = [
    new StateTransition({
        parent: idle,
        child: follow,
        name: "get a pickaxe",
        shouldTransition: () => true,
        onTransition: () => {
          console.log("followState.follow_target", targets.followEntity),
          myTargets.entity = targets.followEntity
        }
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
