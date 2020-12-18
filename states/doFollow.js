const {
    StateTransition,
    BehaviorIdle,
    NestedStateMachine, 
} = require('mineflayer-statemachine');
  
const BehaviorGetEquipmentFromChest = require('../behaviors/getEquipmentFromChest');

// sub state to fetch any required tools
function createGetToolsState(bot, targets) {
  const myTargets = {
    entity: targets.followEntity
  }

  const idle = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const follow = new BehaviorFollow(bot, myTargets)

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
  
    new StateTransition({
        parent: follow,
        child: idleEnd,
        shouldTransition: () => follow.isFinished(),
        onTransition: () => console.log("getToolsState.idle_end"),
    }),
  ]

  return new NestedStateMachine(transitions, idle, idleEnd)
}

module.exports = createGetToolsState