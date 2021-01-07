const Vec3 = require('vec3').Vec3

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

   this.maxCols = 3 // maximum number of blocks to mine in one column
   this.maxRows = 3 // maximum number of blocks to mine in one row
   this.blocksToMineBeforeDrop = 128 // max number of blocks to mine before dropping inventory
  
   // dropInventory is set to true when the bot has mined a set number of blocks
   this.targets.dropInventory = false
   // allDone is set when there is nothing left to mine
   this.targets.allDone = false
 }

  reset() {
    // dropInventory is set to true when the bot has mined a set number of blocks
    this.targets.dropInventory = false
    this.targets.allDone = false
  }

  onStateEntered() { 
    // if no last position set to mine start 
    if(!this.targets.lastPos)
      this.targets.lastPos = new Vec3(this.targets.mineStart.x,this.targets.mineStart.y,this.targets.mineStart.z)

    // figure out which direction a column runs
    // this is the bigger distance between the xMax and zMax
    // ignore direction for this calculation
    var d = this.calculateDistances(this.targets.lastPos)

    
    // define the blocks which will be mined in this operation
    // we first mine the highest blocks moving across the column
    // then we move down
    // 
    // since the bot is popping these of an array we need to add them
    // in reverse order
    this.targets.mineBlocks = []
    for(var y = 0; y < 3; y++) {
      for(var c = d.colCount-1; c > -1; c--) {
        this.targets.mineBlocks.push(
          new Vec3(
            this.targets.lastPos.x + (c * d.zIcr), 
            this.targets.lastPos.y + y, 
            this.targets.lastPos.z + (c * d.xIcr))
        )
      }
    }

    console.log('Setting blocks to mine', this.targets.mineBlocks)

    // We should stand in front of the the first block to mine
    this.targets.position = new Vec3(
      this.targets.lastPos.x - (1* d.xIcr),
      this.targets.lastPos.y,
      this.targets.lastPos.z - (1* d.zIcr),
    )

    // The next position is going to be one step forward
    this.targets.lastPos.x += (1 * d.xIcr)
    this.targets.lastPos.z += (1 * d.zIcr)

    // recalculate the distances
    const nd = this.calculateDistances(this.targets.lastPos)

    // if the next position puts us beyond the row we need to 
    // increment the column and reset
    if(nd.xDistCurAbs <= -1 || nd.zDistCurAbs <= -1) {
      console.log('end of the row')

      // if we are moving on the xAxis we need to reset the column
      if(nd.row === 'x') {
        this.targets.lastPos.x = this.targets.mineStart.x
        this.targets.lastPos.z = this.targets.lastPos.z + (d.colCount * d.zDirection)
      }
      
      if(nd.row === 'z') {
        this.targets.lastPos.z = this.targets.mineStart.z
        this.targets.lastPos.x = this.targets.lastPos.x + (d.colCount * d.xDirection)
      }
    }
    
    // recalculate the distances a seond time to see if we need to change rows
    const ld = this.calculateDistances(this.targets.lastPos)
    if(ld.xDistCurAbs <= -1 || ld.zDistCurAbs <= -1) {
      console.log('end of the block')

      // check if we can move to a new z index
      var newY = ld.yDistCurAbs - 3 
      newY = (newY > 0) ? newY : 3 + newY

      this.targets.lastPos.y -= newY
      this.targets.lastPos.z = this.targets.mineStart.z
      this.targets.lastPos.x = this.targets.mineStart.x

      // 6 = 6-3 = 3
      // 2 = 2-3 = -1, 3 + -1 = 2

      if(newY <=0)
        this.targets.allDone = true
    }

    console.log("Set new target", this.targets.position)
  }

  // calculate the dimensions for the mining area and the 
  // disnace between the current position and the end of the 
  // mining area
  calculateDistances(pos) {
    const d = {}

    d.xDistMax = this.targets.mineStart.x - this.targets.mineEnd.x
    d.yDistMax = this.targets.mineStart.y - this.targets.mineEnd.y
    d.zDistMax = this.targets.mineStart.z - this.targets.mineEnd.z
    
    d.xDistCur = pos.x - this.targets.mineEnd.x
    d.yDistCur = pos.y - this.targets.mineEnd.y
    d.zDistCur = pos.z - this.targets.mineEnd.z

    // get the max as a positive number
    d.xDistMaxAbs = (d.xDistMax < 0) ? d.xDistMax*-1 : d.xDistMax
    d.yDistMaxAbs = (d.yDistMax < 0) ? d.yDistMax*-1 : d.yDistMax
    d.zDistMaxAbs = (d.zDistMax < 0) ? d.zDistMax*-1 : d.zDistMax

    d.yDistCurAbs = d.yDistCur
   
    // work out if the row is the z or the x axis
    d.row = 'z'
    if (d.xDistMaxAbs > d.zDistMaxAbs)  {
      d.row = 'x'
    }
    
    // calcluate the max rows we can mine
    d.rowCount = (d.yDistCurAbs <= this.maxRows) ? d.yDistCurAbs : this.maxRows
    d.xDirection = (d.xDistMax > 0) ? -1 : 1
    d.yDirection = (d.yDistMax > 0) ? -1 : 1
    d.zDirection = (d.zDistMax > 0) ? -1 : 1

    // set the defaults for the columns to mine
    d.colCount = 3
    d.yIcr = 3
    d.zIcr = 0
    d.xIcr = 0

    // calculate the number of columns we can mine from this row
    // this is the default columns unless the remaining columns to mine is 
    // less than the default
    if (d.row === 'x')  {
      // calculate the max columns we can mine
      d.colCount = (d.xDistCurAbs <= this.maxCols) ? d.xDistCurAbs : this.maxCols
      // set the direction to mine
      d.xIcr = (d.xDistMax > 0) ? -1 : 1
    }
    
    if (d.row === 'z')  {
      // calculate the max columns we can mine
      d.colCount = (d.zDistCurAbs <= this.maxCols) ? d.zDistCurAbs : this.maxCols
      // set the direction to mine
      d.zIcr = (d.zDistMax > 0) ? -1 : 1
    }
   
    d.xDistCurAbs = (d.xDistMax > 0) ? d.xDistCur : d.xDistCur * -1
    d.zDistCurAbs = (d.zDistMax > 0) ? d.zDistCur : d.zDistCur * -1
    
    console.log("last:", this.targets.lastPos)
    console.log("mineStart:", this.targets.mineStart)
    console.log("mineEnd:", this.targets.mineEnd)

    console.log(
      "xDistMax:", d.xDistMax, 
      "yDistMax:", d.yDistMax, 
      "zDistMax:", d.zDistMax, 
      "xDistCur:", d.xDistCur, 
      "yDistCur:", d.yDistCur, 
      "zDistCur:", d.zDistCur)

    console.log(
      "xDistMaxAbs:", d.xDistMaxAbs, 
      "yDistMaxAbs:", d.yDistMaxAbs, 
      "zDistMaxAbs:", d.zDistMaxAbs, 
      "xDistCurAbs:", d.xDistCurAbs, 
      "yDistCurAbs:", d.yDistCurAbs, 
      "zDistCurAbs:", d.zDistCurAbs)

    console.log(
      "row:", d.row,
      "rowCount:", d.rowCount,
      "colCount:", d.colCount)
    
    console.log(
      "xDirection:", d.xDirection,
      "yDirection:", d.yDirection,
      "zDirection:", d.zDirection)
    
    console.log(
      "xIcr:", d.xIcr,
      "yIcr:", d.yIcr,
      "zIcr:", d.zIcr)

    return d
  }
}

module.exports = BehaviorSetMiningTarget;
