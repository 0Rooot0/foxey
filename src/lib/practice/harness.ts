import type { Json, VisibleCase } from "./contracts";
export type CaseResult = VisibleCase & {
  status: "passed" | "failed" | "error" | "timeout" | "cancelled";
  actual?: Json;
  stdout: string;
  error?: string;
};
// Both harnesses run entirely in disposable workers, once per visible case.
export function javascriptHarness(code: string, name: string, test: VisibleCase) {
  return `
let logs = "";
let wrote = false;
const log = (...args) => { const text = (wrote ? "\\n" : "") + args.map(String).join(" "); wrote = true; logs += text.slice(0, Math.max(0, 8000 - logs.length)); };
console.log = console.info = console.warn = console.error = log;
const send = self.postMessage.bind(self);
const normalize = (value) => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return Array.from(value, normalize);
  if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])]));
  throw new Error("Return a JSON value; undefined, non-finite numbers and custom objects are unsupported.");
};
try {
  const actual = normalize(new Function(${JSON.stringify(code + "\nreturn " + name + ";")})()(...${JSON.stringify(test.args)}));
  send({ status: JSON.stringify(actual) === JSON.stringify(normalize(${JSON.stringify(test.expected)})) ? "passed" : "failed", actual, stdout: logs });
} catch (error) { send({ status: "error", error: String(error), stdout: logs }); }
`;
}
export function pythonHarness(code: string, name: string, test: VisibleCase) {
  const payload = JSON.stringify({ code, name, args: test.args, expected: test.expected });
  return `
import json as _json, contextlib as _contextlib, math as _math
def _foxey_case():
    data = _json.loads(${JSON.stringify(payload)})
    class Output:
        text = ""
        def write(self, text):
            self.text += text[:max(0, 8000-len(self.text))]
            return len(text)
        def flush(self): pass
    output = Output()
    def normalize(value):
        if value is None or type(value) in (str, bool, int): return value
        if type(value) is float and _math.isfinite(value): return int(value) if value.is_integer() else value
        if type(value) is list: return [normalize(item) for item in value]
        if type(value) is dict and all(type(key) is str for key in value): return {key: normalize(item) for key, item in value.items()}
        raise TypeError("Return a JSON value; tuples, non-finite numbers and custom objects are unsupported.")
    try:
        with _contextlib.redirect_stdout(output), _contextlib.redirect_stderr(output):
            scope = {"__name__": "__main__"}
            exec(compile(data["code"], "solution.py", "exec"), scope)
            actual = normalize(scope[data["name"]](*data["args"]))
            # JSON comparison preserves boolean versus number distinctions.
            passed = _json.dumps(actual, sort_keys=True, separators=(',', ':')) == _json.dumps(data["expected"], sort_keys=True, separators=(',', ':'))
        result = dict(status="passed" if passed else "failed", actual=actual)
    except BaseException as error:
        result = dict(status="error", error=f"{type(error).__name__}: {error}")
    result["stdout"] = output.text
    return _json.dumps(result, allow_nan=False)
_foxey_case()
`;
}
