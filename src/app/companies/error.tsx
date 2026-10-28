"use client";
export default function ErrorPage() {
  return (
    <section role="alert">
      <h1>Companies are temporarily unavailable</h1>
      <p>We could not load the company catalog. Please try again later.</p>
      <button onClick={() => window.location.reload()}>Try again</button>
    </section>
  );
}
