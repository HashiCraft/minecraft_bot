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

    if (this.targets.position == null) {
      this.active = false
      return
    }

    this.breakBlock()
  }

  onStateExited() {
    this.bot.stopDigging()
    if(this.timer) {
      clearTimeout(this.timer)
    } 
  }

  breakBlock() {
    const block = this.bot.blockAt(this.targets.position)
    const self = this

    if (block == null || !this.bot.canDigBlock(block) || block.name == 'air') {
      console.log(`[MineBlock] Cannot mine target block '${block?.displayName ?? 'undefined'}'!. Skipping.`)

      this.active = false
      return
    }

    console.log(`[MineBlock] Breaking block '${block.displayName}' at ${this.targets.position.toString()}`)

    const tool = this.getBestTool(block)
    console.log('equipping tool', tool)

    if (tool != null) {
      self.bot.equip(tool, 'hand').then(() => {
        self.bot.dig(block).then(() => {
          //  gravel might have dropped in place of the block
          self.timer = setTimeout(() => {
            self.breakBlock()
          }, 300)
        }).catch(err => {
          self.active = false
          console.log(err)
        })
      }).catch(err => {
        self.active = false
        console.log(err)
      })
    } else {
      self.bot.dig(block).then(() => {
        //  gravel might have dropped in place of the block
        self.timer = setTimeout(() => {
          self.breakBlock()
        }, 300)
      }).catch(err => {
        self.active = false
        console.log(err)
      })
    }
  }

  getBestTool (block  )  {
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