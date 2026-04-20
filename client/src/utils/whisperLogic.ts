// Strip any leading words that duplicate the tail of confirmedText
// (whisper sometimes echoes back part of the prompt at the start)
export function deduplicateLeading(confirmedText: string, newText: string): string {
  newText = newText.trim();
  if (!confirmedText || !newText) return newText;

  const prevWords = confirmedText.trim().split(/\s+/).filter(Boolean);
  const newWords = newText.split(/\s+/).filter(Boolean);

  // Try increasingly long suffix overlaps (up to 8 words)
  for (
    let overlap = Math.min(8, prevWords.length, newWords.length);
    overlap >= 2;
    overlap--
  ) {
    const prevTail = prevWords.slice(-overlap).join(" ").toLowerCase();
    const newHead = newWords.slice(0, overlap).join(" ").toLowerCase();
    if (prevTail === newHead) {
      return newWords.slice(overlap).join(" ");
    }
  }
  return newText;
}