export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-black dark:bg-black dark:text-white">
      <h1 className="text-5xl font-bold tracking-tight">
        Foxey
      </h1>

      <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Collaborative coding for classrooms and teams.
      </p>

      <div className="mt-8 flex gap-4">
        <button className="rounded-lg bg-black px-6 py-3 font-medium text-white dark:bg-white dark:text-black">
          Start Coding
        </button>

        <button className="rounded-lg border border-zinc-300 px-6 py-3 font-medium dark:border-zinc-700">
          Create a Class
        </button>
      </div>
    </main>
  );
}