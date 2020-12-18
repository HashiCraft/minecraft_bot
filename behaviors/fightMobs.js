"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviorFightMobs = void 0;
/**
 * This behavior will attempt to interact with the target block. If the target
 * block could not be interacted with for any reason, this behavior fails silently.
 */
class BehaviorFightMobs {
    /**
     * Creates a new mine block behavior.
     *
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
    constructor(bot, targets) {
        this.stateName = 'fightMobs';
        this.active = false;
        this.cancelled = false
        this.bot = bot;
        this.targets = targets;
        
        const self = this
        this.bot.on('stoppedAttacking', () => {
          console.log('Stopped attacking')
          if (this.cancelled)
            return

          // check for more mobs
          const mob = this.getMobToFight()
          if (mob) {
            this.equipWeaponsAndFight(mob)
          } else {
            this.active = false
          }
        })
        
        this.bot.on('startedAttacking', () => {
          console.log('Started attacking')
        })

        this.bot.on('death', () => {
          self.onStateExited()
        })
      
        this.mcData = this.bot.mcData
    }
    
    onStateEntered() {
      this.cancelled = false

      const mob = this.getMobToFight()
      if (mob) {
        this.active = true
        
        this.bot.chat('You want to fight, then fight me')
        this.bot.chat('It\'s cloberin time, (pop down to the mine and clean up my mess please)')
        console.log('Fighting mob', mob.name)
      
        const sword = this.bot.getSword()
        const shield = this.bot.getShield()

        if (!sword) {
          this.bot.chat('You want me to fight a ' + mob.name +'  with no weapons, I can see this going well')
          console.log('Weapon inventory sword: ', sword, 'shield:', shield)

          this.bot.pvp.attack(mob)
          return
        }

        // Start attacking
        this.equipWeaponsAndFight(mob)
      }
    }
    
    onStateExited() {
      console.log('exit fight behavior') 
      this.bot.pvp.stop()
      this.cancelled = true
      this.active = false
    }

    getMobToFight() {
      if(this.cancelled)
        return

      // Only look for mobs within 16 blocks
      const filter = e => e.type === 'mob' && e.position.distanceTo(this.bot.entity.position) < 16 &&
      e.mobType !== 'Armor Stand' // Mojang classifies armor stands as mobs for some reason?

      const mob = this.bot.nearestEntity(filter)
      if (mob) {
        // can we see the mob try to look at its block
        const block = this.bot.blockAt(mob.position)
        if(!this.bot.canSeeBlock(block)) {
          console.log('Can\'t see mob ignoring', mob.name)
          return
        }

        return mob
      }
    }

    equipWeaponsAndFight(mob) {
      const sword = this.bot.getSword()
      const shield = this.bot.getShield()
      const self = this

      this.bot.unequip('hand', () => {
        self.bot.equip(sword, 'hand', (error) => {
          if(error) {
            console.log('Unable to equip sword')
          }
      
          self.bot.unequip('off-hand', () => {
            self.bot.equip(shield, 'off-hand', (error) => {
              if(error) {
                console.log('Unable to equip shield')
              }

              this.bot.pvp.attack(mob)
            })
          })
        })
      })
    }

    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorFightMobs;