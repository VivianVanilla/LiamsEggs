// Breeding, the team on screen, and the nurse. Only numbers here; the rules are in core/family.js.

// Up to this many creatures can be out on your screen at once.
export const TEAM_MAX = 3;

// Who can breed: a Scrapper or older, fed enough, and rested since last time.
export const BREED_STAGE = 2;
export const BREED_FULLNESS = 40;
// Fullness each parent spends, and how long each rests before it can breed again.
export const BREED_COST = 30;
export const BREED_REST_HOURS = 2;
// How many things the parents can pass on between them: born-with gifts, mutations, or a Quirk.
export const BREED_GIFTS = 3;
// A nurse can take this much of the rest away, at most.
export const MAX_CARE_REST = 0.9;

// Rolling eggs: the egg on offer is free to keep, and each roll for a different one costs this many
// gems from the shared bank. Hyper roll keeps rolling until it lands what you asked for, spending at
// most one of these amounts.
export const ROLL_COST = 1;
export const HYPER_BUDGETS = [10, 25, 50, 100];

// A nurse snacks any teammate under this fullness, and checks on them this often, in seconds.
export const CARE_HUNGRY = 40;
export const CARE_ROUND = 60;
// Job XP a nurse earns for each kind of help.
export const CARE_XP = { feed: 4, round: 1, breed: 25 };
