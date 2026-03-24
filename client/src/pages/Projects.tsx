import { useEffect, useState } from "react";
import { fetchMyProjects } from "../api";
import { useUser } from "../auth/UserContext";
import type { Project } from "../types";

export default function Projects() {
  const { profile } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyProjects()
      .then(setProjects)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="p-8 text-center text-brick-300 animate-pulse">
        Loading projects...
      </div>
    );
  if (error)
    return (
      <div className="p-8 text-center text-radioactive-400">Error: {error}</div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12">
      {profile?.companyName && (
        <header className="bg-brick-900 border border-brick-800 rounded-xl p-8 mb-10 shadow-lg">
          <h1 className="text-3xl font-bold text-grass-300 mb-1">
            {profile.companyName}
          </h1>
          <p className="text-brick-400 text-sm">Your company dashboard</p>
        </header>
      )}

      <section>
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-brick-800">
          <h2 className="text-2xl font-bold text-brick-100">
            Projects{" "}
            <span className="ml-2 bg-brick-800 text-brick-300 text-sm px-2.5 py-0.5 rounded-full">
              {projects.length}
            </span>
          </h2>
        </div>

        {projects.length === 0 ? (
          <p className="text-brick-400 italic bg-brick-900/50 p-6 rounded-lg border border-brick-800/50 text-center">
            No projects found for your company.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((p) => (
              <li
                key={p.id}
                className="bg-brick-900 border border-brick-800 rounded-lg p-6 hover:border-brick-700 transition-colors"
              >
                <h3 className="text-xl font-semibold text-brick-200 mb-2">
                  {p.name}
                </h3>
                <p className="text-brick-400 text-sm mb-4">{p.address}</p>
                <span className="text-xs text-brick-500 font-mono">
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
