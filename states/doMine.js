const {
    StateTransition,
    BehaviorIdle,
    BehaviorEquipItem,
    BehaviorMoveTo,
    NestedStateMachine,
} = require('mineflayer-statemachine');

const BehaviorMineNearbyItems = require('../behaviors/findNearbyItems');
const BehaviorSetMiningTarget = require('../behaviors/setMiningTarget');
const BehaviorDropTorch = require('../behaviors/dropTorch');
const BehaviorEatMelon = require('../behaviors/eatMelon');
const BehaviorFightMobs = require('../behaviors/fightMobs');
const createGetToolsState = require('./getTools')
const createDropItemsState = require('./dropItems')
  
// mine items is the sub state machine which handles the mining process
// this state ensures that the bot will fight off any mobs
// and also make sure it eats and has the right tools
function createDoMineState(bot, targets) {
  const idle = new BehaviorIdle();
  const idleEquipped = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const moveMineState = new BehaviorMoveTo(bot, targets)
  const mineNearbyItems = new BehaviorMineNearbyItems(bot, targets)
  const setMiningTarget = new BehaviorSetMiningTarget(bot, targets)
  const dropTorch = new BehaviorDropTorch(bot, targets)
  const getPickAxeState = createGetToolsState(bot, targets)
  const equipPickAxe = new BehaviorEquipItem(bot, targets)
  const eatMelon = new BehaviorEatMelon(bot, targets)
  const fightMobs = new BehaviorFightMobs(bot, targets)
  const dropState = createDropItemsState(bot, targets)
 
  //const self = this

  const transitions = [
    // check our pick axe is still ok, if not fetch a new one
    new StateTransition({
        parent: idle,
        child: getPickAxeState,
        shouldTransition: () => !bot.hasTools(),
        onTransition: () => console.log("mineItems.fetch_pickaxe"),
    }),

    new StateTransition({
        parent: getPickAxeState,
        child: idle,
        shouldTransition: () => getPickAxeState.isFinished(),
        onTransition: () => console.log("mineItems.equip_pickaxe"),
    }),
    // end pickaxe
    
    new StateTransition({
        parent: idle,
        child: equipPickAxe,
        onTransition: () => console.log("mineItems.equip_pickaxe"),
        shouldTransition: () => {
          targets.item = bot.getPickAxe()
          return (targets.item)
        },
    }),

    new StateTransition({
        parent: equipPickAxe,
        child: idleEquipped,
        onTransition: () => console.log("mineItems.waiting"),
        shouldTransition: () => bot.equippedItem() && bot.equippedItem().includes("pickaxe")
    }),
    
    // are we done should we drop off th items
    new StateTransition({
        parent: idleEquipped,
        child: dropState,
        name: "done mining", 
        shouldTransition: () => targets.colDone,
        onTransition: () => console.log("mineItems.drop_items"),
    }),

    new StateTransition({
        parent: dropState,
        child: idleEnd,
        name: "nothing left to mine done",
        shouldTransition: () => dropState.isFinished(),
        onTransition: () => console.log("mineItems.column_done"),
    }),
    // end done
    
    // fight mobs
    new StateTransition({
        parent: idleEquipped,
        child: fightMobs,
        shouldTransition: () => bot.inDanger(),
        onTransition: () => console.log("mineItems.fight_mobs"),
    }),
    
    new StateTransition({
        parent: fightMobs,
        child: idle,
        shouldTransition: () => fightMobs.isFinished(),
        onTransition: () => console.log("mineItems.idle"),
    }),
    // end fight
    
    // or eat
    new StateTransition({
        parent: idleEquipped,
        child: eatMelon,
        name: "eat some tasty melon",
        shouldTransition: () => bot.isHungry(),
        onTransition: () => console.log("mineItems.eat_melon"),
    }),
    
    new StateTransition({
        parent: eatMelon,
        child: idle,
        shouldTransition: () => eatMelon.isFinished(),
        onTransition: () => console.log("mineItems.idle"),
    }),
    // end eat


    // mine - default
    new StateTransition({
        parent: idleEquipped,
        child: setMiningTarget,
        name: "select the next mining target",
        shouldTransition: () => true,
        onTransition: () => console.log("mineItems.set_target"),
    }),
   
    new StateTransition({
        parent: setMiningTarget,
        child: moveMineState,
        name: "mine nearby if we have a nearby item",
        shouldTransition: () => bot.hasTools(),
        onTransition: () => console.log("mineItems.move_to_position"),
    }),
    
    new StateTransition({
        parent: moveMineState,
        child: mineNearbyItems,
        name: "mine nearby",
        shouldTransition: () => moveMineState.isFinished(),
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