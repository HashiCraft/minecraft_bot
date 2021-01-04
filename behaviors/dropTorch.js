const Vec3 = require('vec3').Vec3

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviorDropTorch = void 0;
/**
 * This behavior will attempt to interact with the target block. If the target
 * block could not be interacted with for any reason, this behavior fails silently.
 */
class BehaviorDropTorch {
    /**
     * Creates a new mine block behavior.
     *
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
    constructor(bot, targets) {
        this.stateName = 'dropTorch';
        this.active = false;
        this.bot = bot;
        this.targets = targets;
        this.canelled = true
        this.mcData = this.bot.mcData
    }
    
    onStateEntered() {
      this.active = true
      this.cancelled = false
        
      if (!this.targets.lastTorchDrop){
        this.targets.lastTorchDrop = new Vec3(this.bot.entity.position.x, this.bot.entity.position.y, this.bot.entity.position.z)
      }

      // only drop a torch if we are 5 squares from the last torch and
      const xDist = this.bot.entity.position.x - this.targets.lastTorchDrop.x
      const zDist = this.bot.entity.position.z - this.targets.lastTorchDrop.z
      const zDistAbs = (zDist < 0) ? zDist * -1 : zDist
      const xDistAbs = (xDist < 0) ? xDist * -1 : xDist

      if(xDistAbs > 5 || zDistAbs > 5) {
        
        // check for nearby torches
        const torch = this.bot.findBlock({
          matching: ['torch'].map(
            name => this.mcData.blocksByName[name].id), maxDistance: 4
        })
      
        if (torch) {
          console.log("Not Dropping torch, one nearby")
          this.active = false 
          return
        }

        // work out the direction of travel
        var direction = "n"
        if (zDist < 0)
          direction = "n"
        
        if (zDist > 0)
          direction = "s"
        
        if (xDist < 0)
          direction = "w"
        
        if (xDist > 0)
          direction = "e"

        //console.log("Dropping torch")
        this.dropTorch(direction)
        return
      }
      
      this.active = false
    }

    onStateExited() {
      this.cancelled = true
      this.active = false
    }

    dropTorch(direction) {
      var torches = null

      // find a torch in inventory
      const torch = this.bot.inventory.findInventoryItem(this.mcData.itemsByName["torch"].id, null);

      if(!torch) {
        this.bot.chat("Oi, it is dark in here and I have no torches")
        console.log("Can't drop torch, no torches")
        this.active = false
        return
      }

      var destPos = new Vec3(this.bot.entity.position.x, this.bot.entity.position.y, this.bot.entity.position.z)

      if(direction === 'n')
        destPos = destPos.offset(0, -1, -1)
      if(direction === 's')
        destPos = destPos.offset(0, -1, 1)
      if(direction === 'e')
        destPos = destPos.offset(-1, -1, 0)
      if(direction === 'w')
        destPos = destPos.offset(1, -1, 0)

      console.log('Add  torch' + destPos)
      this.targets.lastTorchDrop =  destPos 

      var destination = this.bot.blockAt(destPos)
      if(!destination) {
        this.active = false
        return
      }

      // place the torch behind us
      this.bot.unequip('hand', () => {
        this.bot.equip(torch, 'hand', (error) => {
          if (error) {
            this.active = false
            return
          }

          this.bot.placeBlock(destination, new Vec3(0,1,0), () => {
            console.log("Added a torch", destination.position, direction)
            this.active = false
          })
        })
      })
    }

    isFinished() {
      return !this.active
    }
}

module.exports = BehaviorDropTorch;
