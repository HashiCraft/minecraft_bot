const {
    StateTransition,
    BehaviorIdle,
    NestedStateMachine, 
} = require('mineflayer-statemachine');

const BehaviorIncrementColumn = require('../behaviors/incrementColumn');
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
  const incrementColumn = new BehaviorIncrementColumn(bot, targets);
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

    // got tools and no last position move to start
    new StateTransition({
        parent: idle,
        child: move,
        name: "move to start",
        shouldTransition: () => bot.hasTools() && !targets.lastPos,
        onTransition: () => {
          move.setMoveTarget(targets.mineStart)
          console.log("mine.move_start")
        },
    }),
    
    // got tools and last position move to last
    new StateTransition({
        parent: idle,
        child: move,
        name: "move to last pos",
        shouldTransition: () => bot.hasTools() && targets.lastPos,
        onTransition: () => {
          move.setMoveTarget(targets.lastPos)
          console.log("mine.move_last")
        },
    }),

    // start mining
    new StateTransition({
        parent: move,
        child: doMineState,
        name: "start mining",
        shouldTransition: () => move.isFinished(),
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
   
    // items dropped calculate the next position
    new StateTransition({
        parent: dropGoodsState,
        child: incrementColumn,
        name: "calculate next position",
        shouldTransition: () =>  dropGoodsState.isFinished() && targets.colDone,
        onTransition: () => console.log("mine.increment_column"),
    }),
    
    // are we done should we drop off th items
    new StateTransition({
        parent: dropGoodsState,
        child: idle,
        name: "nothing left to mine done",
        shouldTransition: () =>  dropGoodsState.isFinished(),
        onTransition: () => console.log("mine.not_increment_column"),
    }),
    
    // mine the next column
    new StateTransition({
        parent: incrementColumn,
        child: idle,
        name: "continue mining",
        shouldTransition: () =>  !targets.allDone,
        onTransition: () => console.log("mine.column_incremented_start_mining"),
    }),

    new StateTransition({
        parent: incrementColumn,
        child: dropToolsState,
        name: "nothing left to mine dropping tools",
        shouldTransition: () => targets.allDone,
        onTransition: () => {
          console.log("mine.drop_items")
          toolsDropTargets.position = targets.equipmentChestLocation
        }
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