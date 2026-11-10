import { fromKey } from './dates';

export type PlantSpecies = 'daisy' | 'fern' | 'succulent' | 'tulip' | 'monstera' | 'cactus';

export const PLANT_SPECIES: readonly PlantSpecies[] = ['daisy', 'fern', 'succulent', 'tulip', 'monstera', 'cactus'];

export const SPECIES_NAME: Record<PlantSpecies, string> = {
  daisy: 'Daisy',
  fern: 'Fern',
  succulent: 'Succulent',
  tulip: 'Tulip',
  monstera: 'Monstera',
  cactus: 'Cactus',
};

/** Small seeded generator (mulberry32), so the same seed always gives the same sequence. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A shuffle of every species, fixed by the cycle number. */
function shuffled(cycle: number): PlantSpecies[] {
  const order = [...PLANT_SPECIES];
  const next = seeded(Math.imul(cycle + 1, 2654435761));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * The plant species for a week. Weeks are grouped in runs of one-per-species, each run a fresh random shuffle, so it
 * feels random but every species turns up, and the same week always gives the same plant (nothing is stored).
 * A run never opens with the species the previous run ended on.
 */
export function speciesForWeek(weekStart: string): PlantSpecies {
  const d = fromKey(weekStart);
  const week = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / (7 * 86_400_000));
  const n = PLANT_SPECIES.length;
  const cycle = Math.floor(week / n);
  const order = shuffled(cycle);
  if (cycle > 0 && order[0] === shuffled(cycle - 1)[n - 1]) [order[0], order[1]] = [order[1], order[0]];
  return order[week - cycle * n];
}
