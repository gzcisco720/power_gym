'use client';
import { useState } from 'react';

export function TestClientComp() {
  const [val] = useState('client here');
  return <span>{val}</span>;
}
