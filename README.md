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

Each of those fills a slot. A creature has one **basic slot**, which takes any of them, and each **Legendary mutation** adds a **Legendary slot** of its own: that is how powers go together. The only way to get one is to beat the monster that gives it in Challenges. A creature holds one, and each **Legendary Expander** (from Bizarre expeditions) makes room for one more, up to 3, so it can hold all four powers at once. Their slots, stats and fight bonuses all add up. With no room left, a new one is yours to swap in or turn down.
Every soul also brings a move of its own and a passive. The narrower its slot, the stronger its passive.

| Soul | From | Its slot takes | In every fight | Its move |
| --- | --- | --- | --- | --- |
| **Twin Soul** | The Last Dragon | any power | each move has a 30% chance to go off twice; moves back 15% sooner | Twin Burst |
| **Malevolent Soul** | Old Rex | a Stand | 50% harder hits on anything below half health; heals 15% when a foe falls | Cruel Edge |
| **Iron Soul** | The Iron Rhino | a cursed technique | 35% less damage, 40% more max HP, throws 30% of every hit back, can't be stunned, confused or silenced | Iron Fortress |
| **Ghost Soul** | The Ghost Leopard | speedster powers | 20% more dodging (even sure hits), 20% more crits at 2.5x, 25% faster, phases out every 5 seconds | Phase Out |
| **Tide Soul** | The Sea King | a Devil Fruit | poison-proof, 15% more max HP, heals 2% a second | Tidal Wave |
| **War Soul** | The Silverback | speedster powers or a cursed technique | 15% more crits, more reach, each hit lands 3% harder for the rest of the fight (up to 60%) | Warpath |

So a Stand and a Devil Fruit together need a Malevolent, Tide or Twin Soul.

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
| Human | nothing special, and no weakness | Works 25% harder | most eggs |
| Giant | Takes 15% less damage, and is drawn bigger | Digs 50% more colors | forest and sea expeditions |
| Fish-man | 12% more max HP | Catches food, whatever its job | coast and sea |
| Mink | 8% more dodging | Expeditions back 20% sooner | forest and sea |
| Lunarian | Poison can't touch it. Drawn with dark skin, black wings and fire on its back | 50% more gems | sea and sky, Adventure level 23 |
| Tontatta | 15% faster, 5% more dodging, drawn smaller | Farms 50% more | forest |
| Long-arm | Swings from further away | Expeditions bring 25% more gems | forest |
| Skypiean | 10% more critical hits | Expeditions twice as likely to find someone | sky island |
| Devil | Heals whenever a foe goes down | A gem every 4 hours, whatever its job | sea, very rarely, Adventure level 27 |
| Vampire | 15% more max HP, poison-proof, heals whenever a foe goes down. Pale, with drops of blood | A gem every 2 hours, whatever its job | stone ruins (Bizarre) |
| Pillar Man | All three Modes as moves (Divine Sandstorm, Boiling Blood, Shining Blades). Takes 30% less damage, 30% more max HP, heals 15% of the damage it deals, and once a fight below 30% health becomes the Ultimate Life Form: full health, 40% harder hits, unstoppable. Drawn bigger, a pillar behind it | Twice the colors, a gem every 2 hours | stone ruins, rarely |
| Dragon | 10% less damage, 10% more critical hits, further reach. Green scales, red wings | Twice as many gems | rift in the sky, rarely |
| Cursed Alien | 12% more dodging and 12% more critical hits. Green, with a flying saucer | Expeditions three times as likely to find someone | rift in the sky |

The last four are the strongest born in the light world, and only come from Bizarre expeditions. Like every race, they mix: a baby can be half or a quarter of one. The Codex lists every race's stats and every move it brings, and What it has shows them for each creature.

**The races of the Negative Dimension** are stronger still, and only exist after a universe reset (below). Every one of them beats a Pillar Man far more often than not (`node tools/balance.js` measures it): each is at least as hard to put down, brings two moves, has something a Pillar Man has no answer to, and finds about a gem an hour at home on top of its trade. Each one is also the only blood that wounds what lives in Chapter ???.

| Race | In a fight, besides being as tough as a Pillar Man | Its moves | At home, besides a gem an hour |
| --- | --- | --- | --- |
| Voidling | 30% more dodging, even sure hits; 40% faster; moves back 25% sooner; one extra life; drawn smaller | Void Step, Void Rend | expeditions twice as fast, three times as likely to find someone |
| Antiseraph | heals 40% of the damage it deals, 20% more crits, poison-proof, one extra life | Black Halo, Fallen Choir | 3.5x gems |
| Abyssal Titan | 40% less damage, 70% more max HP, can't be stopped, below half health 80% harder hits; drawn much bigger | Abyss Crush, Trench Quake | 3x colors |
| Hexborn | every hit curses for 3 seconds, 40% harder hits and 50% more on the wounded, one extra life | Grand Hex, Hex Storm | 2.5 gems an hour in all |
| Mirrorkin | throws 60% of every hit back, dodges even sure hits, one extra life | Shatter, Mirror Prison | works twice as hard |
| Entropy Wraith | everything near it rots 60% of its hit every second, its hits keep rotting, poison-proof, one extra life | Heat Death, Entropy Bloom | farms 3x as much |
| Chimera | each hit 7% stronger for the fight, 25% harder hits, heals 40% when a foe falls, one extra life | Devour, Chimera Form | 12 food an hour |
| Homunculus | three extra lives, heals 3% a second | Ouroboros, Red Stone | 3x gems |
| Dreadwyrm | 25% more crits at 4.5x, more reach, one extra life | Null Breath, Dread Wing | 4x gems |

## The Nursery

Home, Nursery is where new creatures come from.

- **Breed:** two parents, Scrappers or older and at least 40 full. Choose its last name, who it looks and fights like, and up to 3 things to pass on: born-with gifts, mutations and one Quirk. There is no waiting between eggs: each parent just spends 30 fullness. A Nurse out on the screen lets one more pass on and saves the parents fullness.
- **The Mega Breeder** costs 150 gems, once, and lets every egg after it carry 3 more things.
- **The Bloodline Altar**, in the Altar tab, is bought once with gems. Sacrifice a creature on it (gone forever) and every race it is at least half of joins the altar: a half-and-half creature adds both, a quarter isn't enough. You don't pick an egg's race: each egg has a 30% chance of being one of the altar's races, whole, half or a quarter, and the Eggs tab shows it before you keep it.
- **Eggs:** the egg on offer is free; rolling another costs a gem, and Hyper roll keeps rolling until it gets the gifts or family you pick.
- **Items:** a **Time Chamber Key** grows a creature straight to Grown and fed, ready to breed. A **Limit Expander** makes room for 2 more mutations. Both come from Adventure and expeditions. A **Legendary Expander** makes room for one more Legendary mutation (3 at most), and only comes from Bizarre expeditions. The four **Ascension items**, crafted in the Negative, are used here too (see [Ascension](#ascension)).

## The village

Everyone not out on your screen lives in the village and works for the pool you all share, even while the game is closed (up to 8 hours). Home, Village:

- **Work:** Miners dig colors, Farmers grow food, Fighters hunt, Nurses make everyone work harder.
- **The Legendary Mine:** up to 3 legendary Miners (a Miner in its final form, or one with a Legendary mutation) dig Legendary ore for the forge.
- **Expeditions:** send up to 3, up to 3 expeditions at once. **Sea expeditions** go along the coast, through the forest, across the sea, or up to the sky island. **Bizarre expeditions** go into the stone ruins or through the rift in the sky: they can kill whoever goes (the stronger it is, the likelier it comes back, and if nobody does, nothing they found does either), but they are the only place the four strongest races and Legendary Expanders come from. Expeditions bring back gems, sometimes loot, a Devil Fruit, or a creature of another race. A clock counts down until they are back, and **200 plants from the larder take an hour off**.

## Adventure

Fight, Adventure: 60 levels in five acts for a party of three, fought in a ring on your screen. Nobody can die. Every fifth level a deadly monster leads the enemy: The Last Dragon ends Act 1 at level 20, in Act 2 the enemy carries forged weapons, in Act 3 Legendary mutations, and Act 4 ends with The First Beast at level 50. The first win of each level pays gems, and some pay ore, items, or a rare creature that wants to join you.

**Act 5** (levels 51 to 60) is meant to feel impossible. Every enemy is an Elder trained to the limit, born with two gifts, armed, and carrying three Legendary mutations, and the levels climb far faster. Every other level has a boss that fights like nothing before it: The Hollow Kraken (can't be stopped, heals, calls shadows), Rex Eternal (can't be stopped, heals from its bites, twice as hard below half health), The Starving Leviathan (gets back up twice, rots everything near it), two Thunder Tigers at once, and The End of All Things at level 60, which does all of it, stops time and silences everything around it.

## The universe reset

Beating level 60 cracks the universe. The Adventure note can then **reset the universe**: every creature you have dies, and everything is wiped, gems, ore, weapons, the village, the altar, the breeders and every level of Adventure. An egg falls, the same as the very first time. What it opens:

- **The Negative Dimension**, from a button at the bottom of the menu. A reset never touches it.
- **Chapter ???**, 25 more levels in the Adventure note, each 1.17 times harder than the one before, starting past the end of Act 5. Everything there is void-touched: a creature without Negative blood only lands 10% of its damage, a quarter Negative about half, half or more in full. The only way through is a creature from the Negative.
- **Creature boosts**, in the Nursery's Boosts tab: sacrifice a creature, and every gem you earn for an hour, from anything, is multiplied by what it was worth (more for power, rebirths, trophies, and most of all Negative blood). Up to 3 run at once, and they multiply each other.
- **The Deluxe Breeder**, in the Nursery, for 100,000 gems: the only way Negative blood breeds, with another or with anyone from the light world. Every egg from it can carry 3 more things.

Beating Chapter ??? says it out loud: **there is more in the Negative world**. Chapter ??? stays beaten through every reset after that, and it opens the Elite Negative (below), and the God Chapter.

## The Negative Dimension

A world of its own on its own rules, saved in `world/data/negative.json`. No mutations, no jobs, no Stands, techniques, fruits or Quirks. Its creatures hatch from its own eggs (the first 3 free, then Void Shards; rolling another costs 3, and **Auto roll** keeps rolling until it lands the races, gifts and Nen types you pick), are one of its 9 races, can be born with its 10 gifts (Inverted Heart, Event Horizon, Null Field, Entropy, Abyssal Gaze, Hollow Clock, Black Sun, Mirror Soul, Godslayer, Equivalent Exchange), and have six ability scores in the hundreds. They level up to 60 by fighting, and fight with ten times the health and hits of the light world. Each one is attuned in three ways:

- **A class**, Dungeons & Dragons style, picked for good: Fighter, Barbarian, Rogue, Monk, Paladin, Wizard, Cleric or Warlock. It decides how its scores grow, its health, a feature in every fight, and four spells that unlock as it levels, of which it prepares one, plus one more every 20 levels.
- **Nen**, Hunter x Hunter style. Water divination shows its Nen type, and the hexagon says how well it uses the others. It spreads 100 points of aura over Ten, Ren, Gyo, En and Zetsu, can turn on Ko, designs a Hatsu of its own (a type and a form, and a name), and can swear up to 3 vows that multiply the Hatsu for a price: only when cornered, paid in blood, spoken aloud, only up close, patience, or a death oath that costs a level for every loss.
- **Alchemy**, Fullmetal Alchemist style. Up to 3 circles, each a move it designs: a shape, an element, and what it pays every use, in health, in time before it comes back, and in toll on its own strength. The more it pays, the stronger it is.

Its own Adventure has 30 levels and pays XP and Void Shards. A creature that wins level 30 can **cross over**: it leaves the Negative for good and arrives in your village as a Hatchling of its race, with its gifts and nothing else, except, if you want, its **Hatsu**: crossing over can turn it into a gift in its blood. It knows the Hatsu as a move in the light world (a quarter stronger than its base, without its vows), keeps a little of its Nen type in every fight, and passes it down to its babies like any gift it was born with. From there it can go on the Bloodline Altar so eggs hatch as its race, be given up for a creature boost, or be bred with the Deluxe Breeder.

**The Elite Negative** is under the bottom of its Adventure, and opens once Chapter ??? is beaten: 10 more levels of creatures at level 60, each born with an extra gift of the Negative, every level harder. Every first win pays an **Ascension Stone**, the two boss levels (The Stone Warden and The Ascended King) 3, and a boss beaten again 1 more.

## Ascension

The Negative's Ascension tab crafts four things from Ascension Stones and Void Shards (3 stones and 300 shards each). They go into the household's bag, and each one, used in Home, Nursery, Bag, awakens a power for good:

| Item | Awakens | What it gives, besides more stats, every stat's limit 12 higher, and its power's moves hitting much harder |
| --- | --- | --- |
| Requiem Arrow | a Stand into a **Requiem** | Return to Zero; one extra life, throws 35% of every hit back, dodges even sure hits, moves back sooner and 25% harder |
| True Speed Stone | a speedster into **True Speed** | Infinite Mass Punch; 60% faster, 18% more dodging even of sure hits, 35% of swings land twice |
| Devil Fruit Awakening | a Devil Fruit into an **Awakened** one | Awakening; 60% more max HP, 35% harder, heals every second, and everything near it takes 40% of its hit every second |
| Cursed Technique Amplification | a cursed technique into its **Maximum** | Maximum Technique; 40% harder, more on the wounded, 20% more crits at 3x, heals 15% of what it deals |

## The God Chapter

The true final chapter, in the Adventure note once Chapter ??? is beaten: 10 levels past the end of Chapter ???, The Herald at level 5 and God at level 10. Everything there is void-touched like Chapter ??? and **god-touched** too: a creature with no awakened power lands 10% of its damage, one awakened power about half, two or more in full, and without Negative blood all of that only lands 10% again. The way through is creatures of Negative blood with their powers awakened. The bosses fight with the awakened powers' own moves.

## God Mode

Beat God, and **God Mode** is yours for good, through any reset: a button in the menu and on the Adventure note.

- **The Maker:** make any creature you want. Any race, or two, pure-blooded or not; any gifts at all; any Stand, cursed technique, Devil Fruit, speedster powers and Quirks, with the Legendary mutations they need added for you; every power awakened; any job, age and weapon; trained to the limit; every trophy. It is a real creature, in your village.
- **The God Ring:** put anyone in the ring against anyone. Two sides or everyone for themselves, your creatures, any monster from the Challenges, and the bosses of Chapter ??? and the God Chapter, as much as 100 times as strong. They fight as copies: nobody gets hurt and nothing is won or lost.
- **Tools:** a million gems, a full forge, 10 of every item, 100,000 Void Shards and 12 Ascension Stones, every expedition home at once, and everyone fed, grown up, trained to the limit, or awakened.

## The forge

Care, Gear, Forge turns Legendary ore and gems into weapons: the Starforged Blade, Crimson Katana, Thunder Hammer, Venom Fang, Soul Reaper Scythe, Dragonslayer and **Soul Split Katana** (50 Legendary ore and 500,000 gems; ignores dodge 25% of the time). A weapon goes into the armory everyone shares, and each creature carries one.

## Fighting

- **Battle plan:** every move it knows, which to use, and how it fights, when it is hurt, and who it goes for.
- **Challenges:** training monsters can't kill it; deadly ones can, forever, and each win is a trophy. A dead creature's file moves to `world/graveyard`. Old Rex also gives a Malevolent Soul, and The Last Dragon a Twin Soul.
- **Legendary road:** four more monsters to the death. No trophies: each gives one Legendary mutation and nothing else.
- **Ultimate road:** five more, just as deadly, once it has won any 2 on the Legendary road. They open in a note of their own, beside Challenges. Beat them all and it can **be reborn**: it absorbs one of your other creatures (gone forever), takes up to 2 of its gifts, and goes back to being a Hatchling with nothing but its name, family, race, look, farm and gifts. Then it can climb back and do it again, with more in it each time. But every rebirth makes the ultimate monsters 1.5 times as strong for it again, in health and in hits: 1.5 times after one, 2.25 after two, 3.4 after three.
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
- `node_modules\electron\dist\electron.exe test\e2e-endgame.cjs <folder>` does the same for everything past Chapter ???: auto roll, crossing over with a Hatsu, Ascension, the Elite Negative, the God Chapter and God Mode.
- `node tools/balance.js` reports fight fairness, what every power, gift and weapon is worth, how hard each Adventure level is, and how the races of the Negative do against a Pillar Man.
- `npm run exe` rebuilds Creature.exe from `tools/launcher/Creature.cs` with the C# compiler that comes with Windows.
- `npm run package` builds a standalone `dist/Creature-win32-x64` folder you can zip and give to a friend.
- Set `CREATURE_SPEED=20` to speed up crops and hunger while testing.
