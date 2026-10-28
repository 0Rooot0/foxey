import type { Problem } from "./problems";
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type VisibleCase = { args: Json[]; expected: Json };
export type Contract = { version: number; functions: { python: string; javascript: string }; parameters: string[]; cases: VisibleCase[]; baseline: Pick<Problem, "description" | "constraints" | "starter_code_python" | "starter_code_javascript"> };
// Public, versioned examples only. A changed database statement must be reviewed
// with its contract before Run can be enabled again.
export const contracts: Record<string, Contract> = {
  "reverse-a-string": {
    "version": 1,
    "functions": {
      "python": "reverse_string",
      "javascript": "reverseString"
    },
    "parameters": [
      "text"
    ],
    "cases": [
      {
        "args": [
          "foxey"
        ],
        "expected": "yexof"
      },
      {
        "args": [
          "a b"
        ],
        "expected": "b a"
      },
      {
        "args": [
          ""
        ],
        "expected": ""
      }
    ],
    "baseline": {
      "description": "Return a new string with the characters in reverse order. Spaces count as characters.\n\nExamples\ntext = \"foxey\" → \"yexof\"\ntext = \"a b\" → \"b a\"\ntext = \"\" → \"\"",
      "constraints": "0 ≤ length ≤ 10,000. Input contains printable ASCII characters.",
      "starter_code_python": "def reverse_string(text):\n    # Write your solution here.\n    pass\n",
      "starter_code_javascript": "function reverseString(text) {\n  // Write your solution here.\n}\n"
    }
  },
  "find-the-largest-number": {
    "version": 1,
    "functions": {
      "python": "largest_number",
      "javascript": "largestNumber"
    },
    "parameters": [
      "numbers"
    ],
    "cases": [
      {
        "args": [
          [
            -8,
            -2,
            -11
          ]
        ],
        "expected": -2
      },
      {
        "args": [
          [
            6,
            1,
            6
          ]
        ],
        "expected": 6
      }
    ],
    "baseline": {
      "description": "Return the largest value in a nonempty list of integers. Repeated values do not change the answer.\n\nExamples\nnumbers = [-8, -2, -11] → -2\nnumbers = [6, 1, 6] → 6",
      "constraints": "1 ≤ length ≤ 10,000. Each value is an integer between -1,000,000 and 1,000,000.",
      "starter_code_python": "def largest_number(numbers):\n    # Write your solution here.\n    pass\n",
      "starter_code_javascript": "function largestNumber(numbers) {\n  // Write your solution here.\n}\n"
    }
  },
  "count-frequencies": {
    "version": 1,
    "functions": {
      "python": "count_frequencies",
      "javascript": "countFrequencies"
    },
    "parameters": [
      "words"
    ],
    "cases": [
      {
        "args": [
          [
            "fox",
            "owl",
            "fox"
          ]
        ],
        "expected": {
          "fox": 2,
          "owl": 1
        }
      },
      {
        "args": [
          []
        ],
        "expected": {}
      }
    ],
    "baseline": {
      "description": "Count how often each lowercase word appears. Return a dictionary in Python or a plain object in JavaScript mapping each word to its count. Key order does not matter.\n\nExamples\nwords = [\"fox\", \"owl\", \"fox\"] → {\"fox\": 2, \"owl\": 1}\nwords = [] → {}",
      "constraints": "0 ≤ number of words ≤ 10,000. Each word contains 1–30 lowercase English letters.",
      "starter_code_python": "def count_frequencies(words):\n    # Write your solution here.\n    pass\n",
      "starter_code_javascript": "function countFrequencies(words) {\n  // Write your solution here.\n}\n"
    }
  },
  "valid-brackets": {
    "version": 1,
    "functions": {
      "python": "valid_brackets",
      "javascript": "validBrackets"
    },
    "parameters": [
      "text"
    ],
    "cases": [
      {
        "args": [
          "{[()]}"
        ],
        "expected": true
      },
      {
        "args": [
          "([)]"
        ],
        "expected": false
      },
      {
        "args": [
          ""
        ],
        "expected": true
      }
    ],
    "baseline": {
      "description": "Decide whether every opening bracket has a matching closing bracket of the same kind, in the correct nesting order. Return a boolean. An empty string is valid.\n\nExamples\ntext = \"{[()]}\" → true\ntext = \"([)]\" → false\ntext = \"\" → true",
      "constraints": "0 ≤ length ≤ 10,000. Only (, ), [, ], {, and } occur.",
      "starter_code_python": "def valid_brackets(text):\n    # Write your solution here.\n    pass\n",
      "starter_code_javascript": "function validBrackets(text) {\n  // Write your solution here.\n}\n"
    }
  }
};
const blockedRunReasons = new Map<string, string>([
  ["two-number-sum", "Run unavailable: the first example has two valid pairs, [0, 3] and [1, 2], but the description promises exactly one. The problem needs review."],
  ["merge-sorted-lists", "Run unavailable: linked lists need explicit input and output node adapters. Array examples cannot be passed directly to this starter."],
]);
export function blockedRunReason(slug: string) {
  return blockedRunReasons.get(slug);
}
export function practiceContract(problem: Problem): { contract?: Contract; reason?: string } {
  const reason = blockedRunReason(problem.slug);
  if (reason) return { reason };
  const contract = contracts[problem.slug];
  if (!contract) return { reason: "Run unavailable: this problem has no reviewed callable contract." };
  if (Object.entries(contract.baseline).some(([key, value]) => problem[key as keyof typeof contract.baseline].replace(/\r\n/g, "\n") !== value)) return { reason: "Run unavailable: the problem content changed. Its callable contract needs review." };
  return { contract };
}
