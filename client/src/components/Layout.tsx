import { Link, useLocation } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useUser } from "../auth/useUser";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`relative px-3 py-1.5 rounded-sm text-sm font-medium transition-colors
        after:content-[''] after:absolute after:left-0 after:-bottom-1
        after:w-full after:h-1 after:bg-grass-400
        after:origin-center after:transition-transform after:duration-300 after:ease-out
        ${
          active
            ? "text-grass-400 after:scale-x-100"
            : "text-brick-300 hover:text-brick-100 hover:bg-brick-800/50 after:scale-x-0"
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
                <NavLink to="/schedule">Schedule</NavLink>
                <NavLink to="/employees">Employees</NavLink>
                <NavLink to="/work-logs">Work logs</NavLink>
                <NavLink to="/materials">Materials</NavLink>
                <NavLink to="/equipment">Equipment</NavLink>
                <NavLink to="/suppliers">Suppliers</NavLink>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0 min-w-0">
            {auth.isAuthenticated && profile ? (
              <>
                
                <button
                  onClick={logout}
                  className="px-4 py-2 text-brick-300 hover:text-brick-100 border border-brick-600 rounded-md hover:bg-brick-700 transition-colors cursor-pointer"
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
