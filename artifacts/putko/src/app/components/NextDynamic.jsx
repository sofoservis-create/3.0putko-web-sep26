import React, { lazy, Suspense } from 'react';

export default function dynamic(importFunc, options = {}) {
  const LazyComponent = lazy(importFunc);
  
  return function DynamicComponent(props) {
    return (
      <Suspense fallback={options.loading ? <options.loading /> : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
