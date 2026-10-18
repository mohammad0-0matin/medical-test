import React from 'react';

/**
 * Standard React Error Boundary component.
 *
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a graceful fallback UI instead of
 * crashing the entire React tree to a blank white screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'var(--font-sans, inherit)',
            color: 'var(--text-strong, #0f172a)',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: 'var(--bg-surface, #ffffff)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: '16px',
              padding: '2.5rem 2rem',
              boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.08))',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">
              🩺
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              مشکلی در بارگذاری این بخش رخ داد
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.7, marginBottom: '1.75rem' }}>
              سامانه سلامت‌یار در پردازش اطلاعات با خطای موقت مواجه شد. لطفاً صفحه را بارگذاری مجدد نمایید.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '0.65rem 1.4rem',
                  backgroundColor: 'var(--brand-primary, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                بارگذاری مجدد صفحه
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '0.65rem 1.4rem',
                  backgroundColor: 'var(--bg-subtle, #f1f5f9)',
                  color: 'var(--text-strong, #0f172a)',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                تلاش مجدد
              </button>
            </div>

            {import.meta.env?.DEV && this.state.error && (
              <details
                style={{
                  marginTop: '1.5rem',
                  textAlign: 'left',
                  direction: 'ltr',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  color: '#991b1b',
                  overflowX: 'auto',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Error Details (Dev mode)</summary>
                <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
