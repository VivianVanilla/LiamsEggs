# Creature

A little stick man that lives on your screen. You hatch it, feed it files and farmed food, give it a job, and raise a whole village of them: breed them, send them on expeditions, forge them weapons, and take three of them through a 50-level Adventure.

## Start it

1. The first time, open a terminal in this folder and run `npm install`, then `npm run exe`. That makes **Creature.exe**.
2. Double-click **Creature.exe**. An egg lands on your screen; name it, and that creates its `.creature` file.
3. To keep it on your taskbar: with the game running, right-click **Creature** on the taskbar and choose **Pin to taskbar**. The pinned button starts the game through Creature.exe from then on.

`Creature.exe liam` plays the world in `worlds\liam` (see [Worlds on their own branches](#worlds-on-their-own-branches)).

## Getting around

- **Click a creature** (rest the pointer on it for a moment first) to open its menu. Quick clicks pass through it, so it never gets in the way of your work.
- **The menu** has two things to do right now, **Snack** and **Mine colors**, and four places for everything else. Each place is one note with index tabs along its top, so the screen never fills up with notes:

  | Place | Tabs |
  | --- | --- |
  | **Care** | Feed, Farm, Gear (dye, charms, paint, and the forge) |
  | **Powers** | Powers, Battle plan, What it has |
  | **Fight** | Adventure, Challenges, Arena, Duel |
  | **Home** | Creatures, Nursery, Village |

- **The dock**, down the left of your screen, shows every creature you have. Drag one onto your screen to bring it out, right where you let go. Drop it on one of yours to swap them. Drag one on your screen back onto the dock to put it away. Up to three can be out at once. The `‹` tucks the dock away.
- **The Codex** (bottom of the menu) is the whole game written down: every race, the job tree with all its branches, every gift, mutation, power, weapon, item and monster, and the Adventure map.
- **Settings** has the monitor, the size of your creatures, how see-through everything is, quiet and calm modes, and **dark mode**, which turns the notes into night paper. The tray icon has these too.
- **Rename** is at the bottom of the menu, and on every creature in Home, Creatures. Its `.creature` file is renamed to match.
- **Ctrl+Alt+H** hides or shows everything instantly. While hidden, every click passes through.
- **If clicks ever stop reaching it**, click its taskbar button. That puts the window back over its monitor. It also does this by itself after the screen is unlocked, the PC wakes up, or a monitor comes or goes. Each time is written down in `%APPDATA%\Creature\window-log.txt`.

## How it grows

1. **Feed it.** Snacks are free and always there; they fill it up and help it grow. **Farmed food** is the only food that grows mutations. Dig a field in Care, Farm, choose what it grows, and feed the harvest from Care, Feed:

   | Plant | Grows | Raises |
   | --- | --- | --- |
   | Fire Pepper | claws, flames, magma | Might |
   | Zip Root | antennae, coils, jets | Speed |
   | Heart Beet | leaves, moss, roots | Vigor |
   | Stone Bean | horns, plates, spikes | Guard |
   | Mind Melon | gems, halos, glyphs | Wits |
   | Mutagen Cap | extra arms, extra legs, a second head | nothing |

   You can also drag a file ending in `.bone`, `.sap`, `.spark`, `.ink`, `.ember` or `.goo` onto it, and it counts as a snack. Eaten files move to `world/digested`; nothing is deleted, and any other file is refused.

2. **Give it a job.** Once it is a Sprout, pick Miner, Farmer, Fighter or Nurse. Each splits twice, into 16 final forms. Mining digs real colors off your screen; farming grows food on it; a Nurse looks after whoever else is out.

3. **Export it.** In its final form, Export saves a copy of its `.creature` file to share.

**Your creatures share what they gather:** one bank of colors, dust and gems, one larder of plants, one food store, and the forge's ore. It lives in `world/data/household.json`, never in a `.creature` file, so nothing is counted twice.

## Limits

- **Stats:** its best stat can reach **60**, its second **45**, its third **30**, its fourth **18** and its worst **12**.
- **Mutations:** it can hold **8**, or 2 more for each **Limit Expander** it takes (2 at most).
- **Training:** work and monsters can add up to **+10** to any one stat.

## Powers

Open Powers, Powers. Each needs its stat in its top three, and all of them are for good.

- **A Stand** (*JoJo's Bizarre Adventure*) at 20 Wits. There are 14, and what it leans on decides which.
- **Speedster** at 20 Speed: much faster on your screen and in a fight, and much hungrier.
- **A cursed technique** (*Jujutsu Kaisen*) at 20 Might. Its last name decides which one runs in its family.
- **A Devil Fruit** (*One Piece*) at 20 Vigor, from the fruits your farms and expeditions find.

It can hold one of those. **A Legendary mutation** changes that. The only way to get one is to beat the monster that gives it in Challenges. A creature holds one, and each **Legendary Expander** (from Bizarre expeditions) makes room for one more, up to 3: their stats and fight bonuses add up, and its powers fit if any one of them could hold them all. With no room left, a new one is yours to swap in or turn down.
- **Twin Soul** (The Last Dragon): any two of a Stand, speedster powers and a technique.
- **Malevolent Soul** (Old Rex): a Stand plus one more, and that one can be a **Devil Fruit**.
- **Iron Soul** (The Iron Rhino): still one power, but takes 20% less damage and has 15% more max HP.
- **Ghost Soul** (The Ghost Leopard): still one power, but dodges, crits and moves more.
- **Tide Soul** (The Sea King): a Devil Fruit beside any one power, and poison can't touch it.
- **War Soul** (The Silverback): speedster powers and a technique together, more crits and reach, but never a Stand.

Without one, a fruit goes with nothing else.

**Quirks** (*My Hero Academia*) are paid for with max HP instead, up to 60%. **One For All** grows as it is passed on.

## Gifts

**Born with**, from the egg, and passed on by breeding: Six Eyes, Sharingan, Cursed Body, **Titan Shifter** (below half its health it doubles in size and damage), **Saiyan Blood**, **Conqueror's Haki**, **Sun Breathing**, **Nine-Tails Chakra**, **One Punch**, **Void Aura** (10% more damage from everything) and **Philosopher's Heart** (one move you pick in the battle plan comes back 60% sooner).

**Awakened by breeding**: never from an egg. A bred baby can wake up with one when its parents qualify, and from then on it passes on like a born-with gift. **Rinnegan** (both parents have Sharingan; brings the Almighty Push move), **Demon Slayer Mark** (a parent has Sun Breathing; more damage and speed all fight), **Ackerman Blood** (both parents have won a fight to the death; some swings land twice) and **Scarlet Eyes** (both parents share a last name; moves come back sooner). The Nursery shows the chance before you hatch, and Guide, Chances lists them all.

**Earned**, by what it does, and kept for good, but never passed on:

| Gift | How | What it does |
| --- | --- | --- |
| Ultra Instinct | Win 10 Adventure levels | 15% more likely to dodge |
| Eight Inner Gates | Train three stats to the limit | Below a quarter of its health: 50% more damage, 30% faster |
| Domain Expansion | Hold a technique and win 3 fights to the death | At 8 seconds, 6 seconds of hits nothing can dodge, 30% harder |
| Observation Haki | Win 15 arena fights | 10% more dodging and critical hits |
| Gourmet Cells | Eat 50 farmed plants | Every swing that lands heals 3% of its max HP |
| Will of D. | Beat Adventure level 20 | 10% harder hits, and shrugs off the first stun |

What it has, Gifts it can still earn, shows how far along it is.

## Races

Every race has stats, a fight move, a passive in every fight, and a specialty at home. A bred baby is half of each parent's races, down to quarters; a race brings its move, passive and specialty at half or more.

| Race | In a fight | At home | Where from |
| --- | --- | --- | --- |
| Human | | Works 25% harder | most eggs |
| Giant | Takes 15% less damage, and is drawn bigger | Digs 50% more colors | forest and sea expeditions |
| Fish-man | 12% more max HP | Catches food, whatever its job | coast and sea |
| Mink | 8% more dodging | Expeditions back 20% sooner | forest and sea |
| Lunarian | Poison can't touch it. Drawn with dark skin, black wings and fire on its back | 50% more gems | sea and sky, Adventure level 23 |
| Tontatta | 15% faster, 5% more dodging, drawn smaller | Farms 50% more | forest |
| Long-arm | Swings from further away | Expeditions bring 25% more gems | forest |
| Skypiean | 10% more critical hits | Expeditions twice as likely to find someone | sky island |
| Devil | Heals whenever a foe goes down | A gem every 4 hours, whatever its job | sea, very rarely, Adventure level 27 |
| Vampire | 15% more max HP, poison-proof, heals whenever a foe goes down. Pale, with drops of blood | A gem every 2 hours, whatever its job | stone ruins (Bizarre) |
| Pillar Man | Takes 20% less damage, 15% more max HP, drawn bigger, a pillar behind it | Digs 75% more colors | stone ruins, rarely |
| Dragon | 10% less damage, 10% more critical hits, further reach. Green scales, red wings | Twice as many gems | rift in the sky, rarely |
| Cursed Alien | 12% more dodging and 12% more critical hits. Green, with a flying saucer | Expeditions three times as likely to find someone | rift in the sky |

The last four are the strongest, and only come from Bizarre expeditions. Like every race, they mix: a baby can be half or a quarter of one.

## The Nursery

Home, Nursery is where new creatures come from.

- **Breed:** two parents, Scrappers or older and at least 40 full. Choose its last name, who it looks and fights like, and up to 3 things to pass on: born-with gifts, mutations and one Quirk. There is no waiting between eggs: each parent just spends 30 fullness. A Nurse out on the screen lets one more pass on and saves the parents fullness.
- **The Mega Breeder** costs 150 gems, once, and lets every egg after it carry 3 more things.
- **The Bloodline Altar**, in the Altar tab, is bought once with gems. Sacrifice a creature on it (gone forever) and every race it is at least half of joins the altar: a half-and-half creature adds both, a quarter isn't enough. You don't pick an egg's race: each egg has a 30% chance of being one of the altar's races, whole, half or a quarter, and the Eggs tab shows it before you keep it.
- **Eggs:** the egg on offer is free; rolling another costs a gem, and Hyper roll keeps rolling until it gets the gifts or family you pick.
- **Items:** a **Time Chamber Key** grows a creature straight to Grown and fed, ready to breed. A **Limit Expander** makes room for 2 more mutations. Both come from Adventure and expeditions. A **Legendary Expander** makes room for one more Legendary mutation (3 at most), and only comes from Bizarre expeditions.

## The village

Everyone not out on your screen lives in the village and works for the pool you all share, even while the game is closed (up to 8 hours). Home, Village:

- **Work:** Miners dig colors, Farmers grow food, Fighters hunt, Nurses make everyone work harder.
- **The Legendary Mine:** up to 3 legendary Miners (a Miner in its final form, or one with a Legendary mutation) dig Legendary ore for the forge.
- **Expeditions:** send up to 3, up to 3 expeditions at once. **Sea expeditions** go along the coast, through the forest, across the sea, or up to the sky island. **Bizarre expeditions** go into the stone ruins or through the rift in the sky: they can kill whoever goes (the stronger it is, the likelier it comes back, and if nobody does, nothing they found does either), but they are the only place the four strongest races and Legendary Expanders come from. Expeditions bring back gems, sometimes loot, a Devil Fruit, or a creature of another race. A clock counts down until they are back, and **200 plants from the larder take an hour off**.

## Adventure

Fight, Adventure: 30 levels in two acts for a party of three, fought in a ring on your screen. Nobody can die. Every fifth level a deadly monster leads the enemy: The Last Dragon ends Act 1 at level 20, and in Act 2 the enemy carries forged weapons, up to The First Dragon at level 30. The first win of each level pays gems, and some pay ore, items, or a rare creature that wants to join you.

## The forge

Care, Gear, Forge turns Legendary ore and gems into weapons: the Starforged Blade, Crimson Katana, Thunder Hammer, Venom Fang, Soul Reaper Scythe and Dragonslayer. A weapon goes into the armory everyone shares, and each creature carries one.

## Fighting

- **Battle plan:** every move it knows, which to use, and how it fights, when it is hurt, and who it goes for.
- **Challenges:** training monsters can't kill it; deadly ones can, forever, and each win is a trophy. A dead creature's file moves to `world/graveyard`. Old Rex also gives a Malevolent Soul, and The Last Dragon a Twin Soul.
- **Legendary road:** four more monsters to the death. No trophies: each gives one Legendary mutation and nothing else.
- **Ultimate road:** five more, just as deadly, once it has won any 2 on the Legendary road. They open in a note of their own, beside Challenges. Beat them all and it can **be reborn**: it absorbs one of your other creatures (gone forever), takes up to 2 of its gifts, and goes back to being a Hatchling with nothing but its name, family, race, look, farm and gifts. Then it can climb back and do it again, with more in it each time.
- **Arena:** a free-for-all with any `.creature` files.

## The art

Everything you see is a PNG file in the `art` folder. The game never draws pictures of its own: until a file exists you get a plain dashed box with its name. [art/FILES-TO-DRAW.md](art/FILES-TO-DRAW.md) lists every file, and `npm run art` refreshes it. `npm run looks` builds missing pictures from free libraries (credited in `art/CREDITS.md`), and leaves your own drawings alone.

## Your screen and your files

- Screen colors are read only when you mine. Each read is shrunk to a small grid of average colors; no screenshot is saved or sent anywhere.
- The game makes no network connections.
- Everything lives in the `world` folder: `creatures`, `digested`, `graveyard` and `data` (settings, the shared household, arena history).
- `.creature` files are plain text. Imported ones are treated as untrusted and cleaned before use.

## Worlds on their own branches

Each person's creatures can live on a git branch of their own, so pulling game updates never touches anyone's world:

- `npm run world -- new <name>` makes `worlds/<name>` on branch `world-<name>`, and a `Play <name>.cmd` to double-click.
- `npm run world -- save <name>` commits it, and `npm run world -- push <name>` sends it to GitHub.

## For tinkerers

- `npm test` runs the game logic tests.
- `node_modules\electron\dist\electron.exe test\e2e.cjs <folder>` plays the whole game in a hidden window and saves screenshots there. Run it with `ELECTRON_RUN_AS_NODE` unset.
- `node tools/balance.js` reports fight fairness, what every power, gift and weapon is worth, and how hard each Adventure level is.
- `npm run exe` rebuilds Creature.exe from `tools/launcher/Creature.cs` with the C# compiler that comes with Windows.
- `npm run package` builds a standalone `dist/Creature-win32-x64` folder you can zip and give to a friend.
- Set `CREATURE_SPEED=20` to speed up crops and hunger while testing.
