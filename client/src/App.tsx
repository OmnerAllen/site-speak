import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Projects from "./pages/Projects";
import CustomForms from "./pages/CustomForms";

export default function App() {
  return (
    <Layout>
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
      </Routes>
    </Layout>
  );
}
