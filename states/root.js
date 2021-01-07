const {
    StateTransition,
    BehaviorIdle,
    NestedStateMachine, 
} = require('mineflayer-statemachine');

const BehaviorMoveTo = require('../behaviors/moveTo');
const createGetToolsState = require('./getTools');
const createDoMineState = require('./doMine');
const createDropState = require('./dropItems')
  
function createRootState(bot, movements, targets) {
  const goodsDropTargets = {
    position: targets.dropOffChestLocation,
    tools: false
  }
  
  const toolsDropTargets = {
    position: targets.equipmentChestLocation,
    tools: true
  }

  const idle = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const getToolsState = createGetToolsState(bot, targets)
  const doMineState = createDoMineState(bot, movements, targets)
  const move = new BehaviorMoveTo(bot, movements, targets)
  const dropGoodsState = createDropState(bot, goodsDropTargets)
  const dropToolsState = createDropState(bot, toolsDropTargets)

  
  const transitions = [
    // needs tools
    new StateTransition({
        parent: idle,
        child: getToolsState,
        name: "get tools",
        shouldTransition: () => !bot.hasTools(),
        onTransition: () => console.log("mine.get_tools"),
    }),

    // not possible to get tools quit
    new StateTransition({
        parent: getToolsState,
        child: idleEnd,
        name: "end mining",
        shouldTransition: () => getToolsState.isFinished() && !bot.hasTools(),
        onTransition: () => {
          console.log("mine.no_tools_end")
          targets.noTools = true
        }
    }),
  
    // got tools back to the start
    new StateTransition({
        parent: getToolsState,
        child: idle,
        name: "got tools",
        shouldTransition: () => getToolsState.isFinished() && bot.hasTools(),
        onTransition: () => console.log("mine.got_tools"),
    }),
    // end needs tools

    // start mining
    new StateTransition({
        parent: idle,
        child: doMineState,
        name: "start mining",
        shouldTransition: () => bot.hasTools(),
        onTransition: () => console.log("mine.start_mining"),
    }),
 
    // mining done drop items
    new StateTransition({
      parent: doMineState,
      child: dropGoodsState,
      name: "drop items", 
      shouldTransition: () => doMineState.isFinished(),
      onTransition: () => {
        console.log("mine.drop_items")
        goodsDropTargets.position = targets.dropOffChestLocation
      }
    }),
    
    new StateTransition({
        parent: dropGoodsState,
        child: dropToolsState,
        name: "nothing left to mine dropping tools",
        shouldTransition: () => dropGoodsState.isFinished() && targets.allDone,
        onTransition: () => {
          console.log("mine.drop_items")
          toolsDropTargets.position = targets.equipmentChestLocation
        }
    }),
   
    // items dropped calculate the next position
    new StateTransition({
        parent: dropGoodsState,
        child: idle,
        name: "calculate next position",
        shouldTransition: () =>  dropGoodsState.isFinished(),
        onTransition: () => console.log("mine.return_mining"),
    }),
    
    new StateTransition({
        parent: dropToolsState,
        child: idleEnd,
        name: "nothing left to mine done",
        shouldTransition: () => dropToolsState.isFinished(),
        onTransition: () => {
          bot.chat('I am done mining, going for a coffee, don\'t bother me')
          console.log("mine.all_done")
        },
    }),
   
  ]

  return new NestedStateMachine(transitions, idle, idleEnd);
  
}

module.exports = createRootState
