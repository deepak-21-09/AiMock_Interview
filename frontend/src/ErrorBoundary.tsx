import React from 'react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#020617', color: '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', fontFamily: 'monospace',
        }}>
          <div style={{ maxWidth: 720 }}>
            <h1 style={{ color: '#f87171', marginBottom: '1rem' }}>⚠ Runtime Error</h1>
            <pre style={{
              background: '#0f172a', padding: '1rem', borderRadius: '0.5rem',
              overflowX: 'auto', fontSize: '0.85rem', color: '#fca5a5',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
