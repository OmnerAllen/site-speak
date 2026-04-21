import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { ErrorFallback } from "./components/shell/ErrorFallback";
import {Toaster} from 'react-hot-toast';
import Layout from "./components/shell/Layout";
import Login from "./pages/other/Login";
import Dashboard from "./pages/other/Dashboard";
import Projects from "./pages/projects/Projects";
import ProjectDetailsPage from "./pages/projects/ProjectDetails";
import Materials from "./pages/resource-management/Materials";
import EquipmentPage from "./pages/resource-management/Equipment";
import Suppliers from "./pages/resource-management/Suppliers";
import EmployeesPage from "./pages/employees/Employees";
import WorkLogsPage from "./pages/employees/WorkLogs";
import ProjectSchedulePage from "./pages/projects/ProjectSchedule";
import { usePageTelemetry, logFrontendError } from "./telemetry/usePageTelemetry";

function PageTelemetry() {
  usePageTelemetry();
  return null;
}

export default function App() {
  return (
    <Layout>
      <PageTelemetry />
      <Toaster />
      <ErrorBoundary 
        FallbackComponent={ErrorFallback}
        onError={(error, info) => logFrontendError(error, { componentStack: info?.componentStack, source: 'error-boundary' })}
      >
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
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/new"
              element={
                <ProtectedRoute>
                  <ProjectDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule"
              element={
                <ProtectedRoute>
                  <ProjectSchedulePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/work-logs"
              element={
                <ProtectedRoute>
                  <WorkLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/materials"
              element={
                <ProtectedRoute>
                  <Materials />
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipment"
              element={
                <ProtectedRoute>
                  <EquipmentPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <Suppliers />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
