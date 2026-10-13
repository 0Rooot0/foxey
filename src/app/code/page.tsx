export default function CodePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Foxey Workspace</h1>
          <p className="text-sm text-zinc-400">Untitled session</p>
        </div>

        <div className="flex items-center gap-3">
          <select className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            <option>Python</option>
            <option>JavaScript</option>
          </select>

          <button className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
            Run
          </button>
        </div>
      </header>

      <section className="grid min-h-[calc(100vh-73px)] grid-cols-1 lg:grid-cols-[2fr_1fr]">
        <div className="border-b border-zinc-800 p-6 lg:border-b-0 lg:border-r">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Editor
          </h2>
          <div className="h-full min-h-[500px] rounded-lg border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm text-zinc-300">
            Code editor will go here.
          </div>
        </div>

        <aside className="p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Output
          </h2>

          <div className="min-h-[250px] rounded-lg border border-zinc-800 bg-black p-4 font-mono text-sm text-zinc-400">
            Run your code to see output.
          </div>
        </aside>
      </section>
    </main>
  );
}