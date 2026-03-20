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

  if (loading) return <div className="page-status">Loading...</div>;
  if (error) return <div className="page-status error">Error: {error}</div>;
  if (!company) return <div className="page-status">Company not found.</div>;

  return (
    <div className="page">
      <Link to="/" className="back-link">&larr; All Companies</Link>

      <header className="detail-header">
        <h1>{company.name}</h1>
        <p className="address">{company.address}</p>
        <span className="meta">
          Created {new Date(company.createdAt).toLocaleDateString()}
        </span>
      </header>

      <section className="projects-section">
        <h2>Projects ({projects.length})</h2>
        {projects.length === 0 ? (
          <p className="empty">No projects for this company.</p>
        ) : (
          <ul className="card-list">
            {projects.map((p) => (
              <li key={p.id} className="card">
                <h3>{p.name}</h3>
                <p className="address">{p.address}</p>
                <span className="meta">
                  Created {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
