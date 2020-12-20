const {
    StateTransition,
    BotStateMachine,
    BehaviorIdle,
    NestedStateMachine, 
    BehaviorMoveTo,
} = require('mineflayer-statemachine');

const BehaviorIncrementColumn = require('../behaviors/incrementColumn');
const createGetToolsState = require('./getTools');
const createDoMineState = require('./doMine');
const createDropState = require('./dropItems')
  
function createRootState(bot, targets) {
  const idle = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const incrementColumn = new BehaviorIncrementColumn(bot, targets);
  const getToolsState = createGetToolsState(bot, targets)
  const doMineState = createDoMineState(bot, targets)
  const move = new BehaviorMoveTo(bot, targets)
  const dropState = createDropState(bot, targets)
  
  const transitions = [
    // needs tools
    new StateTransition({
        parent: idle,
        child: getToolsState,
        name: "get tools",
        shouldTransition: () => !bot.hasTools(),
        onTransition: () => console.log("root.get_tools"),
    }),

    // not possible to get tools quit
    new StateTransition({
        parent: getToolsState,
        child: idleEnd,
        name: "end mining",
        shouldTransition: () => getToolsState.isFinished() && !bot.hasTools(),
        onTransition: () => {
          console.log("root.no_tools_end")
          targets.noTools = true
        }
    }),
  
    // got tools back to the start
    new StateTransition({
        parent: getToolsState,
        child: idle,
        name: "got tools",
        shouldTransition: () => getToolsState.isFinished() && bot.hasTools(),
        onTransition: () => console.log("root.got_tools"),
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
          console.log("root.move_start")
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
          console.log("root.move_last")
        },
    }),

    // start mining
    new StateTransition({
        parent: move,
        child: doMineState,
        name: "start mining",
        shouldTransition: () => move.isFinished(),
        onTransition: () => console.log("root.start_mining"),
    }),
 
    // mining done drop items
    new StateTransition({
      parent: doMineState,
      child: dropState,
      name: "drop items", 
      shouldTransition: () => doMineState.isFinished(),
      onTransition: () => console.log("mineItems.drop_items"),
    }),
   
    // items dropped calculate the next position
    new StateTransition({
        parent: dropState,
        child: incrementColumn,
        name: "calculate next position",
        shouldTransition: () =>  dropState.isFinished(),
        onTransition: () => console.log("root.increment_column"),
    }),

    // are we done should we drop off th items
    new StateTransition({
        parent: incrementColumn,
        child: idleEnd,
        name: "nothing left to mine done",
        shouldTransition: () => targets.allDone,
        onTransition: () => {
          bot.chat('I am done mining, going for a coffee, don\'t bother me')
          console.log("mineItems.all_done")
        },
    }),
   
    // mine the next column
    new StateTransition({
        parent: incrementColumn,
        child: idle,
        name: "continue mining",
        shouldTransition: () =>  !targets.allDone,
        onTransition: () => console.log("root.column_incremented_start_mining"),
    }),
  ]

  return new NestedStateMachine(transitions, idle, idleEnd);
  
}

module.exports = createRootState