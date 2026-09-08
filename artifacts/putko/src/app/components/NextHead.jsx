import React from 'react';
import { createPortal } from 'react-dom';

export default function NextHead({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.head);
}
