import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info)
  }
  reset = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0b0b0b', color: '#fff', padding: 24 }}>
          <h2 style={{ color: '#f87171' }}>Something went wrong.</h2>
          <p>Please refresh the page or try again. The error has been logged for diagnosis.</p>
          <button type="button" onClick={this.reset} style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}>
            Reload Novarix
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
