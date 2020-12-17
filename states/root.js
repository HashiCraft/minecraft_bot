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
  
function createRootState(bot, targets) {
  const idle = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const incrementColumn = new BehaviorIncrementColumn(bot, targets);
  const getToolsState = createGetToolsState(bot, targets)
  const doMineState = createDoMineState(bot, targets)
  const moveStart = new BehaviorMoveTo(bot, targets)
  moveStart.setMoveTarget(targets.mineStart)
  
  const transitions = [
    // needs tools
    new StateTransition({
        parent: idle,
        child: getToolsState,
        name: "get a pickaxe",
        shouldTransition: () => !bot.hasTools(),
        onTransition: () => console.log("doMine.get_tools"),
    }),
    
    new StateTransition({
        parent: getToolsState,
        child: moveStart,
        name: "start mining",
        shouldTransition: () => getToolsState.isFinished(),
        onTransition: () => console.log("doMine.got_tools_move_start"),
    }),
    // end needs tools
   
    // start mining
    new StateTransition({
        parent: idle,
        child: moveStart,
        name: "start mining",
        shouldTransition: () => bot.hasTools(),
        onTransition: () => console.log("doMine.move_start"),
    }),
   
    new StateTransition({
        parent: moveStart,
        child: doMineState,
        name: "start mining",
        shouldTransition: () => moveStart.isFinished(),
        onTransition: () => console.log("doMine.start_mining"),
    }),
   
    // done with the column
    new StateTransition({
        parent: doMineState,
        child: incrementColumn,
        name: "continue mining",
        shouldTransition: () =>  doMineState.isFinished(),
        onTransition: () => console.log("doMine.increment_column"),
    }),
   
    // mine the next column
    new StateTransition({
        parent: incrementColumn,
        child: doMineState,
        name: "continue mining",
        shouldTransition: () =>  !targets.allDone,
        onTransition: () => console.log("doMine.column_incremented_start_mining"),
    }),
  
    // nothing left to mine
    new StateTransition({
        parent: incrementColumn,
        child: idleEnd,
        name: "all complete",
        shouldTransition: () => targets.allDone,
        onTransition: () => {
          console.log("doMine.dropped_items_quitting")

          bot.quit('I am done mining, going for a coffee, don\'t bother me')
        },
    }),
  ]

  return new NestedStateMachine(transitions, idle, idleEnd);
  
}

module.exports = createRootState