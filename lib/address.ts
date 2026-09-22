/**
 * Formatted addresses are long and repetitive ("Julius Nyerere International
 * Convention Centre, Shaaban Robert St, Dar es Salaam"), so every list that
 * shows one splits it into a bold name and a quiet remainder.
 *
 * Google returns "15 Ohio Street, Dar es Salaam" and the place picker stores
 * "{name}, {address}", so the first comma is the right cut in both cases.
 */
export function splitAddress(address: string): { title: string; detail: string } {
  const i = address.indexOf(',');
  if (i === -1) return { title: address.trim(), detail: '' };
  return { title: address.slice(0, i).trim(), detail: address.slice(i + 1).trim() };
}
