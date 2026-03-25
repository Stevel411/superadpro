/**
 * Format money: show all significant decimals, minimum 2.
 * e.g. 3.125 → "3.125", 10 → "10.00", 1.5 → "1.50", 46.875 → "46.875"
 */
export function formatMoney(val) {
  var n = Number(val || 0);
  var full = n.toFixed(6);
  var parts = full.split('.');
  var dec = parts[1].replace(/0+$/, '');
  if (dec.length < 2) dec = dec.padEnd(2, '0');
  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + dec;
}
