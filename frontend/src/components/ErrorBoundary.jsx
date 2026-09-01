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
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0b0b0b', color: '#fff', padding: 24 }}>
          <h2 style={{ color: '#f87171' }}>Something went wrong.</h2>
          <p>Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
