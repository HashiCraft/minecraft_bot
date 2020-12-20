const {
    StateTransition,
    BehaviorIdle,
    BehaviorMoveTo,
    NestedStateMachine, 
} = require('mineflayer-statemachine');
  
const BehaviorGetEquipmentFromChest = require('../behaviors/getEquipmentFromChest');

// sub state to fetch any required tools
function createGetToolsState(bot, targets) {
  const myTargets = {
    position: targets.equipmentChestLocation
  }

  const idle = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const moveChest = new BehaviorMoveTo(bot, myTargets)
  const getTools = new BehaviorGetEquipmentFromChest(bot, targets)

  const transitions = [
    new StateTransition({
        parent: idle,
        child: moveChest,
        name: "get a pickaxe",
        shouldTransition: () => true,
        onTransition: () => {
          console.log("getToolsState.move_to_chest"),
          myTargets.position = targets.equipmentChestLocation
        }
    }),
  
    new StateTransition({
        parent: moveChest,
        child: getTools,
        shouldTransition: () => moveChest.distanceToTarget() <= 3,
        onTransition: () => console.log("getToolsState.get_tools_from_chest"),
    }),
    
    new StateTransition({
        parent: getTools,
        child: idleEnd,
        shouldTransition: () => targets.itemsMissing,
        onTransition: () => {
          console.log("getToolsState.itemsMissing")

          bot.chat('I can`t find the tools I need, could you sort that out please before a zombie gets me.')
        },
    }),
    
    new StateTransition({
        parent: getTools,
        child: idleEnd,
        shouldTransition: () => bot.hasTools(),
        onTransition: () => console.log("getToolsState.done"),
    }),
  ]

  return new NestedStateMachine(transitions, idle, idleEnd)
}

module.exports = createGetToolsState