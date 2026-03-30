import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { oidcConfig } from "./auth/oidcConfig";
import { UserProvider } from "./auth/UserContext";
import { createQueryClient } from "./error/globalQueryErrorHandling";
import "./index.css";
import App from "./App";

const queryClient = createQueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <UserProvider>
            <App />
          </UserProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
);
