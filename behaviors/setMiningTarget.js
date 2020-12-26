"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviorSetMiningTarget = void 0;

const Vec3 = require('vec3').Vec3
/**
 * This behavior attempts to find nearby mineable items
 */
class BehaviorSetMiningTarget {
    /**
     * Creates a new mine block behavior.
     *
     * @param bot - The bot preforming the mining function.
     * @param targets - The bot targets objects.
     */
    constructor(bot, targets) {
        this.stateName = 'setMiningTarget';
        this.active = false;
        this.bot = bot;
        this.targets = targets;
        this.targets.colDone = false
        this.targets.allDone = false
    }

    //this.mineStart = new Vec3(-441, 5, 40)
    //this.mineEnd = new Vec3(-500, 4, 40)

    onStateEntered() { 
      // if no last position set to mine start 
      if(!this.targets.lastPos)
        this.targets.lastPos = new Vec3(this.targets.mineStart.x,this.targets.mineStart.y,this.targets.mineStart.z)

      // figure out which direction a column runs
      // this is the bigger distance between the xMax and zMax
      // ignore direction for this calculation
      const xDistMax = this.targets.mineStart.x - this.targets.mineEnd.x // 41 - 25 = 59
      const zDistMax = this.targets.mineStart.z - this.targets.mineEnd.z // 40 - 42 = 2
      
      const xDistCur = this.targets.lastPos.x - this.targets.mineEnd.x // -441 - -500 = 59
      const zDistCur = this.targets.lastPos.z - this.targets.mineEnd.z // 40 - 42 = 2

      // get the max as a positive number
      const xDistMaxAbs = (xDistMax < 0) ? xDistMax*-1 : xDistMax // 59
      const zDistMaxAbs = (zDistMax < 0) ? zDistMax*-1 : zDistMax // 2

      const xDistCurAbs = (xDistCur < 0) ? xDistCur*-1 : xDistCur // 59
      const zDistCurAbs = (zDistCur < 0) ? zDistCur*-1 : zDistCur // 2
   
      //console.log("last:", this.targets.lastPos)
      //console.log("mineStart:", this.targets.mineStart)
      //console.log("mineEnd:", this.targets.mineEnd)
      //console.log("xDistMax:", xDistMax, "zDistMax", zDistMax, "xDistCur", xDistCur, "zDistCur", zDistCur)
      //console.log("xDistMaxAbs:", xDistMaxAbs, "zDistMaxAbs", zDistMaxAbs, "xDistCurAbs", xDistCurAbs, "zDistCurAbs", zDistCurAbs)
      
      if (xDistCurAbs <= 0 && zDistCurAbs <= 0) {
        console.log("Cant move any further, all done")
        
        // we can not move set the position to 0
        this.targets.colDone = true
        this.targets.allDone = true
        this.targets.position = null
        this.targets.lastPos = null
        this.targets.mineBlocks = []
        return
      }

      var incDir = ""
     
      // calculate the new position
      if (xDistMaxAbs > zDistMaxAbs)  {
        incDir = "x"
        const colDirection = (zDistMax > 0) ? (this.targets.currentCol * -1) : this.targets.currentCol

        // x is the Column
        var incr = (xDistMax > 0) ? -1 : 1
        this.targets.lastPos.x += incr
        this.targets.lastPos.z = this.targets.mineStart.z + colDirection

        this.targets.mineBlocks = []
        this.targets.mineBlocks.push(new Vec3(this.targets.lastPos.x + incr, this.targets.lastPos.y, this.targets.lastPos.z))
        this.targets.mineBlocks.push(new Vec3(this.targets.lastPos.x + incr, this.targets.lastPos.y + 1 , this.targets.lastPos.z))

        // check if the column is bigger than max
        if (xDistCurAbs <=0) {
          //console.log("Cant move any further, column done x")
          this.targets.lastPos.x = this.targets.mineStart.x
          this.targets.colDone = true
          return
        }
      } else {
        incDir = "z"
        const colDirection = (xDistMax > 0) ? (this.targets.currentCol * -1) : this.targets.currentCol

        var incr = (zDistMax > 0) ? -1 : 1
        this.targets.lastPos.z += incr
        this.targets.lastPos.x = this.targets.mineStart.x + colDirection
        
        this.targets.mineBlocks = []
        this.targets.mineBlocks.push(new Vec3(this.targets.lastPos.x, this.targets.lastPos.y, this.targets.lastPos.z + incr))
        this.targets.mineBlocks.push(new Vec3(this.targets.lastPos.x, this.targets.lastPos.y + 1 , this.targets.lastPos.z + incr))
        
        // check if the column is bigger than max
        if (zDistCurAbs <=0) {
          //console.log("Cant move any further, column done z")
          this.targets.lastPos.z = this.targets.mineStart.z
          this.targets.colDone = true
          return
        }
      }

      this.targets.position = this.targets.lastPos
      //console.log("Set new target", this.targets.lastPos, "col:", this.targets.currentCol, "incr", incDir, "xMax", xDistMaxAbs, "zMax", zDistMaxAbs)
    }
}

module.exports = BehaviorSetMiningTarget;