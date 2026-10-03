export function statusLabel(s: string): string {
  return { new: 'da scoprire', learning: 'in apprendimento', consolidating: 'in consolidamento', mastered: 'acquisito' }[s] ?? s;
}

export function errorStatusLabel(s: string): string {
  return { todo: 'da imparare', improving: 'in miglioramento', acquired: 'acquisito' }[s] ?? s;
}
