"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * React 错误边界
 *
 * 作用：任何一个子组件渲染时抛错，不会把整个页面炸成白屏，
 * 而是退化成一块可恢复的提示区。
 *
 * 注意：Error Boundary 必须是 class 组件——
 * 这是 React 目前唯一支持 componentDidCatch 的写法，
 * 项目其余部分仍统一用函数组件。
 */

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-ink/10 p-10 text-center">
        <div className="text-4xl mb-4">🌫️</div>
        <h3 className="text-lg font-bold mb-2">
          {this.props.fallbackTitle || "山上起雾了"}
        </h3>
        <p className="text-sm text-ink/60 mb-6 leading-relaxed">
          这一块内容没能展开。你的对话记录仍然保存在本地，不会丢失。
        </p>
        <button onClick={this.handleRetry} className="btn-secondary">
          重新加载这一块
        </button>
      </div>
    );
  }
}
