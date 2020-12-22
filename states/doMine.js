const {
    StateTransition,
    BehaviorIdle,
    BehaviorEquipItem,
    NestedStateMachine,
} = require('mineflayer-statemachine');

const BehaviorMineNearbyItems = require('../behaviors/findNearbyItems');
const BehaviorSetMiningTarget = require('../behaviors/setMiningTarget');
const BehaviorDropTorch = require('../behaviors/dropTorch');
const BehaviorEatMelon = require('../behaviors/eatMelon');
const BehaviorFightMobs = require('../behaviors/fightMobs');
const BehaviorMoveTo = require('../behaviors/moveTo');
  
// mine items is the sub state machine which handles the mining process
// this state ensures that the bot will fight off any mobs
// and also make sure it eats and has the right tools
function createDoMineState(bot, movements, targets) {
  const idle = new BehaviorIdle();
  const idleEquipped = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const moveMineState = new BehaviorMoveTo(bot, movements, targets)
  const mineNearbyItems = new BehaviorMineNearbyItems(bot, targets)
  const setMiningTarget = new BehaviorSetMiningTarget(bot, targets)
  const dropTorch = new BehaviorDropTorch(bot, targets)
  const equipPickAxe = new BehaviorEquipItem(bot, targets)
  const eatMelon = new BehaviorEatMelon(bot, targets)
  const fightMobs = new BehaviorFightMobs(bot, targets)
 
  //const self = this

  const transitions = [
    // check our pick axe is still ok, if not fetch a new one
    new StateTransition({
        parent: idle,
        child: idleEnd,
        shouldTransition: () => !bot.hasTools(),
        onTransition: () => console.log("mineItems.no_tools"),
    }),
    
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