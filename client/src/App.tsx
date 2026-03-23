import { Routes, Route } from "react-router-dom";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Companies />} />
      <Route path="/companies/:id" element={<CompanyDetail />} />
    </Routes>
  );
}
