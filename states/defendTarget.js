const {
    StateTransition,
    BehaviorIdle,
    NestedStateMachine, 
} = require('mineflayer-statemachine');
  
const BehaviorFollow = require('../behaviors/follow.js');
const BehaviorFight = require('../behaviors/fightMobs.js');
const BehaviorEatMelon = require('../behaviors/eatMelon');

// sub state to fetch any required tools
function createDefendState(bot, targets) {
  const myTargets = {
    entity: targets.followEntity
  }

  const idle = new BehaviorIdle();
  const idleEnd = new BehaviorIdle();
  const follow = new BehaviorFollow(bot, myTargets)
  const fightMobs = new BehaviorFight(bot, myTargets)
  const eatMelon = new BehaviorEatMelon(bot, targets)

  const transitions = [
    new StateTransition({
        parent: idle,
        child: follow,
        name: "Follow target",
        shouldTransition: () => true,
        onTransition: () => {
          console.log("defendState.follow"),
          myTargets.entity = targets.followEntity
        }
    }),
   
    // fight
    new StateTransition({
        parent: follow,
        child: fightMobs,
        shouldTransition: () => bot.inDanger(),
        onTransition: () => console.log("defendState.fight"),
    }),
  
    new StateTransition({
        parent: fightMobs,
        child: idle,
        shouldTransition: () => fightMobs.isFinished(),
        onTransition: () => console.log("defendState.fighting_done"),
    }),
   
    // eat
    new StateTransition({
        parent: follow,
        child: eatMelon,
        name: "eat some tasty melon",
        shouldTransition: () => bot.isHungry() && bot.hasFood(),
        onTransition: () => console.log("defendState.eat_melon"),
    }),
    
    new StateTransition({
        parent: eatMelon,
        child: idle,
        shouldTransition: () => eatMelon.isFinished(),
        onTransition: () => console.log("defendState.idle"),
    }),
  ]

  return new NestedStateMachine(transitions, idle, idleEnd)
}

module.exports = createDefendState