import React, { useEffect } from 'react';

export default function NextScript({ id, src, strategy, dangerouslySetInnerHTML, ...props }) {
  useEffect(() => {
    if (!src && !dangerouslySetInnerHTML) return;
    
    const script = document.createElement('script');
    if (id) script.id = id;
    if (src) script.src = src;
    if (dangerouslySetInnerHTML) {
      script.innerHTML = dangerouslySetInnerHTML.__html;
    }
    
    Object.keys(props).forEach(key => {
      script.setAttribute(key, props[key]);
    });
    
    document.body.appendChild(script);
    
    return () => {
      if (id && document.getElementById(id)) {
        // Optional: cleanup script
      }
    };
  }, [src, id, dangerouslySetInnerHTML, props]);
  
  return null;
}
