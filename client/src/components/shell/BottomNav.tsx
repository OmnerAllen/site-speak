import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { MAIN_NAV_ITEMS, RESOURCE_NAV_ITEMS } from "../navigation/navigation";

export function BottomNav() {
  const auth = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (!auth.isAuthenticated) return null;

  const isResourceRoute = ["/suppliers", "/materials", "/equipment"].some(
    (p) => pathname.startsWith(p)
  );

  const itemsToRender = isResourceRoute ? RESOURCE_NAV_ITEMS : MAIN_NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-brick-800 bg-brick-950/95 backdrop-blur-md">
      <div className="flex h-16 justify-around items-center px-1">
        {isResourceRoute && (
          <button
            onClick={() => navigate("/")}
            className="flex h-full w-full flex-col items-center justify-center p-2 text-[10px] font-medium leading-tight transition-colors text-brick-200 hover:text-brick-100 cursor-pointer"
          >
            <span className="truncate text-center w-full min-h-[1.25rem] flex items-center justify-center">
              Home
            </span>
          </button>
        )}
        
        {itemsToRender.map((item) => {
          const isActive =
            pathname === item.to ||
            (item.to !== "/" && pathname.startsWith(item.to)) ||
            (item.activePaths?.some((p) => pathname.startsWith(p)) ?? false);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex h-full w-full flex-col items-center justify-center p-2 text-[10px] font-medium leading-tight transition-colors ${
                isActive ? "text-grass-400" : "text-brick-200 hover:text-brick-100"
              }`}
            >
              <span className="truncate text-center w-full min-h-[1.25rem] flex items-center justify-center">
                {item.label === "Resource Management" ? "Resources" : item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
