// StatusTag 组件测试 —— 验证域名状态与启停状态的标签渲染
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { DomainStatusTag, ActiveStatusTag } from '@/components/StatusTag';

describe('DomainStatusTag', () => {
  it('status=1 渲染"新增"', () => {
    renderWithProviders(<DomainStatusTag status={1} />);
    expect(screen.getByText('新增')).toBeInTheDocument();
  });

  it('status=2 渲染"投产"', () => {
    renderWithProviders(<DomainStatusTag status={2} />);
    expect(screen.getByText('投产')).toBeInTheDocument();
  });

  it('status=3 渲染"下线"', () => {
    renderWithProviders(<DomainStatusTag status={3} />);
    expect(screen.getByText('下线')).toBeInTheDocument();
  });
});

describe('ActiveStatusTag', () => {
  it('status=1 渲染"启用"', () => {
    renderWithProviders(<ActiveStatusTag status={1} />);
    expect(screen.getByText('启用')).toBeInTheDocument();
  });

  it('status=2 渲染"停用"', () => {
    renderWithProviders(<ActiveStatusTag status={2} />);
    expect(screen.getByText('停用')).toBeInTheDocument();
  });
});
