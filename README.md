# Creature

A little stick man that lives on your screen. You name it, feed it files, give it a job, and eventually export its `.creature` file to fight other creatures or found a society on your desktop.

## Start it

Double-click **Start Creature.cmd**. An egg lands on your screen; name it, and that creates its `.creature` file.

- **Click the creature** (rest the pointer on it for a moment first) to open its menu. Quick clicks pass through it, so it never gets in the way of your work.
- **The taskbar button** at the bottom of your screen opens the menu, and a second click closes it. Right-click it for Feed, Breed, Your creatures, and Hide or show. You can pin it.
- **Panels stay open side by side**, like tabs. Open as many as you like; each new one finds its own space, and clicking one brings it to the front.
- **Up to three creatures can be out at once**, say a miner, a farmer and a nurse. Click one to look after it: the panels are always about the one you last clicked, and each creature keeps its own panels where you left them. **Your creatures** (bottom of the menu) brings them out and puts them away.
- **Drag it** to carry it somewhere.
- **Ctrl+Alt+H** hides or shows everything instantly. While hidden, every click passes through.
- **Close game** is in the creature's menu, in Settings, and in the tray.
- **What it has** (in the menu) lists every mutation, job, power and charm it has, and what each one does to it.
- **Guide** (in the menu) shows where each of its stats comes from and every way to raise it. Its **Chances** tab lists every chance in the game in one place, like how rare Six Eyes is, read from the same numbers the game uses.
- **Settings** (in the creature's menu or the tray) picks the monitor, the size of your creature and its animals, how see-through everything is, quiet mode, and whether it stays near the bottom of the screen.
- The **system tray icon** also has the world and art folders, and Reload art.
- **If clicks ever stop reaching it**, click its taskbar button. That puts the window back over its monitor and starts the clicking over. It also does this by itself after the screen is unlocked or the PC wakes up, and whenever a monitor comes and goes. Each time is written down in `%APPDATA%\Creature\window-log.txt`.

## How it grows

1. **Feed it.** Open **Feed** in the menu.

   - **Snacks** are free and always there. They fill it up and help it grow, but never change it.
   - **Farmed food** is the only food that grows mutations. Dig a field in the **Farm**, choose what it grows, and feed the harvest from Feed:

   | Plant | Grows | Raises |
   | --- | --- | --- |
   | Fire Pepper | claws, flames, magma | Might |
   | Zip Root | antennae, coils, jets | Speed |
   | Heart Beet | leaves, moss, roots | Vigor |
   | Stone Bean | horns, plates, spikes | Guard |
   | Mind Melon | gems, halos, glyphs | Wits |
   | Mutagen Cap | extra arms, extra legs, a second head | nothing |

   You can also drag a file ending in `.bone`, `.sap`, `.spark`, `.ink`, `.ember` or `.goo` onto it (hold for a moment until it says "drop it here"), and it counts as a snack. Eaten files move to `world/digested`; nothing is deleted, and any other file is refused and left alone.

2. **Give it a job.** Once it is a Sprout, pick Miner, Farmer, Fighter or Nurse. Each splits twice, into 16 final forms.
   - **Mine colors:** draw a box on your screen. It digs out the real colors there and wears them. Now and then a bright vein shows up where it digs: rest the mouse on it and click before it fades, for a bonus. What it mines can be spent in the workshop.
   - **Farm:** draw a field and choose what it grows. It tills, plants and harvests on its own. Harvests go to Feed, and also top up a food store. Small animals add to that store, and watering pushes crops along.
   - **Puzzle duel:** Four Stones, Stick Pile, Light Race or Echo against it. It gets smarter as its Wits grow.
   - **Nurse:** looks after whoever else is out. It walks over and snacks any teammate that gets hungry, checks on them now and then, and makes breeding go better while it is out. That care is how it learns its job.

3. **Export it.** In its final form, Export saves a copy of its `.creature` file to share.

**Your creatures share what they gather.** Every color, bit of dust and gem any of them mines goes into one bank, every plant any of them harvests goes into one larder, and there is one food store that all of them eat from when hungry. So the miner pays for the farmer's charms, and the farmer feeds the miner. What stays each creature's own: its fields and animals, its job, its charms, dye and paint, and its fullness. The first time a creature comes out with savings of its own, they join the shared pool. The pool lives in `world/data/household.json`, never in a `.creature` file, so nothing gets counted twice.

## Limits

No creature can be great at everything, so you decide what yours is for.

- **Stats:** its best stat can reach **60**, its second **45**, its third **30**, its fourth **18** and its worst **12**. Where a stat ranks can change, and passing another stat takes its place.
- **Mutations:** it can hold **8**, out of 30. Two from one family teach that family's move.
- **Training:** work and monsters can add up to **+10** to any one stat.

The only way past a stat's limit is a trophy from a fight to the death.

## Powers

Open **Powers** from the creature's menu. All of these are for good, and they travel with its `.creature` file.

**It can have one of these three.** Each needs its stat in its top three, and choosing one takes two presses.

- **A Stand** (*JoJo's Bizarre Adventure*) opens at **20 Wits**. There are 14, and you don't pick: whatever it leans on most when it awakens decides which group its Stand comes from, and the creature itself decides which one in that group. The Stand floats behind it on your screen and comes out to fight in the arena. Star Platinum and The World can stop time, and each other's stopped time doesn't hold them.
- **Speedster** opens at **20 Speed**. It runs much faster on your screen, digs faster, moves and hits faster in the ring, and leaves afterimages. It also gets hungrier. The note shows the exact numbers.
- **A cursed technique** (*Jujutsu Kaisen*) opens at **20 Might**. You don't pick it: every creature is born with a last name, and its technique runs in that family. A Gojo gets Limitless, a Zenin gets Ten Shadows, a Ryomen gets Shrine, a Kugisaki gets Straw Doll, a Nanami gets Ratio Technique, an Inumaki gets Cursed Speech, a Jogo gets Disaster Flames, and a Todo gets Boogie Woogie. Its melee swings can also land a Black Flash. A bred creature takes whichever parent's last name you choose.

**A Legendary mutation lets it have two.** A creature only ever gets one of them, and it doesn't take up one of its 8 mutation places.

- **Twin Soul** holds any two, and adds +1 to every stat. One new mutation in 25 comes with it, and The Last Dragon always gives it.
- **Malevolent Soul** holds a Stand, plus either speedster powers or a cursed technique, but not those two together. It adds +3 Might and +2 Vigor. Any other win to the death has a 15% chance of it.

**Born with.** Some creatures hatch with a gift. Nobody can buy or train one, but a parent can pass it on. None of them has a picture, since the creature has no face. The Guide's Chances tab lists these odds with the rest.

- **Six Eyes** is only ever born into the Gojo family (1 in 5 of them). With Limitless, Infinity comes up on its own every 4 seconds.
- **Sharingan** (1 in 12) copies the first move an opponent uses in a fight, a little weaker than the real thing, and keeps it for that fight.
- **Cursed Body** (1 in 12) can hold two cursed techniques: its own family's, and the one from the other side of its family. Both share one place, so it doesn't need a Legendary mutation for the second. For a bred creature, the other side is the parent whose last name it didn't take.

**Quirks** (*My Hero Academia*) are separate, and paid for with max HP. Pick from 12, each costing 10% to 35% of its max HP, up to 60% in total. You can't get that health back.

**One For All** grows. Bought, it starts at level 1. Its holder can **pass it on** from the Powers note: that ends the holder for good (its file goes to the graveyard), and its own power, not counting One For All, is added to a stockpile that the heir carries. The stockpile sets the level, up to **7**. Each level adds Might and Speed, raises its Might limit (and every other level its Speed limit), and makes its smashes hit harder and hurt it more. Level 3 teaches Blackwhip, level 5 Danger Sense, and level 7 United States of Smash. A weak holder adds little, so a line of hatchlings gets nowhere fast; a few strong holders get it to 7. It never passes on by breeding.

Level 3 wild rivals sometimes have powers, so you can see them in the arena before you have your own.

In a society, a leader's powers reach its people: a Stand or a Quirk helps them win fights, a speedster settles land faster, and giving up health leaves room for fewer people.

## Breeding

Open **Breed** from the bottom of the menu, or **Breed two** in Your creatures. Pick two parents: each needs to be a Scrapper or older and at least 40 full. Each spends 30 fullness and rests for 2 hours after. Then choose what the egg gets:

- **Last name:** either parent's, which decides its cursed technique. The other parent's family becomes the other side of its family.
- **Looks like** one parent, and **fights like** one parent.
- **Passes on:** up to 3 things between them: born-with gifts, mutations, and at most one Quirk (the baby pays that Quirk's max HP too).

Name it and hatch it. Its `.creature` file is made straight away, and it can come out on the screen at once.

**A Nurse out on the screen helps:** one more thing can pass on, and parents rest half as long. A Medic shortens the rest more, and a Midwife's eggs hatch already grown a little.

## Battle plan

Open **Battle plan** from the menu to see every move it knows, what each does and where it came from, and to switch any of them off. You also decide how it behaves:

- **How it fights:** Keep close, Mid range (hangs back and throws things), Bounce (in, hit, back up) or Hold ground. Backing away only works if it is faster than its enemy, so Speed decides whether Mid range and Bounce pay off.
- **When it is hurt:** Keep going, Back off or All out.
- **Who it goes for:** Nearest, Weakest or Strongest.

**Try each stance in practice** plays out fights on copies and tells you how each one did. During a fight you can also shout a new stance at it, which lasts for that fight.

## Challenges

Open **Challenges** from the menu to spawn a monster right where your creature is standing. A fight burns some fullness.

- **Training monsters** match its strength and can't kill it. Each win has a 25% chance of +1 to that monster's stat. The Shell Crab is the only fight that trains Guard.
- **To the death:** ten monsters, from the Pit Rat to The Last Dragon, and **if it loses it dies forever**. Beating one earns a trophy: +3 to a stat and +3 to that stat's limit. The first press shows its odds, played out on copies, and only the second press starts the fight. There is no running.

A dead creature's file moves to `world/graveyard` as a gravestone, and the game never brings it back, even if the file gets moved back. A fight waits while everything is hidden. Closing the game mid-fight calls it off, so a crash can't kill your creature.

## Workshop

Everything any of your creatures mines lands in one shared bank to spend in the **Workshop**. Dull colors turn into Dust, and gems are banked too. Spending never lowers anyone's stats.

- **Dye** it any color it has mined.
- **Charms** are crafted once and kept. It can wear two, and they count toward its stat limits.
- **Paints** change its next fight, then wear off.


## Arena and societies

Both open from the creature's menu and take any `.creature` files. Drag them onto the note, use Import, or add a wild rival to test with.

- **Arena:** a free-for-all in a ring on your screen. A fight takes about 30 seconds.
- **Societies:** each creature founds a people on your screen. The land comes from your screen's colors at that moment: bright areas are farmland, dark areas hold ore, vivid areas hold chroma. They expand, research and slowly fight over it for hours, and carry on while you work.

## The art

Everything you see is a PNG file in the `art` folder, made by a person. The game never draws pictures of its own: until a file exists you get a plain dashed box with its name.

[art/FILES-TO-DRAW.md](art/FILES-TO-DRAW.md) lists every file, and `npm run art` refreshes it. After adding files, use **Reload art** in the tray menu. Pictures from free libraries are credited in `art/CREDITS.md`. Right now that is [Twemoji](https://github.com/twitter/twemoji), Copyright 2019 Twitter, Inc and other contributors, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/), and the stick man himself, the public-domain [AIGA sign figure](https://commons.wikimedia.org/wiki/File:Aiga_toiletsq_men.svg) designed in 1974 by Roger Cook and Don Shanosky.

`npm run looks` builds any missing body, mutation, job, Stand, Quirk, technique, crafting and monster pictures by placing those library pictures on a transparent canvas; nothing is drawn. It leaves files that already exist alone, so your own drawings are safe. `npm run looks -- --all` rebuilds every one of them, including over your drawings.

Stands, Quirks and cursed techniques only borrow their names and powers from the shows. None of the pictures come from them: a Stand is the same sign figure in its own color, holding library pictures. To draw your own, save over `stands/<name>.png`. Monsters come from the same library, and unlike your creature, they do have faces.

The creature is one still picture stacked from layers: mutations and Quirks behind, the body, mutations and Quirks in front, its current job. A Stand is a second still picture that floats behind it. They slide and flip but never animate, and a speedster's afterimages are faded copies of the same picture. The colors it mines are tinted over the body, so draw the body pale. The only things the code draws itself are plain game marks: text, health bars, border lines, the arena ring, the buttons and puzzle boards in the note panels, and squares showing colors actually mined from your screen, including veins. Stopped time also turns whoever is caught in it grey.

## Your screen and your files

- Screen colors are read only when you mine and when you found a world. Each read is shrunk to a small grid of average colors, and only those colors are kept. No screenshot is saved or sent anywhere.
- The game makes no network connections.
- Everything lives in the `world` folder: `creatures`, `digested`, `graveyard`, `data` (settings, the shared bank and store, arena history, the society).
- `.creature` files are plain text you can open and read. Imported ones are treated as untrusted and cleaned before use.

## For #tinkererssss 

- `npm test` runs the game logic tests.
- `node_modules\electron\dist\electron.exe test\e2e.cjs <folder>` plays the whole game in a hidden window and saves screenshots to that folder. Run it with `ELECTRON_RUN_AS_NODE` unset.
- `node tools/balance.js` reports fight fairness, how long societies last, and how much each power is worth.
- `npm run package` builds a standalone `dist/Creature-win32-x64` folder you can zip and give to a friend.
- Set `CREATURE_SPEED=20` to speed up crops, hunger and societies while testing.
