/**
 * This behavior will attempt to break the target block. If the target block
 * could not be mined for any reason, this behavior fails silently.
 */
class BehaviorMineBlock  {
  constructor (bot, targets) {
    this.bot = bot
    this.targets = targets
    this.active = false
  }

  onStateEntered () {
    this.active = true

    if (!this.targets.mineBlocks || this.targets.mineBlocks.length === 0) {
      this.active = false
      return
    }

    // mine all the columns
    this.breakBlock()
  }

  onStateExited() {
    this.bot.stopDigging()
    if(this.timer) {
      clearTimeout(this.timer)
    } 
  }

  breakBlock() {
    const pos = this.targets.mineBlocks.pop()
    if(!pos) {
      console.log('no blocks left to break','broken so far',this.targets.blocksBroken)
      this.active = false
      return
    }

    const block = this.bot.blockAt(pos)

    if (block == null || !this.bot.canDigBlock(block) || block.name == 'air') {
      console.log(`[MineBlock] Cannot mine target block '${block?.displayName ?? 'undefined'}'!. Skipping.`, 'at pos', pos)

      // try the next block in the list
      this.breakBlock()
      return
    }

    console.log(`[MineBlock] Breaking block '${block.displayName}' at ${pos.toString()}`)
    
    const tool = this.getBestTool(block)
    if (!tool) {
      // no tool to equip
      this.digBlock(block)
      return
    }

    // equip the tool then dig
    this.bot.equip(tool, 'hand').then(() => {
      this.digBlock(block)
    }).catch(err => {
      this.active = false
      console.log(err)
    })
  }

  digBlock(block) {
    // increase the number of blocks broken
    this.targets.blocksBroken ++

    this.bot.dig(block).then(() => {
      // mine the next block
      this.breakBlock()
    }).catch(err => {
      this.active = false
      console.log(err)
    })
  }

  getBestTool (block)  {
    const items = this.bot.inventory.items()
    for (const i in block.harvestTools) {
      const id = parseInt(i, 10)
      for (const item of items) {
        if (item.type === id) {
          // Ready select
          if (this.bot.heldItem != null && this.bot.heldItem.type === item.type) {
            return undefined
          }

          return item
        }
      }
    }

    return undefined
  }

  isFinished() {
    return !this.active
  }
}

module.exports = BehaviorMineBlock
