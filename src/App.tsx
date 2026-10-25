import React, { useEffect, useState } from 'react';
import { MonumentLanding } from './seer-2026/designs/monument/MonumentLanding';
import { ProductShell, type ProductId } from './products/shared/ProductShell';

const PRODUCTS: Record<string, ProductId> = {
  '/explorer': 'explorer',
  '/deep': 'deep',
  '/futarchy': 'futarchy',
  '/opportunity': 'opportunity',
  '/risk': 'risk',
};

function productFor(pathname: string): ProductId | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean.startsWith('/opportunity/')) return 'opportunity';
  return PRODUCTS[clean] ?? null;
}

export const App: React.FC = () => {
  const [product, setProduct] = useState<ProductId | null>(() => productFor(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setProduct(productFor(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return product ? <ProductShell product={product} /> : <MonumentLanding />;
};
