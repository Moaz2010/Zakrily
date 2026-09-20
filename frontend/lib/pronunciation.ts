type Voice = { name: string; lang: string; default: boolean };

// Web Speech has no gender field; prefer known female English voice names.
export function selectEnglishVoice<T extends Voice>(voices: T[]): T | undefined {
  const english = voices.filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang));
  return english.find((voice) => /\b(Zira|Aria|Jenny|Samantha|Victoria|Karen|Moira|Tessa|Serena|Susan|Hazel|Sonia|Libby|female)\b/i.test(voice.name))
    ?? english.find((voice) => voice.default)
    ?? english.find((voice) => /^en[-_]US$/i.test(voice.lang))
    ?? english[0];
}
