const {
    StateTransition,
    BehaviorIdle,
    BehaviorMoveTo,
    NestedStateMachine,
} = require('mineflayer-statemachine');
 
const BehaviorDropInventoryAtChest = require('../behaviors/dropInventoryAtChest')

// sub state to drop off any items when finishing mining
function createDropItemsState(bot, targets) {
  const myTargets = {
    position: targets.dropOffChestLocation
  }

  const idle = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const moveChest = new BehaviorMoveTo(bot, myTargets)
  const dropItems = new BehaviorDropInventoryAtChest(bot, targets)
  
  const transitions = [
    new StateTransition({
        parent: idle,
        child: moveChest,
        name: "back to the chest",
        shouldTransition: () => true,
        onTransition: () => {
          myTargets.position = targets.dropOffChestLocation
          console.log("dropState.move_to_chest", myTargets.position)
        }

    }),
    
    new StateTransition({
        parent: moveChest,
        child: dropItems,
        shouldTransition: () => moveChest.distanceToTarget() <= 2,
        onTransition: () => console.log("dropState.dropping_items"),
    }),
    
    new StateTransition({
        parent: dropItems,
        child: idleEnd,
        shouldTransition: () => dropItems.isFinished(),
        onTransition: () => console.log("dropState.done"),
    }),
  ]

  return new NestedStateMachine(transitions, idle, idleEnd);
}

module.exports = createDropItemsState