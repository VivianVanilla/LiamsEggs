// Breeding, the team on screen, and the nurse. Only numbers here; the rules are in core/family.js.

// Up to this many creatures can be out on your screen at once.
export const TEAM_MAX = 3;

// Who can breed: a Scrapper or older, and fed enough. There is no waiting between eggs: what holds
// breeding back is the fullness each parent spends.
export const BREED_STAGE = 2;
export const BREED_FULLNESS = 40;
export const BREED_COST = 30;
// How many things the parents can pass on between them: born-with gifts, mutations, or a Quirk.
export const BREED_GIFTS = 3;
// A nurse can save the parents this much of the fullness breeding costs, at most.
export const MAX_CARE_SAVE = 0.9;

// The Mega Breeder, bought once for the whole household with gems. Every egg after that can carry
// this many more things from its parents.
export const MEGA_BREEDER = { cost: 150, gifts: 3 };

// The Bloodline Altar, also bought once with gems. Sacrifice a creature on it and every race it is
// at least half of becomes a race the Nursery's eggs can hatch as, for good. You don't pick: each egg
// has `eggChance` of being one of them, each as likely, and then `eggShares` says how much of it:
// all of it, half (with Human), or a quarter. The egg shows which before you keep it.
export const ALTAR = { cost: 200, share: 0.5, eggChance: 0.3, eggShares: [[1, 0.4], [0.5, 0.4], [0.25, 0.2]] };

// Rolling eggs: the egg on offer is free to keep, and each roll for a different one costs this many
// gems from the shared bank. Hyper roll keeps rolling until it lands what you asked for, spending at
// most one of these amounts.
export const ROLL_COST = 1;
export const HYPER_BUDGETS = [10, 25, 50, 100];

// A new last name, from the shared bank. Its last name is its family, so its family's cursed
// technique and what its babies take change with it (core/family.js changeFamily).
export const FAMILY_CHANGE_COST = 10000;

// A nurse snacks any teammate under this fullness, and checks on them this often, in seconds.
export const CARE_HUNGRY = 40;
export const CARE_ROUND = 60;
// Job XP a nurse earns for each kind of help.
export const CARE_XP = { feed: 4, round: 1, breed: 25 };
