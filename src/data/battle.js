// How a creature behaves in a fight. You set this in the battle plan note, and can change its
// stance mid-fight. The numbers are used by sim/arena.js.

export const STANCES = {
  close: {
    name: 'Keep close',
    blurb: 'Walks right up and keeps swinging. Hits the most, and gets hit the most.',
  },
  mid: {
    name: 'Mid range',
    blurb: 'Hangs back, throws things and backs away from anything that comes close. Best with ranged moves and more Speed than its enemy. Moves that need it close rarely get used.',
  },
  bounce: {
    name: 'Bounce',
    blurb: 'Goes in, hits once, backs up, and comes again. If it is faster than its enemy, it barely gets touched. If it is slower, this just wastes its time.',
  },
  hold: {
    name: 'Hold ground',
    blurb: 'Plants its feet, takes 15% less damage and swings a little weaker at whatever comes close. Only walks in if nothing comes to it for a while.',
  },
};

export const STANCE_IDS = Object.keys(STANCES);

export const HURT_PLANS = {
  fight: { name: 'Keep going', blurb: 'Nothing changes when it is hurt.' },
  backoff: { name: 'Back off', blurb: 'Under 30% health it switches to mid range.' },
  berserk: { name: 'All out', blurb: 'Under 30% health it hits 30% harder and takes 20% more.' },
};

export const TARGET_PLANS = {
  near: { name: 'Nearest', blurb: 'Goes for whoever is closest. It rarely bothers with summons.' },
  weak: { name: 'Weakest', blurb: 'Hunts whoever has the least health left, however far away.' },
  strong: { name: 'Strongest', blurb: 'Goes for whoever has the most health left.' },
};

// `heart` is the move a Philosopher's Heart speeds up, picked in the battle plan.
export const defaultBattlePlan = () => ({ stance: 'close', hurt: 'fight', target: 'near', off: [], heart: null });

// A melee swing takes a moment to wind up once something is in reach, so a fighter that is only
// passing through can get away clean. A bounce comes in already swinging.
export const WINDUP = 0.2;

// Fighters nudge each other apart, so one standing toe to toe keeps flickering around the edge of
// reach. Only moving this far past that counts as having left.
export const WINDUP_SLACK = 1.08;

export const LOW_HEALTH = 0.3;
export const BERSERK_HIT = 1.3;
export const BERSERK_TAKEN = 1.2;

// Backing up is slower than walking forward, so only a real Speed lead escapes anything.
export const BACKING_SPEED = 0.7;

// How far past melee reach mid range likes to stand, how hard its thrown shots land compared to
// a normal hit, and how hard it swings when something does catch it there.
export const MID_GAP = 125;
export const THROW_POWER = 0.55;
export const OFF_BALANCE = 0.7;

// How long a bounce backs up for, and how far out it waits for its next swing.
export const BOUNCE_BACK = 0.4;
export const BOUNCE_WAIT_GAP = 42;

// How much less damage holding its ground takes, and how long it waits before walking in.
export const HOLD_GUARD = 0.15;
export const HOLD_HIT = 0.88;
export const HOLD_PATIENCE = 3.5;

// Whatever you fight (monsters, and everything on the other side in Adventure, Chapter ???, the
// God Chapter and the Negative) throws back only this share of what its reflection says. Your
// creatures hit far harder and have far less health than what they fight, so a full mirror on that
// side would mostly kill them with their own hits.
export const FOE_REFLECT = 0.1;

// The plain thrown shot a mid range fighter uses between its moves.
export const THROW = { name: 'Throw', power: THROW_POWER, speed: 560, color: '#ffffff', dodgeable: true };
