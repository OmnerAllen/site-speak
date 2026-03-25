import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { ErrorFallback } from "./components/ErrorFallback";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import CustomForms from "./pages/CustomForms";
import CreateSupplier from "./pages/CreateSupplier";

export default function App() {
  return (
    <Layout>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense
          fallback={
            <div className="p-8 text-center text-brick-300 animate-pulse">
              Loading...
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/custom-forms"
              element={
                <ProtectedRoute>
                  <CustomForms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-supplier"
              element={
                <ProtectedRoute>
                  <CreateSupplier />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
