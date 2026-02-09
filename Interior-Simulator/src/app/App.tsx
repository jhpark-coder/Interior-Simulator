import { AppRoutes } from "./routes";
import { ErrorBoundary } from "../shared/ui/ErrorBoundary";
import { ToastHost } from "../shared/ui/ToastHost";

export function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
      <ToastHost />
    </ErrorBoundary>
  );
}
