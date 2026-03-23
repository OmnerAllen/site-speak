import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCompanies } from "../api";
import type { Company } from "../types";

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanies()
      .then(setCompanies)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-brick-300 animate-pulse">Loading companies...</div>;
  if (error) return <div className="p-8 text-center text-radioactive-400">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12">
      <h1 className="text-3xl font-bold text-brick-100 mb-8 border-b border-brick-800 pb-4">Companies</h1>
      {companies.length === 0 ? (
        <p className="text-brick-400 italic">No companies found.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {companies.map((c) => (
            <li key={c.id}>
              <Link 
                to={`/companies/${c.id}`} 
                className="block bg-brick-900 border border-brick-800 rounded-lg p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-grass-600 focus:outline-none focus:ring-2 focus:ring-grass-400 group"
              >
                <h2 className="text-xl font-semibold text-grass-300 group-hover:text-grass-400 transition-colors mb-2">{c.name}</h2>
                <p className="text-brick-300 text-sm mb-4">{c.address}</p>
                <span className="text-xs text-brick-500 font-mono">
                  Created {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
