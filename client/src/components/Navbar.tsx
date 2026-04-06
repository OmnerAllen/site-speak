import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { useUser } from "../auth/useUser";
import { TabNav, type NavItem } from "./TabNav";

const MAIN_NAV_ITEMS: NavItem[] = [
  { to: "/projects", label: "Projects" },
  { to: "/schedule", label: "Schedule" },
  { to: "/employees", label: "Employees" },
  { to: "/suppliers", label: "Resource Management", activePaths: ["/materials", "/equipment"] },
];

export interface NavbarProps {
  items?: NavItem[];
}

export function Navbar({ items = MAIN_NAV_ITEMS }: NavbarProps) {
  const auth = useAuth();
  const { profile } = useUser();

  const logout = () => {
    document.cookie = "id_token=; path=/; max-age=0";
    auth.signoutRedirect({ post_logout_redirect_uri: window.location.origin });
  };

  return (
    <nav className="border-b border-brick-800 bg-brick-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-lg font-bold text-grass-400 tracking-tight"
          >
            Site Speak
          </Link>
          {auth.isAuthenticated && items.length > 0 && (
            <TabNav items={items} className="hidden sm:flex gap-1" />
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0 min-w-0">
          {auth.isAuthenticated && profile ? (
            <button
              onClick={logout}
              className="px-4 py-2 text-brick-300 hover:text-brick-100 border border-brick-600 rounded-md hover:bg-brick-700 transition-colors cursor-pointer"
            >
              Log out
            </button>
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
  );
}