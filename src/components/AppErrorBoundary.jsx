import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="page-shell">
      <section className="panel">
        <div className="panel-title">Symbiosis could not finish loading</div>
        <div className="panel-body">
          <p>Refresh once. If this continues, copy the error below:</p>
          <code>{this.state.error.message}</code>
        </div>
      </section>
    </main>;
  }
}
