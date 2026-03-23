import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchCompany, fetchCompanyProjects } from "../api";
import type { Company, Project } from "../types";

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchCompany(id), fetchCompanyProjects(id)])
      .then(([comp, projs]) => {
        setCompany(comp);
        setProjects(projs);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-brick-300 animate-pulse">Loading...</div>;
  if (error) return <div className="p-8 text-center text-radioactive-400">Error: {error}</div>;
  if (!company) return <div className="p-8 text-center text-brick-400">Company not found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12">
      <Link 
        to="/" 
        className="inline-flex items-center text-grass-400 hover:text-grass-300 transition-colors mb-8 text-sm font-medium"
      >
        <span className="mr-2" aria-hidden="true">&larr;</span> All Companies
      </Link>

      <header className="bg-brick-900 border border-brick-800 rounded-xl p-8 mb-10 shadow-lg">
        <h1 className="text-3xl font-bold text-grass-300 mb-3">{company.name}</h1>
        <p className="text-brick-300 mb-5 text-lg">{company.address}</p>
        <span className="text-xs text-brick-500 font-mono bg-brick-950 px-3 py-1.5 rounded-full inline-block">
          Created {new Date(company.createdAt).toLocaleDateString()}
        </span>
      </header>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-brick-800">
          <h2 className="text-2xl font-bold text-brick-100">
            Projects <span className="ml-2 bg-brick-800 text-brick-300 text-sm px-2.5 py-0.5 rounded-full">{projects.length}</span>
          </h2>
        </div>
        
        {projects.length === 0 ? (
          <p className="text-brick-400 italic bg-brick-900/50 p-6 rounded-lg border border-brick-800/50 text-center">
            No projects for this company.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((p) => (
              <li key={p.id} className="bg-brick-900 border border-brick-800 rounded-lg p-6 hover:border-brick-700 transition-colors">
                <h3 className="text-xl font-semibold text-brick-200 mb-2">{p.name}</h3>
                <p className="text-brick-400 text-sm mb-4">{p.address}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-brick-800">
                  <span className="text-xs text-brick-500 font-mono">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                  <button className="text-xs font-semibold text-radioactive-400 hover:text-radioactive-300 hover:bg-radioactive-950 px-3 py-1.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-radioactive-500">
                    Delete Project
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
