/** Combinaisons de k éléments, dans l'ordre lexicographique des positions de `items`. */
export function* combinations<T>(items: readonly T[], k: number): Generator<T[]> {
  if (k < 0 || k > items.length) return;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield idx.map((i) => items[i]!);
    let i = k - 1;
    while (i >= 0 && idx[i] === items.length - k + i) i--;
    if (i < 0) return;
    idx[i]!++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1]! + 1;
  }
}
