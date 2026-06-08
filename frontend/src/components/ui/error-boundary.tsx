// ============================================================
//  src/components/ui/error-boundary.tsx
//  Error Boundary generico: se un componente figlio lancia
//  un'eccezione (anche durante l'import lazy di una libreria
//  problematica come recharts), mostra un fallback invece di
//  far diventare bianca tutta la pagina.
// ============================================================

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Lasciamo traccia in console per il debug, ma non blocchiamo la UI.
    console.error("ErrorBoundary ha catturato un errore:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-lg border border-foreground/10 bg-card/50 p-4 text-sm text-muted-foreground">
            Questa sezione non è disponibile al momento.
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
