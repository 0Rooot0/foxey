import { practiceContract } from "./contracts";
import type { Problem } from "./problems";

export type HelpContent = {
  contractVersion: number;
  hints: readonly [string, string];
  approach: string;
  explanation: string;
  bruteForce: string;
  better: string;
  optimal: string;
  why: string;
  time: string;
  space: string;
  python: string;
  javascript: string;
  mistakes: string;
};

// Original Foxey walkthroughs, paired with the reviewed callable contracts.
// A statement or starter change must pass contract review before help is shown.
export const helpContent: Readonly<Record<string, HelpContent>> = {
  "reverse-a-string": {
    contractVersion: 1,
    hints: [
      "Which character belongs at the start of the result? Try locating it in the input.",
      "Walk backward through the input. Spaces should travel with the other characters.",
    ],
    approach: "Collect characters from the last position down to the first, then join them into one string. The printable ASCII constraint means each indexed character is one unit in both languages.",
    explanation: "Imagine reading a row of letter tiles from right to left. For input cat!, the new row reads !tac. You return a new string; you do not need to change the input.",
    bruteForce: "Repeatedly attach the next character to the front of a growing string. This produces the right order, but copying the growing result can take O(n²) total time.",
    better: "Store characters in an array or list first and join once. This avoids repeatedly rebuilding the result string.",
    optimal: "The buffer approach takes O(n) time. Every character must appear in the output, so any solution needs to read all n characters.",
    why: "After k steps, the buffer contains the final k characters of the input in reverse order. The next step adds the character immediately before them. After n steps, every character is in its required position.",
    time: "O(n), where n is the number of ASCII characters. Traversal and joining each take linear time.",
    space: "O(n) auxiliary space for the character buffer, plus O(n) for the returned string. This implementation does not claim constant extra space.",
    python: "def reverse_string(text):\n    characters = []\n    for index in range(len(text) - 1, -1, -1):\n        characters.append(text[index])\n    return ''.join(characters)",
    javascript: "function reverseString(text) {\n  const characters = [];\n  for (let index = text.length - 1; index >= 0; index--) {\n    characters.push(text[index]);\n  }\n  return characters.join('');\n}",
    mistakes: "Do not trim spaces or split into words. Start at length minus one, include index zero, and return an empty string when the input is empty.",
  },
  "find-the-largest-number": {
    contractVersion: 1,
    hints: [
      "Keep one candidate answer while you read the list. What would make you replace it?",
      "Use an actual list value as the first candidate. Zero would give the wrong answer for a list containing only negative values.",
    ],
    approach: "Start with the first value as the largest seen so far. Compare each remaining value with it and replace the candidate only when the new value is larger.",
    explanation: "For [-9, -4, -7], the candidate starts at -9, changes to -4, and stays there. The answer is a value, not its position. The input contains at least one number.",
    bruteForce: "For each value, compare it with every other value to check whether it is a maximum. Repeating those comparisons takes O(n²) time.",
    better: "Sort a copy and take its final value. A comparison sort usually takes O(n log n) time and stores a copy; it orders much more than this question needs. In JavaScript, numeric sorting needs a comparator: use .sort((a, b) => a - b). Default .sort() compares values as text, putting 10 before 2.",
    optimal: "Scan once with a single candidate. Leave the input in its original order and avoid making a copy.",
    why: "The candidate is the maximum of all values visited so far. After comparing it with the next value, it is still the largest seen so far. Once the scan ends, every value has been checked.",
    time: "O(n), where n is the list length. There are n − 1 comparisons, and any unseen value could be the largest.",
    space: "O(1) auxiliary space. Only a candidate and a loop index are needed.",
    python: "def largest_number(numbers):\n    largest = numbers[0]\n    for index in range(1, len(numbers)):\n        if numbers[index] > largest:\n            largest = numbers[index]\n    return largest",
    javascript: "function largestNumber(numbers) {\n  let largest = numbers[0];\n  for (let index = 1; index < numbers.length; index++) {\n    if (numbers[index] > largest) {\n      largest = numbers[index];\n    }\n  }\n  return largest;\n}",
    mistakes: "Initializing to zero breaks all-negative inputs. Return the candidate value rather than its index. Equal values need no special handling; a one-item list already contains its answer.",
  },
  "count-frequencies": {
    contractVersion: 1,
    hints: [
      "Each distinct word needs its own counter. What structure lets you find a counter by the word itself?",
      "A word you have not seen has count zero. Increase its count once for each occurrence.",
    ],
    approach: "Use a dictionary or object to store a count for each word. Go through the list, adding one to the count each time a word appears. Start a new word at one, then return the counts.",
    explanation: "For [bee, ant, bee, bee], bee receives three increments and ant receives one. The mapping records totals, so its key order does not matter. No words means an empty mapping.",
    bruteForce: "For each distinct word, scan the entire input to count its appearances. With n distinct words this can take O(n²) word comparisons.",
    better: "Sort a copy of the words and count adjacent runs. This groups equal words but generally costs O(n log n) comparisons and needs a copied array.",
    optimal: "Look up and update each word's count in a dictionary or object as you go. This counts all the words in one pass without sorting them.",
    why: "Each time a word appears, only its count increases, and it increases by one. After the whole list has been read, every count matches the number of times that word appeared.",
    time: "Expected O(n) with hash lookup because each word has a fixed maximum length. More generally, reading and hashing all input characters costs O(total characters). Hash-table operations are expected constant time, not a worst-case guarantee.",
    space: "O(k) entries for k distinct words. The result itself is the counter storage; beyond that output, only constant auxiliary state is used. Stored keys also occupy space proportional to their characters.",
    python: "def count_frequencies(words):\n    counts = {}\n    for word in words:\n        counts[word] = counts.get(word, 0) + 1\n    return counts",
    javascript: "function countFrequencies(words) {\n  const counts = {};\n  for (const word of words) {\n    const previous = Object.hasOwn(counts, word) ? counts[word] : 0;\n    Object.defineProperty(counts, word, {\n      value: previous + 1,\n      enumerable: true,\n      writable: true,\n      configurable: true\n    });\n  }\n  return counts;\n}",
    mistakes: "Do not reset an existing counter to one or return only the distinct words. In the JavaScript solution above, Object.hasOwn checks whether we have stored a count for the word. An object can inherit names such as constructor, so checking for a value alone could mistake one of those names for a count. Object.defineProperty stores the count directly on the result object. It also handles __proto__ safely, although that name is outside the allowed lowercase letters.",
  },
  "valid-brackets": {
    contractVersion: 1,
    hints: [
      "A closing bracket must match the most recent opening bracket that is still waiting. Counts alone cannot tell you the nesting order.",
      "Keep waiting opening brackets in a stack. Each closing bracket should remove the top entry only if its kind matches.",
    ],
    approach: "Push opening brackets onto a stack. For a closing bracket, reject an empty stack or a mismatched top. After the scan, accept only if the stack is empty.",
    explanation: "Think of opening brackets as unfinished tasks. A new task must finish before the task surrounding it can finish. In [({})], each closing symbol completes the most recently opened task.",
    bruteForce: "Repeatedly remove adjacent matching pairs until none remain. If anything remains, reject it. Rebuilding and rescanning the string can take O(n²) time.",
    better: "A stack avoids repeated rescans and string copies. Separate counters for each kind are insufficient because they lose the order of unfinished openings.",
    optimal: "With the stack, scan once from left to right and return false as soon as a closing bracket cannot match. Valid input requires checking every symbol, so O(n) time is optimal.",
    why: "The stack holds exactly the unmatched openings in their nesting order. A closer can legally finish only the top opening. A mismatch cannot be repaired by later symbols, and leftover openings mean some tasks never finished.",
    time: "O(n), where n is the number of brackets. Each symbol is visited once, and every opening is pushed and popped at most once.",
    space: "O(n) auxiliary space in the worst case, when all symbols are openings. An empty input uses an empty stack and returns true.",
    python: "def valid_brackets(text):\n    openings = {')': '(', ']': '[', '}': '{'}\n    stack = []\n    for character in text:\n        if character in '([{':\n            stack.append(character)\n        elif not stack or stack.pop() != openings[character]:\n            return False\n    return not stack",
    javascript: "function validBrackets(text) {\n  const openings = { ')': '(', ']': '[', '}': '{' };\n  const stack = [];\n  for (const character of text) {\n    if ('([{'.includes(character)) {\n      stack.push(character);\n    } else if (stack.length === 0 || stack.pop() !== openings[character]) {\n      return false;\n    }\n  }\n  return stack.length === 0;\n}",
    mistakes: "Matching totals do not prove correct nesting: [(]) has balanced counts but crosses pairs. Reject a closer with no waiting opener. Check for leftover openings at the end. The input contains only bracket characters, so these solutions do not need to handle letters or other symbols.",
  },
};

export function problemHelp(problem: Problem): HelpContent | undefined {
  const content = Object.hasOwn(helpContent, problem.slug) ? helpContent[problem.slug] : undefined;
  if (!content) return;
  const { contract } = practiceContract(problem);
  if (contract && content.contractVersion === contract.version) return content;
}
