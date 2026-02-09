import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SimulatorPage } from "../features/simulator/SimulatorPage";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SimulatorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
