// Starting the universe over, and what opens once it has been. Only numbers here; the rules are in
// core/universe.js.
//
// Beating the last level of Adventure, the end of Act 5, cracks the universe. Resetting it kills every
// creature you have and wipes everything they built: gems, ore, the forge, the village, the altar,
// the breeders, how far Adventure got. What it gives back is the Negative Dimension
// (data/negative.js), which nothing in the reset touches, and Chapter ??? (data/adventure.js).

// Creature boosts: sacrifice one creature and every gem you earn, from anything, is multiplied by what
// it was worth, for `hours`. Up to `max` at once, and they multiply each other. A boost is worth
// 1, plus its power over `perPower`, plus `perRebirth` for every time it was reborn, plus `perNegative`
// times how much of it is from the Negative, plus `perTrophy` for every trophy, between `least` and
// `most`. Only after a universe reset.
export const BOOSTS = { max: 3, hours: 1, perPower: 50, perRebirth: 0.75, perNegative: 4, perTrophy: 0.05, least: 1.2, most: 50 };

// The Deluxe Breeder, bought once with gems after a universe reset. It is the only way creatures of
// the Negative breed, with each other or with anyone from the light world, and every egg from it can
// carry `gifts` more things from its parents.
export const DELUXE_BREEDER = { cost: 100000, gifts: 3 };
