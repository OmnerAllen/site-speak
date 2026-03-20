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

  if (loading) return <div className="page-status">Loading companies...</div>;
  if (error) return <div className="page-status error">Error: {error}</div>;

  return (
    <div className="page">
      <h1>Companies</h1>
      {companies.length === 0 ? (
        <p className="empty">No companies found.</p>
      ) : (
        <ul className="card-list">
          {companies.map((c) => (
            <li key={c.id}>
              <Link to={`/companies/${c.id}`} className="card">
                <h2>{c.name}</h2>
                <p className="address">{c.address}</p>
                <span className="meta">
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
