import { Routes, Route } from "react-router-dom";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import CustomForms from "./pages/CustomForms";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Companies />} />
      <Route path="/companies/:id" element={<CompanyDetail />} />
      <Route path="/custom-forms" element={<CustomForms />} />
    </Routes>
  );
}
