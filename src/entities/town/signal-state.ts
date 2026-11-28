/** The room excludes the sender from cosmetic relays. These listeners hear this client's own actions. */
export const localTownPulls = new Set<(slot: number) => void>();
export const townHonks = new Set<(from: string, now: number) => void>();
