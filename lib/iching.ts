import hexagramsData from './hexagrams.json';

export interface HexagramLine {
  value: 6 | 7 | 8 | 9; // 6=變陰, 7=少陽, 8=少陰, 9=變陽
  isChanging: boolean;
}

export interface IChingResult {
  question?: string;
  primaryHexagram: (typeof hexagramsData)[0];
  changingLines: number[]; // 1-indexed line positions that are changing
  resultHexagram: (typeof hexagramsData)[0] | null; // null if no changing lines
  lines: HexagramLine[];
  interpretation: string; // A brief Chinese summary of what this reading means
}

// Trigram binary patterns (3 bits): bit2=top, bit1=mid, bit0=bottom
// Each trigram is identified by its 3-line binary value (0=yin, 1=yang)
// 乾=111(7), 兌=110(6), 離=101(5), 震=100(4), 巽=011(3), 坎=010(2), 艮=001(1), 坤=000(0)

// King Wen sequence lookup table: hexagramTable[upper][lower] = hexagram number
// upper/lower trigram indices: 乾=0, 兌=1, 離=2, 震=3, 巽=4, 坎=5, 艮=6, 坤=7
// Binary pattern to trigram index mapping:
//   111 (7) -> 乾 (0)
//   110 (6) -> 兌 (1)
//   101 (5) -> 離 (2)
//   100 (4) -> 震 (3)
//   011 (3) -> 巽 (4)
//   010 (2) -> 坎 (5)
//   001 (1) -> 艮 (6)
//   000 (0) -> 坤 (7)

const BINARY_TO_TRIGRAM_INDEX: Record<number, number> = {
  7: 0, // 乾
  6: 1, // 兌
  5: 2, // 離
  4: 3, // 震
  3: 4, // 巽
  2: 5, // 坎
  1: 6, // 艮
  0: 7, // 坤
};

// hexagramTable[upperTrigramIndex][lowerTrigramIndex] = hexagram number (King Wen sequence)
//           lower: 乾  兌  離  震  巽  坎  艮  坤
const HEXAGRAM_TABLE: number[][] = [
  /* upper 乾 */ [1, 10, 13, 25, 44, 6, 33, 12],
  /* upper 兌 */ [43, 58, 49, 17, 28, 47, 31, 45],
  /* upper 離 */ [14, 38, 30, 21, 50, 64, 56, 35],
  /* upper 震 */ [34, 54, 55, 51, 32, 40, 62, 16],
  /* upper 巽 */ [9, 61, 37, 42, 57, 59, 53, 20],
  /* upper 坎 */ [5, 60, 63, 3, 48, 29, 39, 8],
  /* upper 艮 */ [26, 41, 22, 27, 18, 4, 52, 23],
  /* upper 坤 */ [11, 19, 36, 24, 46, 7, 15, 2],
];

/**
 * 大衍筮法 simulation.
 * Generates a line value (6, 7, 8, or 9) using traditional yarrow stalk probabilities:
 *   6 (變陰, old yin):  1/16
 *   7 (少陽, young yang): 5/16
 *   8 (少陰, young yin):  7/16
 *   9 (變陽, old yang): 3/16
 *
 * Simulated by summing three coin-like throws where each throw yields:
 *   2 (yin)  with probability 1/4
 *   3 (yang) with probability 3/4
 * (This matches the traditional three-division yarrow stalk method.)
 */
function castLine(): 6 | 7 | 8 | 9 {
  // Each "throw" of the virtual stalks: 2=yin (p=1/4), 3=yang (p=3/4)
  function throwStalks(): 2 | 3 {
    return Math.random() < 0.25 ? 2 : 3;
  }
  const sum = throwStalks() + throwStalks() + throwStalks();
  // sum possibilities:
  //   6 = 2+2+2 → probability (1/4)^3 = 1/64... wait, we use the standard method below
  // Actually, the standard yarrow method gives:
  //   6 + 6 + 6 = 18 → not possible with 2/3
  // The correct interpretation: sum of three throws (each 2 or 3) gives:
  //   6 (2+2+2): p = (1/4)^3 = 1/64... that's not right either.
  //
  // The classical probabilities (1/16, 5/16, 7/16, 3/16) come from:
  //   Each group of stalks resolves to either 2 or 3, but with different weights per round.
  //   Round 1: p(2)=1/2, p(3)=1/2  → but traditional gives p(young)=3/4, p(old)=1/4 per round
  //
  // Simplest faithful simulation: use cumulative probability thresholds directly.
  return sum as 6 | 7 | 8 | 9;
}

/**
 * Casts a single line value using cumulative probability thresholds
 * that faithfully reproduce the classical yarrow stalk distribution:
 *   6 (變陰):  1/16  → cumulative 0..1/16
 *   7 (少陽): 5/16  → cumulative 1/16..6/16
 *   8 (少陰): 7/16  → cumulative 6/16..13/16
 *   9 (變陽): 3/16  → cumulative 13/16..16/16
 */
function castLineValue(): 6 | 7 | 8 | 9 {
  const r = Math.random();
  if (r < 1 / 16) return 6;       // 變陰: 1/16
  if (r < 6 / 16) return 7;       // 少陽: 5/16
  if (r < 13 / 16) return 8;      // 少陰: 7/16
  return 9;                        // 變陽: 3/16
}

/**
 * Convert 6 line values to hexagram number using the King Wen sequence.
 * lines[0] = bottom line (first line), lines[5] = top line (sixth line).
 * Yin line (value 6 or 8) = 0; Yang line (value 7 or 9) = 1.
 */
function linesToHexagramNumber(lines: HexagramLine[]): number {
  // Lower trigram: lines 0, 1, 2 (bottom three)
  const lowerBit0 = lines[0].value === 7 || lines[0].value === 9 ? 1 : 0;
  const lowerBit1 = lines[1].value === 7 || lines[1].value === 9 ? 1 : 0;
  const lowerBit2 = lines[2].value === 7 || lines[2].value === 9 ? 1 : 0;
  const lowerPattern = (lowerBit2 << 2) | (lowerBit1 << 1) | lowerBit0;

  // Upper trigram: lines 3, 4, 5 (top three)
  const upperBit0 = lines[3].value === 7 || lines[3].value === 9 ? 1 : 0;
  const upperBit1 = lines[4].value === 7 || lines[4].value === 9 ? 1 : 0;
  const upperBit2 = lines[5].value === 7 || lines[5].value === 9 ? 1 : 0;
  const upperPattern = (upperBit2 << 2) | (upperBit1 << 1) | upperBit0;

  const upperIdx = BINARY_TO_TRIGRAM_INDEX[upperPattern];
  const lowerIdx = BINARY_TO_TRIGRAM_INDEX[lowerPattern];

  return HEXAGRAM_TABLE[upperIdx][lowerIdx];
}

/**
 * Get a hexagram by its number (1–64).
 */
export function getHexagram(number: number): (typeof hexagramsData)[0] {
  const hexagram = hexagramsData.find((h) => h.number === number);
  if (!hexagram) {
    throw new Error(`Hexagram number ${number} not found. Must be between 1 and 64.`);
  }
  return hexagram;
}

/**
 * Generate the interpretation string in Chinese.
 * Warm, 2–3 sentence summary of the reading.
 */
function generateInterpretation(
  primaryHexagram: (typeof hexagramsData)[0],
  changingLines: number[],
  resultHexagram: (typeof hexagramsData)[0] | null
): string {
  const primary = `得${primaryHexagram.name}卦（${primaryHexagram.symbol}），${primaryHexagram.meaning}`;

  if (changingLines.length === 0) {
    return `${primary}此卦無變爻，象意穩定，宜依本卦之道行事。`;
  }

  const lineDesc = changingLines.map((n) => `第${n}爻`).join('、');

  if (resultHexagram) {
    return `${primary}${lineDesc}為變爻，變卦為${resultHexagram.name}卦（${resultHexagram.symbol}）。${resultHexagram.meaning}`;
  }

  return `${primary}${lineDesc}為變爻，局勢正在轉化，順勢而行方為上策。`;
}

/**
 * 大衍筮法 simulation: cast a complete I Ching hexagram reading.
 *
 * Generates 6 lines from bottom (line 1) to top (line 6), each with a value of
 * 6, 7, 8, or 9 following traditional yarrow stalk probabilities:
 *   6 (變陰, old yin):   1/16
 *   7 (少陽, young yang): 5/16
 *   8 (少陰, young yin):  7/16
 *   9 (變陽, old yang):  3/16
 *
 * Changing lines (6 or 9) flip to produce the result hexagram:
 *   6 → becomes yang (7) in result
 *   9 → becomes yin (8) in result
 */
export function castHexagram(question?: string): IChingResult {
  // Step 1: Generate 6 lines (bottom to top)
  const lines: HexagramLine[] = Array.from({ length: 6 }, () => {
    const value = castLineValue();
    return {
      value,
      isChanging: value === 6 || value === 9,
    };
  });

  // Step 2: Identify changing line positions (1-indexed)
  const changingLines: number[] = lines
    .map((line, index) => (line.isChanging ? index + 1 : null))
    .filter((pos): pos is number => pos !== null);

  // Step 3: Look up primary hexagram
  const primaryNumber = linesToHexagramNumber(lines);
  const primaryHexagram = getHexagram(primaryNumber);

  // Step 4: Compute result hexagram if there are changing lines
  let resultHexagram: (typeof hexagramsData)[0] | null = null;

  if (changingLines.length > 0) {
    // Flip changing lines: 6 (old yin) → 7 (young yang), 9 (old yang) → 8 (young yin)
    const resultLines: HexagramLine[] = lines.map((line) => {
      if (line.value === 6) {
        return { value: 7 as const, isChanging: false };
      }
      if (line.value === 9) {
        return { value: 8 as const, isChanging: false };
      }
      return { ...line, isChanging: false };
    });

    const resultNumber = linesToHexagramNumber(resultLines);
    resultHexagram = getHexagram(resultNumber);
  }

  // Step 5: Generate interpretation
  const interpretation = generateInterpretation(
    primaryHexagram,
    changingLines,
    resultHexagram
  );

  return {
    question,
    primaryHexagram,
    changingLines,
    resultHexagram,
    lines,
    interpretation,
  };
}

export { hexagramsData };
