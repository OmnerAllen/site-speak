import { Link } from "react-router-dom";
import { useUser } from "../../auth/useUser";
import { useSuspenseQueries } from "@tanstack/react-query";
import { api } from "../../api";

export default function Dashboard() {
  const { profile } = useUser();

  const [
    { data: projects },
    { data: materials },
    { data: equipment },
    { data: suppliers },
  ] = useSuspenseQueries({
    queries: [
      { queryKey: ["my-projects"], queryFn: api.getProjects },
      { queryKey: ["materials"], queryFn: api.getMaterials },
      { queryKey: ["equipment"], queryFn: api.getEquipment },
      { queryKey: ["suppliers"], queryFn: api.getSuppliers },
    ],
  });

  const overviewStats = [
    { label: "Projects", count: projects?.length || 0, to: "/projects" },
    { label: "Materials", count: materials?.length || 0, to: "/materials" },
    { label: "Equipment", count: equipment?.length || 0, to: "/equipment" },
    { label: "Suppliers", count: suppliers?.length || 0, to: "/suppliers" },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12">
      {profile?.companyName && (
        <header className="bg-brick-900 border border-brick-800 rounded-xl p-8 mb-10 shadow-lg">
          <h1 className="text-3xl font-bold text-grass-500">
            {profile.companyName}
          </h1>
        </header>
      )}

      <section>
        <h2 className="text-lg font-semibold text-brick-200 mb-4">Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewStats.map((stat) => (
            <Link
              key={stat.label}
              to={stat.to}
              className="block bg-brick-900 border border-brick-800 rounded-lg p-6 text-center hover:border-brick-700 hover:bg-brick-900/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grass-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brick-950"
            >
              <p className="text-3xl font-bold text-grass-500 mb-1">
                {stat.count}
              </p>
              <p className="text-sm text-brick-200">{stat.label}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
