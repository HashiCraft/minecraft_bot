# HashiCraft Minecraft Bot

## Running the bot

Set the following environment variables

```shell
export HOST="your.server"
export PORT=25565
export USER="your_mojang_user"
export PASSWORD="your_mojang_pass"
```

Then you can start the bot, to immediately spawn the bot use the `--start` flag.

```shell
npm install
node run . --start
```

## Authentication

Requests to the API need to be authenticated to set the environment variable `API_KEY` with the
value you would like to use in the `authorization` header.

```
export API_KEY='password'
curl -H 'authorization: bearer password' localhost:3000/health 
```

## Commands

You can command the bot to perform certain tasks by sending it an in game whisper

### follow

The `follow` command tells the bot to follow you around, even off a cliff into the abyss if you like.

```
/tell BOT_NAME follow
```

### defend

The `defend` command tells the bot to follow you around, if it detects you are in danger from a Mob it will attack the mob.
If you give the bot a sword and/or a shield, it will equip these auotmatically before rushing to certain death.

```
/tell BOT_NAME defend
```

### stop

The `stop` command tells the bot to stop whatever it is doing and catch up on a little YouTube, this includes following or
defending you.

```
/tell BOT_NAME stop
```

### inventory

The `inventory` command asks the bot to tell you what it has in it's inventory 

```
/tell BOT_NAME inventory
```

## Feeding your bot

All good robotic helpers need to eat, this one is partial to `melon_slices`, if you equip the bot with `melon_slices`, it will automatically
eat when it gets hungry.
