import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brick-950 text-brick-100 pb-16 sm:pb-0">
      <Navbar />
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
