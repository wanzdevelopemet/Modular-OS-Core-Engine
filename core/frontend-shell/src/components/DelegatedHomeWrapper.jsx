import React from 'react';
import { DelegatedModuleLayout } from '../layouts/DelegatedModuleLayout';

/**
 * DelegatedHomeWrapper: Wrapper chuyển tiếp sang DelegatedModuleLayout
 * Đảm bảo tương thích ngược (Backward Compatibility) cho các module hoặc plugin cũ.
 */
export function DelegatedHomeWrapper({ moduleConfig }) {
  return <DelegatedModuleLayout moduleConfig={moduleConfig} />;
}

export default DelegatedHomeWrapper;
