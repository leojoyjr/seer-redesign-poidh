import { markets } from './markets';
export function parsePredictions(csv: string) {
  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/); const header = lines.shift()?.toLowerCase().split(',').map(s => s.trim()) ?? [];
  const errors: string[] = []; const predictions: Record<string, number> = {};
  if (header.join(',') !== 'repo,predicted') return { predictions, errors: ['Expected CSV columns: repo,predicted'] };
  lines.forEach((line, i) => { if (!line.trim()) return; const fields = line.split(',').map(s => s.trim().replace(/^"|"$/g, '')); const [name, raw] = fields; if (fields.length !== 2) { errors.push(`Row ${i + 2}: expected repo,predicted`); return; } const market = markets.find(m => m.name.toLowerCase() === name?.toLowerCase()); const value = Number(raw);
    if (!market) errors.push(`Row ${i + 2}: unknown repository "${name}"`);
    else if (!raw || !Number.isFinite(value) || value < 0 || value > 1) errors.push(`Row ${i + 2}: predicted must be between 0 and 1`);
    else if (predictions[market.id] !== undefined) errors.push(`Row ${i + 2}: duplicate repository "${name}"`); else predictions[market.id] = value;
  }); if (!Object.keys(predictions).length && !errors.length) errors.push('CSV contains no predictions'); return { predictions, errors };
}
export const differences = (predicted: number, up: number, down: number) => ({ up: predicted - up, down: 1 - predicted - down });
