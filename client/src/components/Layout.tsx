import { Link, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useUser } from "../auth/useUser";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active
          ? "bg-grass-800 text-grass-200"
          : "text-brick-300 hover:text-brick-100 hover:bg-brick-800"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { profile } = useUser();

  const logout = () => {
    document.cookie = "id_token=; path=/; max-age=0";
    auth.signoutRedirect({ post_logout_redirect_uri: window.location.origin });
  };

  return (
    <div className="min-h-screen bg-brick-950 text-brick-100">
      <nav className="border-b border-brick-800 bg-brick-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="text-lg font-bold text-grass-400 tracking-tight"
            >
              Site Speak
            </Link>
            {auth.isAuthenticated && (
              <div className="hidden sm:flex items-center gap-1">
                <NavLink to="/">Dashboard</NavLink>
                <NavLink to="/projects">Projects</NavLink>
                <NavLink to="/materials">Materials</NavLink>
                <NavLink to="/equipment">Equipment</NavLink>
                <NavLink to="/custom-forms">Forms</NavLink>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {auth.isAuthenticated && profile ? (
              <>
                <span className="hidden sm:inline text-xs text-brick-400 font-mono">
                  {profile.email}
                  {profile.roles.length > 0 && (
                    <span className="ml-2 bg-grass-900 text-grass-300 px-2 py-0.5 rounded-full">
                      {profile.roles.join(", ")}
                    </span>
                  )}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-brick-400 hover:text-brick-200 transition-colors cursor-pointer"
                >
                  Log out
                </button>
              </>
            ) : (
              !auth.isLoading && (
                <button
                  onClick={() => auth.signinRedirect()}
                  className="text-sm font-medium text-grass-400 hover:text-grass-300 transition-colors cursor-pointer"
                >
                  Log in
                </button>
              )
            )}
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
