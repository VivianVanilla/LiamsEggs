# Files to draw

**1 to draw**, 150 from a free library, 0 drawn by you, out of 151. Run `npm run art` to refresh this list. To see new files in the game, use **Reload art** in the tray menu.

Every file is a **PNG with a transparent background**, saved in this folder under exactly the name below. The sizes are suggestions; only the creature layers must all share one canvas size.

Until a file exists, the game shows a plain dashed box with its name. Mutations, jobs, Stands, Quirks and the speedster are the exception: those simply do not show yet.

"library" means the picture came from a free human-made library (see CREDITS.md). To use your own drawing instead, save it over that file and remove its row from CREDITS.md.

## Creature (2)

Draw it facing right, standing at the bottom middle of the canvas. Use a pale body: the colors it mines are tinted over this picture. Suggested size: 512 x 512.

| Status | File | What |
| --- | --- | --- |
| library | `creature/body.png` | The creature itself. Every creature uses this one picture, scaled up as it grows. |
| library | `creature/egg.png` | The egg that lands on your screen before you name it. |

## Food files (6)

What a food file looks like when it gets dragged onto the creature. Suggested size: 128 x 128.

| Status | File | What |
| --- | --- | --- |
| library | `food/bone.png` | A .bone file (Stone Bean) |
| library | `food/sap.png` | A .sap file (Heart Beet) |
| library | `food/spark.png` | A .spark file (Zip Root) |
| library | `food/ink.png` | A .ink file (Mind Melon) |
| library | `food/ember.png` | A .ember file (Fire Pepper) |
| library | `food/goo.png` | A .goo file (Mutagen Cap) |

## Animals (5)

Facing right, standing at the bottom of the canvas. Suggested size: 128 x 128.

| Status | File | What |
| --- | --- | --- |
| library | `animals/cluck.png` | Cluckling, a small chicken |
| library | `animals/woolbit.png` | Woolbit, a small sheep. Also the Beastmaster's summons in the arena. |
| library | `animals/beetle.png` | Beetlet, a small beetle. Also the Swarm Keeper's summons. |
| library | `animals/blob.png` | Spawnling, a little blob summoned in the arena |
| library | `animals/shadow.png` | Dark Shadow, the living shadow summoned by that Quirk |

## Farm (10)

One tile of a field, and the crop that sits on it. Suggested size: 64 x 64.

| Status | File | What |
| --- | --- | --- |
| library | `farm/soil.png` | A tilled square of dirt |
| library | `farm/crop-1.png` | A crop just sprouting |
| library | `farm/crop-2.png` | A crop half grown |
| library | `farm/crop-3.png` | A ripe crop |
| library | `farm/pepper.png` | A ripe Fire Pepper |
| library | `farm/root.png` | A ripe Zip Root |
| library | `farm/beet.png` | A ripe Heart Beet |
| library | `farm/bean.png` | A ripe Stone Bean |
| library | `farm/melon.png` | A ripe Mind Melon |
| library | `farm/cap.png` | A ripe Mutagen Cap |

## Society (3)

Standing at the bottom of the canvas. Use pale colors: each people's color is tinted over these. Suggested size: 128 x 128.

| Status | File | What |
| --- | --- | --- |
| library | `society/hut.png` | A hut on land a people owns |
| library | `society/keep.png` | A people's capital |
| library | `society/citizen.png` | One tiny citizen |

## Tray icon (1)

The little icon next to your clock. Suggested size: 32 x 32.

| Status | File | What |
| --- | --- | --- |
| library | `icons/tray.png` | Until this exists, the tray shows the plain Electron icon. |

## Mutations (30)

Draw each one on a copy of body.png so it lines up, then erase the body and save only the new part. Nothing shows until a file exists, so these can come whenever. Suggested size: same canvas as creature/body.png.

| Status | File | What |
| --- | --- | --- |
| library | `mutations/horns.png` | Horns, from eating Stone Bean. Sits in front of the body. |
| library | `mutations/plates.png` | Bone Plates, from eating Stone Bean. Sits in front of the body. |
| library | `mutations/spikes.png` | Back Spikes, from eating Stone Bean. Sits behind the body. |
| library | `mutations/clubtail.png` | Club Tail, from eating Stone Bean. Sits behind the body. |
|  | `mutations/skullmask.png` | Bone Mask, from eating Stone Bean. Sits in front of the body. |
| library | `mutations/leafcrown.png` | Leaf Crown, from eating Heart Beet. Sits in front of the body. |
| library | `mutations/vines.png` | Arm Vines, from eating Heart Beet. Sits in front of the body. |
| library | `mutations/moss.png` | Moss Coat, from eating Heart Beet. Sits in front of the body. |
| library | `mutations/bloom.png` | Head Bloom, from eating Heart Beet. Sits in front of the body. |
| library | `mutations/roots.png` | Root Feet, from eating Heart Beet. Sits in front of the body. |
| library | `mutations/antennae.png` | Antennae, from eating Zip Root. Sits in front of the body. |
| library | `mutations/coillegs.png` | Coil Legs, from eating Zip Root. Sits in front of the body. |
| library | `mutations/arcs.png` | Static Arcs, from eating Zip Root. Sits in front of the body. |
| library | `mutations/zaptail.png` | Zap Tail, from eating Zip Root. Sits behind the body. |
| library | `mutations/jets.png` | Back Jets, from eating Zip Root. Sits behind the body. |
| library | `mutations/mindgem.png` | Mind Gem, from eating Mind Melon. Sits in front of the body. |
| library | `mutations/bigbrain.png` | Big Brain, from eating Mind Melon. Sits in front of the body. |
| library | `mutations/glyphs.png` | Skin Glyphs, from eating Mind Melon. Sits in front of the body. |
| library | `mutations/tentacle.png` | Back Tentacle, from eating Mind Melon. Sits behind the body. |
| library | `mutations/halo.png` | Halo, from eating Mind Melon. Sits in front of the body. |
| library | `mutations/flamehair.png` | Flame Hair, from eating Fire Pepper. Sits in front of the body. |
| library | `mutations/claws.png` | Claws, from eating Fire Pepper. Sits in front of the body. |
| library | `mutations/smoke.png` | Smoke Vents, from eating Fire Pepper. Sits behind the body. |
| library | `mutations/magma.png` | Magma Veins, from eating Fire Pepper. Sits in front of the body. |
| library | `mutations/firetail.png` | Fire Tail, from eating Fire Pepper. Sits behind the body. |
| library | `mutations/extraarms.png` | Extra Arms, from eating Mutagen Cap. Sits behind the body. |
| library | `mutations/extralegs.png` | Extra Legs, from eating Mutagen Cap. Sits behind the body. |
| library | `mutations/secondhead.png` | Second Head, from eating Mutagen Cap. Sits in front of the body. |
| library | `mutations/blobbelly.png` | Blob Belly, from eating Mutagen Cap. Sits in front of the body. |
| library | `mutations/feelers.png` | Feelers, from eating Mutagen Cap. Sits in front of the body. |

## Jobs (28)

Same trick as mutations. Only its current job shows, so each picture should be the whole outfit. Nothing shows until a file exists. Suggested size: same canvas as creature/body.png.

| Status | File | What |
| --- | --- | --- |
| library | `jobs/miner.png` | Miner. Idea: hard hat. |
| library | `jobs/prospector.png` | Prospector. Idea: hard hat, magnifying glass. |
| library | `jobs/excavator.png` | Excavator. Idea: hard hat, big pickaxe. |
| library | `jobs/hoarder.png` | Gem Hoarder. Idea: crown, sack of gems, purple cape. |
| library | `jobs/sage.png` | Spectrum Sage. Idea: wizard hat, prism staff, blue cape. |
| library | `jobs/driller.png` | Titan Driller. Idea: hard hat, drill, orange cape. |
| library | `jobs/wraith.png` | Tunnel Wraith. Idea: dark hood, pickaxe. |
| library | `jobs/farmer.png` | Farmer. Idea: straw hat. |
| library | `jobs/cultivator.png` | Cultivator. Idea: straw hat, hoe. |
| library | `jobs/rancher.png` | Rancher. Idea: cowboy hat, shepherd crook. |
| library | `jobs/warden.png` | Grove Warden. Idea: antlers, hoe, green cape. |
| library | `jobs/monarch.png` | Harvest Monarch. Idea: crown, hoe, gold cape. |
| library | `jobs/beastmaster.png` | Beastmaster. Idea: cowboy hat, crook, brown cape. |
| library | `jobs/swarm.png` | Swarm Keeper. Idea: beekeeper veil, crook. |
| library | `jobs/fighter.png` | Fighter. Idea: headband. |
| library | `jobs/tactician.png` | Tactician. Idea: headband, scroll. |
| library | `jobs/berserker.png` | Berserker. Idea: headband, sword. |
| library | `jobs/grandmaster.png` | Grandmaster. Idea: graduation cap, scroll. |
| library | `jobs/trickster.png` | Trickster. Idea: jester hat, scroll. |
| library | `jobs/warlord.png` | Warlord. Idea: helmet, sword, red cape. |
| library | `jobs/doom.png` | Doom Knight. Idea: helmet, huge sword, black cape. |
| library | `jobs/nurse.png` | Nurse. Idea: stethoscope. |
| library | `jobs/medic.png` | Medic. Idea: stethoscope, bandage. |
| library | `jobs/midwife.png` | Midwife. Idea: stethoscope, baby bottle. |
| library | `jobs/surgeon.png` | Field Surgeon. Idea: stethoscope, syringe. |
| library | `jobs/battlemedic.png` | Battle Medic. Idea: helmet, bandage, syringe. |
| library | `jobs/broodmother.png` | Brood Mother. Idea: stethoscope, baby bottle, eggs. |
| library | `jobs/nightnurse.png` | Night Nurse. Idea: crescent moon, stethoscope, pill. |

## Stands (14)

The whole Stand, facing right, feet at the bottom middle of the canvas. It floats behind its user, a little bigger than the body. Nothing shows until a file exists. Suggested size: same canvas as creature/body.png.

| Status | File | What |
| --- | --- | --- |
| library | `stands/starplatinum.png` | Star Platinum. Impossibly fast fists, and a moment of stopped time. It can also move when someone else stops time. |
| library | `stands/theworld.png` | The World. Stops time. Everything else in the ring just stands there and takes it. |
| library | `stands/kingcrimson.png` | King Crimson. Erases a few seconds. Nothing can touch it, and then it is standing behind you. |
| library | `stands/magiciansred.png` | Magician's Red. Crossfire Hurricane. The flames keep burning after they land. |
| library | `stands/stonefree.png` | Stone Free. Unravels into string, ties you down, and then hits you anyway. |
| library | `stands/thehand.png` | The Hand. Erases the space between you. You arrive whether you like it or not. |
| library | `stands/silverchariot.png` | Silver Chariot. A rapier faster than the eye. Drops its armor to go faster still. |
| library | `stands/stickyfingers.png` | Sticky Fingers. Zips a door into the floor and comes out next to you. |
| library | `stands/crazydiamond.png` | Crazy Diamond. Punches hard and fixes anything, including its user. |
| library | `stands/goldexperience.png` | Gold Experience. Gives life to whatever it touches. The life it gives bites. |
| library | `stands/purplehaze.png` | Purple Haze. A cloud of virus that does not care whose side you are on. Its user catches a little too. |
| library | `stands/hierophant.png` | Hierophant Green. Emerald Splash, from clear across the ring. |
| library | `stands/heavensdoor.png` | Heaven's Door. Opens you up like a book and writes in you that you have no moves. |
| library | `stands/killerqueen.png` | Killer Queen. Anything it touches is a bomb. The fuse is short. |

## Quirks and speedster (13)

Same trick as mutations: only the new part, lined up with the body. Nothing shows until a file exists. Suggested size: same canvas as creature/body.png.

| Status | File | What |
| --- | --- | --- |
| library | `powers/speedster.png` | What a speedster wears. Sits in front of the body. |
| library | `quirks/oneforall.png` | One For All. Stacked power from everyone who held it. Hits like a truck and hurts itself doing it. It can be passed on, and grows each time. Sits in front of the body. |
| library | `quirks/allforone.png` | All For One. Takes a move away from an enemy and keeps it for the rest of the fight. Sits in front of the body. |
| library | `quirks/decay.png` | Decay. Whatever it touches keeps falling apart. Sits in front of the body. |
| library | `quirks/halfhalf.png` | Half-Cold Half-Hot. Fire on one side, ice on the other. Burns you and freezes you in place. Sits in front of the body. |
| library | `quirks/hellflame.png` | Hellflame. A huge sheet of fire that leaves everything burning. Sits in front of the body. |
| library | `quirks/explosion.png` | Explosion. Sweats nitroglycerin. Everything close by gets blown back. Sits in front of the body. |
| library | `quirks/erasure.png` | Erasure. One look and your moves stop working for a while. Sits in front of the body. |
| library | `quirks/darkshadow.png` | Dark Shadow. A living shadow comes out and fights for it. Sits behind the body. |
| library | `quirks/zerogravity.png` | Zero Gravity. One touch and you drift off the ground, helpless. Sits in front of the body. |
| library | `quirks/engine.png` | Engine. Engines in its legs. Bursts ahead and hits harder for a few seconds. Sits in front of the body. |
| library | `quirks/hardening.png` | Hardening. Goes hard as rock and shrugs most of it off. Sits in front of the body. |
| library | `quirks/electrification.png` | Electrification. Zaps everything nearby, then short-circuits its own brain for a moment. Sits in front of the body. |

## Races (5)

Same trick as mutations: only the new part, lined up with the body. Giants and Tontattas only change size, so they have none. Nothing shows until a file exists. Suggested size: same canvas as creature/body.png.

| Status | File | What |
| --- | --- | --- |
| library | `races/fishman.png` | Fish-man. Idea: a wave around its feet. |
| library | `races/mink.png` | Mink. Idea: paw prints and a spark of lightning. |
| library | `races/lunarian.png` | Lunarian. Idea: flames on its shoulders. |
| library | `races/devil.png` | Devil. Idea: a trident. |
| library | `races/halfdevil.png` | Half-devil. Idea: a saw. |

## Cursed techniques (10)

Same trick as mutations: only the new part, lined up with the body. Nothing shows until a file exists. Suggested size: same canvas as creature/body.png.

| Status | File | What |
| --- | --- | --- |
| library | `techniques/limitless.png` | Limitless. Nothing quite reaches it for a moment, and then Blue and Red meet in the middle of you. |
| library | `techniques/shrine.png` | Shrine. Invisible cuts from a distance, and a domain that cuts everything in the ring. |
| library | `techniques/tenshadows.png` | Ten Shadows. Calls shikigami out of its own shadow to fight for it. |
| library | `techniques/strawdoll.png` | Straw Doll. Hammers nails from across the ring, and hurts you through what it already took. |
| library | `techniques/ratio.png` | Ratio Technique. Hits the one weak point, seven tenths along. Gets stronger once it is past its hours. |
| library | `techniques/speech.png` | Cursed Speech. Says it, and you do it. It hurts its own throat a little every time. |
| library | `techniques/flames.png` | Disaster Flames. Sends burning insects at you, then drops a small sun on the spot. |
| library | `techniques/boogie.png` | Boogie Woogie. One clap and you have swapped places with something, and no idea what just happened. |
| library | `legendary/twinsoul.png` | Twin Soul, a Legendary mutation. |
| library | `legendary/malevolentsoul.png` | Malevolent Soul, a Legendary mutation. |

## Crafting (8)

Charms, for the workshop. Worn ones also show small at its neck. Suggested size: 128 x 128.

| Status | File | What |
| --- | --- | --- |
| library | `crafts/ruby.png` | Ruby Charm |
| library | `crafts/citrine.png` | Citrine Charm |
| library | `crafts/emerald.png` | Emerald Charm |
| library | `crafts/sapphire.png` | Sapphire Charm |
| library | `crafts/amethyst.png` | Amethyst Charm |
| library | `crafts/prism.png` | Prism Charm |
| library | `crafts/ash.png` | Ash Ring |
| library | `crafts/flint.png` | Flint Ring |

## Effects (1)

Thrown shots in a fight. Use a pale color: each move tints it. Suggested size: 64 x 64.

| Status | File | What |
| --- | --- | --- |
| library | `fx/bolt.png` | A thrown shot or ranged move flying through the air. |

## Monsters (15)

Facing right, standing at the bottom middle of the canvas. They spawn from the Challenges note. Suggested size: 512 x 512.

| Status | File | What |
| --- | --- | --- |
| library | `monsters/bull.png` | Brawler Bull, a training monster. |
| library | `monsters/crab.png` | Shell Crab, a training monster. |
| library | `monsters/hare.png` | Dart Hare, a training monster. |
| library | `monsters/owl.png` | Riddle Owl, a training monster. |
| library | `monsters/croc.png` | Bog Croc, a training monster. |
| library | `monsters/rat.png` | Pit Rat. Starving, fast, and it has already decided. |
| library | `monsters/scorpion.png` | Iron Scorpion. The shell shrugs off most of it. The tail does not miss. |
| library | `monsters/spider.png` | Web Witch. Ties you up, then takes its time. |
| library | `monsters/serpent.png` | Bog Serpent. Hard to kill, and the poison keeps working while it heals. |
| library | `monsters/eagle.png` | Storm Eagle. Comes down out of nowhere, again and again. |
| library | `monsters/tortoise.png` | Old Shell. It has outlived everything that ever tried this. |
| library | `monsters/squid.png` | Deep Squid. It knows what you are about to do, and it would rather you didn't. |
| library | `monsters/mammoth.png` | Hill Mammoth. You will get tired long before it does. |
| library | `monsters/rex.png` | Old Rex. One bite is most of a fight. |
| library | `monsters/dragon.png` | The Last Dragon. There is a reason it is the last one. |
