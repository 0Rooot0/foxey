"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section role="alert">
      <h1>Practice is temporarily unavailable</h1>
      <p>We could not load the problem library. Please try again later.</p>
      <button onClick={reset}>Try again</button>
    </section>
  );
}
