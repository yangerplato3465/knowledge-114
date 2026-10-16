import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main><h1>畫面暫時無法載入</h1><p role="alert">請重新整理頁面，或回到首頁選擇其他活動。</p><a href={`${import.meta.env.BASE_URL}index.html`}>回到首頁</a></main>;
    return this.props.children;
  }
}
