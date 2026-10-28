import Link from "next/link";
import FoxeyBrand from "@/components/FoxeyBrand";
import AccountNav from "@/components/AccountNav";
import { ThemeToggle } from "@/components/ThemeProvider";
import "./practice.css";
export const dynamic = "force-dynamic";
export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="practice">
      <header className="practice-header">
        <Link href="/" aria-label="Foxey home">
          <FoxeyBrand />
        </Link>
        <nav aria-label="Practice navigation">
          <Link href="/practice">Practice</Link>
          <Link href="/companies">Companies</Link>
          <ThemeToggle />
          <AccountNav />
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
