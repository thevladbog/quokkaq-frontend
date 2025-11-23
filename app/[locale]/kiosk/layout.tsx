'use client';

import { ReactNode } from 'react';

export default function KioskLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>{children}</>
  );
}