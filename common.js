
const common = {}

common.STATE_STOPPED = 'STATE_STOPPED'
common.STATE_MINING = 'STATE_MINING'
common.STATE_FOLLOW = 'STATE_FOLLOW'
common.STATE_GOTO = 'STATE_GOTO'
common.STATE_DEFEND = 'STATE_DEFEND'
common.STATE_FIGHTING = 'STATE_FIGHTING'
common.STATE_EAT = 'STATE_EAT'
common.STATE_DEAD = 'STATE_DEAD'
common.STATE_DROP = 'STATE_DROP'
common.STATE_QUIT = 'STATE_QUIT'

common.blockIgnoreList = [
  'powered_rail',
  'rail',
  'redstone_torch',
  'hopper',
] 

common.foodTypes = [
  'melon_slice',
  'baked_potato',
  'cooked_chicken',
  'cooked_porkchop',
  'cooked_mutton',
  'cooked_beef',
  'bread',
]

common.hostileTypes = [
  'cave_spider', 
  'spider', 
  'creeper', 
  'skeleton', 
  'phantom', 
  'shulker',
  'enderman', 
  'slime', 
  'witch',
  'zombie', 
  'zombie_villager'
]

common.equipmentList = [
  {name: 'pickaxe', required: true, count: 1, type: 'tool'}, 
  {name: 'torch', required: true, count: 64, type: 'tool'},
  {name: 'sword', required: false, count: 1, type: 'tool'},
  {name: 'shield', required: false, count: 1, type: 'tool'},
  {name: 'shovel', required: false, count: 1, type: 'tool'},
] 

// add food types to the equipment lists
common.foodTypes.forEach((ft) => {
  common.equipmentList.push({name: ft, required: false, count: 20, type: 'food'})
})

module.exports = common;
