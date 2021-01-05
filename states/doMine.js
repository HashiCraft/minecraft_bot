const {
    StateTransition,
    BehaviorIdle,
    BehaviorEquipItem,
    NestedStateMachine,
} = require('mineflayer-statemachine');

const BehaviorMineNearbyItems = require('../behaviors/findNearbyItems');
const BehaviorSetMiningTarget = require('../behaviors/setMiningTarget');
const BehaviorDropTorch = require('../behaviors/dropTorch');
const BehaviorMoveTo = require('../behaviors/moveTo');
const BehaviorMineBlock = require('../behaviors/digBlock');
const BehaviorCollectItems = require('../behaviors/collectItems');
  
// mine items is the sub state machine which handles the mining process
// this state ensures that the bot will fight off any mobs
// and also make sure it eats and has the right tools
function createDoMineState(bot, movements, targets) {
  const idle = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const moveMineState = new BehaviorMoveTo(bot, movements, targets)
  const mineNearbyItems = new BehaviorMineNearbyItems(bot, targets)
  const setMiningTarget = new BehaviorSetMiningTarget(bot, targets)
  const dropTorch = new BehaviorDropTorch(bot, targets)
  const mineBlock1 = new BehaviorMineBlock(bot, targets)
  const mineBlock2 = new BehaviorMineBlock(bot, targets)
  const mineBlock3 = new BehaviorMineBlock(bot, targets)
  const collectItems = new BehaviorCollectItems(bot, movements, targets)
 
  const self = this

  const transitions = [
    // check our pick axe is still ok, if not fetch a new one
    new StateTransition({
        parent: idle,
        child: idleEnd,
        shouldTransition: () => !bot.hasTools(),
        onTransition: () => console.log("mineItems.no_tools"),
    }),

    // mine - default
    new StateTransition({
        parent: idle,
        child: setMiningTarget,
        name: "select the next mining target",
        shouldTransition: () => true,
        onTransition: () => console.log("mineItems.set_target"),
    }),

    new StateTransition({
        parent: setMiningTarget,
        child: idleEnd,
        name: "nothing to do",
        shouldTransition: () => targets.colDone || targets.allDone,
        onTransition: () => console.log("mineItems.no_target"),
    }),
   
    new StateTransition({
        parent: setMiningTarget,
        child: moveMineState,
        name: "mine nearby if we have a nearby item",
        shouldTransition: () => true,
        onTransition: () => console.log("mineItems.move_to_position"),
    }),
    
    new StateTransition({
        parent: moveMineState,
        child: mineBlock1,
        name: "mine block 1",
        shouldTransition: () => moveMineState.isFinished(),
        onTransition: () => {
          console.log("mineItems.mine_block_1")
          targets.position = targets.mineBlocks[2]
        }
    }),
    
    new StateTransition({
        parent: mineBlock1,
        child: idleEnd,
        name: "no tools",
        shouldTransition: () => mineBlock1.isFinished() && !bot.hasTools(),
        onTransition: () => console.log("mineItems.no_tools"),
    }),
    
    new StateTransition({
        parent: mineBlock1,
        child: mineBlock2,
        name: "mine block 2",
        shouldTransition: () => mineBlock1.isFinished(),
        onTransition: () => {
          console.log("mineItems.mine_block_2")
          targets.position = targets.mineBlocks[1]
        }
    }),
    
    new StateTransition({
        parent: mineBlock2,
        child: idleEnd,
        name: "no tools",
        shouldTransition: () => mineBlock2.isFinished() && !bot.hasTools(),
        onTransition: () => console.log("mineItems.no_tools"),
    }),
    
    new StateTransition({
        parent: mineBlock2,
        child: mineBlock3,
        name: "mine block 3",
        shouldTransition: () => mineBlock2.isFinished(),
        onTransition: () => {
          console.log("mineItems.mine_block_3")
          targets.position = targets.mineBlocks[0]
        }
    }),
    
    new StateTransition({
        parent: mineBlock3,
        child: collectItems,
        name: "collect items",
        shouldTransition: () => mineBlock3.isFinished(),
        onTransition: () => console.log("mineItems.collect_items"),
    }),
    
    new StateTransition({
        parent: collectItems,
        child: idleEnd,
        name: "no tools",
        shouldTransition: () => collectItems.isFinished() && !bot.hasTools(),
        onTransition: () => console.log("mineItems.no_tools"),
    }),
    
    new StateTransition({
        parent: collectItems,
        child: mineNearbyItems,
        name: "mine nearby",
        shouldTransition: () => collectItems.isFinished(),
        onTransition: () => console.log("mineItems.mine_nearby"),
    }),
    
    new StateTransition({
        parent: mineNearbyItems,
        child: dropTorch,
        name: "drop a torch if it is dark enough for mob spawn",
        shouldTransition: () => mineNearbyItems.isFinished(),
        onTransition: () => console.log("mineItems.drop_torch"),
    }),
    
    new StateTransition({
        parent: dropTorch,
        child: idle,
        name: "all done",
        shouldTransition: () => dropTorch.isFinished(),
        onTransition: () => console.log("mineItems.idle"),
    }),
    // end mine
  ]

  return new NestedStateMachine(transitions, idle, idleEnd)
}

module.exports = createDoMineState
