/**
 * A random number for this page load, so the sponsorship slots show a random choice and order
 * on every visit, and all slots on the page agree. Drawn once and kept until the page reloads, so
 * nothing changes while someone works. 0 means "listed order": used while prerendering, so the
 * server HTML and the first browser render match.
 */
let seed = 0;

export function pageSeed(): number {
  if (seed === 0) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    seed = value[0] || 1;
  }
  return seed;
}

export const noSubscribe = () => () => {};
