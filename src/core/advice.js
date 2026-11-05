// One suggestion for what to do next, shown at the top of the menu and the guide. Pure logic, no
// DOM, so tests can read every suggestion.

import { stageIndex, STAGES, pathChoice, powerReady, computeStats, hasRoomFor, STAT_LABELS } from './creature.js';
import { STAND_WITS, SPEEDSTER_SPEED, TECHNIQUE_MIGHT } from '../data/powers.js';
import { SNACK } from '../data/foods.js';
import { BREED_STAGE, TEAM_MAX } from '../data/family.js';

const CLOSE_TO_POWER = 6;

// { text, go }: go names what the "Go" button opens (see openAny in ui/panels.js), or is null.
// Returns null when the menu is already pointing at something bigger, like a job or a power.
export function nextStep(c, { out = 1, home = 0, away = 0 } = {}) {
  if (c.fullness < 25) return { text: 'It is hungry. Give it a snack.', go: 'feed' };
  if (pathChoice(c) || powerReady(c)) return null;
  const stage = stageIndex(c);
  if (stage === 0) {
    const left = Math.max(1, Math.ceil((STAGES[1].at - c.growth) / SNACK.growth));
    return { text: `About ${left} more snack${left === 1 ? '' : 's'} and it becomes a ${STAGES[1].name}, old enough to pick a job.`, go: 'feed' };
  }
  if (!c.mutations.length && !c.farm.fields.length) return { text: 'Dig a field in the Farm. Farmed food is the only way to grow mutations.', go: 'farm' };
  if (c.palette.total === 0) return { text: 'Try Mine colors: it digs real colors off your screen into the bank your creatures share.', go: 'mine' };
  const s = computeStats(c);
  const close = [['stand', 'wits', STAND_WITS, 'a Stand'], ['speedster', 'speed', SPEEDSTER_SPEED, 'speedster powers'], ['technique', 'might', TECHNIQUE_MIGHT, 'its cursed technique']]
    .find(([kind, stat, need]) => hasRoomFor(c, kind) && s[stat] < need && s[stat] >= need - CLOSE_TO_POWER);
  if (close) {
    const [, stat, need, what] = close;
    return { text: `${STAT_LABELS[stat]} ${s[stat]} of ${need}: it is close to ${what}. The guide shows how to raise it.`, go: `guide:${stat}` };
  }
  if (home > 0 && away === 0) return { text: 'Send someone from the village on an expedition. They always come back with gems.', go: 'expeditions' };
  if (out < TEAM_MAX) return { text: `Up to ${TEAM_MAX} creatures can be out at once. Roll an egg for a miner, a farmer or a nurse to keep it company.`, go: 'roll' };
  if (stage >= BREED_STAGE) return { text: 'It is old enough to breed. Breed shows what it could pass on.', go: 'breed' };
  return { text: 'Train it against a monster in Challenges. Training monsters can\'t kill it.', go: 'challenges' };
}
