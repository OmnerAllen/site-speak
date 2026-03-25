import type { AuthProviderProps } from "react-oidc-context";

export const oidcConfig: AuthProviderProps = {
  authority: "https://auth.snowse-ts.duckdns.org/realms/frontend",
  client_id: "site-speak",
  redirect_uri: window.location.origin,
  scope: "openid email profile",
  onSigninCallback: () => {
    console.log("onSigninCallback: we are about to replace the state");
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};
