-- Original Foxey practice content. Apply after the schema migration.
begin;
insert into public.problems (slug,title,difficulty,description,constraints,starter_code_python,starter_code_javascript,published) values ('two-number-sum','Two Number Sum','easy','Return the indices of two different entries whose sum equals target. Exactly one pair exists. Return the smaller index first.

Examples
numbers = [4, 9, 2, 7], target = 11 → [0, 3]
numbers = [5, 5], target = 10 → [0, 1]','2 ≤ length ≤ 10,000. Values and target are integers between -1,000,000 and 1,000,000.','def two_number_sum(numbers, target):
    # Write your solution here.
    pass
','function twoNumberSum(numbers, target) {
  // Write your solution here.
}
',true);
insert into public.problem_tags (problem_id,tag) select id,'Arrays' from public.problems where slug='two-number-sum';
insert into public.problem_tags (problem_id,tag) select id,'Hash Maps' from public.problems where slug='two-number-sum';
insert into public.problems (slug,title,difficulty,description,constraints,starter_code_python,starter_code_javascript,published) values ('reverse-a-string','Reverse a String','easy','Return a new string with the characters in reverse order. Spaces count as characters.

Examples
text = "foxey" → "yexof"
text = "a b" → "b a"
text = "" → ""','0 ≤ length ≤ 10,000. Input contains printable ASCII characters.','def reverse_string(text):
    # Write your solution here.
    pass
','function reverseString(text) {
  // Write your solution here.
}
',true);
insert into public.problem_tags (problem_id,tag) select id,'Strings' from public.problems where slug='reverse-a-string';
insert into public.problems (slug,title,difficulty,description,constraints,starter_code_python,starter_code_javascript,published) values ('find-the-largest-number','Find the Largest Number','easy','Return the largest value in a nonempty list of integers. Repeated values do not change the answer.

Examples
numbers = [-8, -2, -11] → -2
numbers = [6, 1, 6] → 6','1 ≤ length ≤ 10,000. Each value is an integer between -1,000,000 and 1,000,000.','def largest_number(numbers):
    # Write your solution here.
    pass
','function largestNumber(numbers) {
  // Write your solution here.
}
',true);
insert into public.problem_tags (problem_id,tag) select id,'Arrays' from public.problems where slug='find-the-largest-number';
insert into public.problems (slug,title,difficulty,description,constraints,starter_code_python,starter_code_javascript,published) values ('count-frequencies','Count Frequencies','easy','Count how often each lowercase word appears. Return a dictionary in Python or a plain object in JavaScript mapping each word to its count. Key order does not matter.

Examples
words = ["fox", "owl", "fox"] → {"fox": 2, "owl": 1}
words = [] → {}','0 ≤ number of words ≤ 10,000. Each word contains 1–30 lowercase English letters.','def count_frequencies(words):
    # Write your solution here.
    pass
','function countFrequencies(words) {
  // Write your solution here.
}
',true);
insert into public.problem_tags (problem_id,tag) select id,'Arrays' from public.problems where slug='count-frequencies';
insert into public.problem_tags (problem_id,tag) select id,'Hash Maps' from public.problems where slug='count-frequencies';
insert into public.problems (slug,title,difficulty,description,constraints,starter_code_python,starter_code_javascript,published) values ('valid-brackets','Valid Brackets','medium','Decide whether every opening bracket has a matching closing bracket of the same kind, in the correct nesting order. Return a boolean. An empty string is valid.

Examples
text = "{[()]}" → true
text = "([)]" → false
text = "" → true','0 ≤ length ≤ 10,000. Only (, ), [, ], {, and } occur.','def valid_brackets(text):
    # Write your solution here.
    pass
','function validBrackets(text) {
  // Write your solution here.
}
',true);
insert into public.problem_tags (problem_id,tag) select id,'Strings' from public.problems where slug='valid-brackets';
insert into public.problem_tags (problem_id,tag) select id,'Stacks' from public.problems where slug='valid-brackets';
insert into public.problems (slug,title,difficulty,description,constraints,starter_code_python,starter_code_javascript,published) values ('merge-sorted-lists','Merge Sorted Lists','medium','Combine two ascending singly linked lists into one ascending list. Return its head, or None/null when both inputs are empty. You may reuse the input nodes. Each ListNode has val and next fields. The examples show node values in traversal order.

Examples
first = [1, 4, 8], second = [2, 4, 9] → [1, 2, 4, 4, 8, 9]
first = [], second = [3] → [3]','0 ≤ combined node count ≤ 10,000. Integer values range from -1,000,000 to 1,000,000. Inputs contain no cycles.','class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def merge_sorted_lists(first, second):
    # Write your solution here.
    pass
','class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

function mergeSortedLists(first, second) {
  // Write your solution here.
}
',true);
insert into public.problem_tags (problem_id,tag) select id,'Linked Lists' from public.problems where slug='merge-sorted-lists';
commit;
