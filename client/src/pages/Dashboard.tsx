import { Link } from "react-router-dom";
import { useUser } from "../auth/useUser";

const STATS = [
  { label: "Projects", count: 3 },
  { label: "Materials", count: 8 },
  { label: "Equipment", count: 8 },
];

const NAV_TILES = [
  {
    to: "/projects",
    title: "Projects",
    description: "View and manage active projects",
    accent: "text-grass-400",
  },
  {
    to: "/materials",
    title: "Materials",
    description: "Browse and manage your material inventory",
    accent: "text-grass-400",
  },
  {
    to: "/equipment",
    title: "Equipment",
    description: "Track rental equipment and costs",
    accent: "text-grass-400",
  },
];

export default function Dashboard() {
  const { profile } = useUser();

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      {profile?.companyName && (
        <header className="bg-brick-900 border border-brick-800 rounded-xl p-8 mb-10 shadow-lg">
          <h1 className="text-3xl font-bold text-grass-300">
            {profile.companyName}
          </h1>
        </header>
      )}

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-brick-200 mb-4">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-brick-900 border border-brick-800 rounded-lg p-6 text-center"
            >
              <p className="text-3xl font-bold text-grass-400 mb-1">
                {stat.count}
              </p>
              <p className="text-sm text-brick-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-brick-200 mb-4">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {NAV_TILES.map((tile) => (
            <Link
              key={tile.to}
              to={tile.to}
              className="group bg-brick-900 border border-brick-800 rounded-lg p-6 hover:border-brick-700 hover:bg-brick-900/80 transition-colors"
            >
              <h3
                className={`text-xl font-semibold ${tile.accent} group-hover:underline`}
              >
                {tile.title}
              </h3>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
