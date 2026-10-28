import Link from "next/link";
export default function NotFound() {
  return <><h1>Company not found</h1><p>This company is not available.</p><Link href="/companies">Browse companies</Link></>;
}
