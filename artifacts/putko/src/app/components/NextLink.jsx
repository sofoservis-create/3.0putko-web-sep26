import React from 'react';
import { Link } from 'wouter';

export default function NextLink(props) {
  const { href, as, replace, scroll, shallow, passHref, prefetch, locale, legacyBehavior, ...rest } = props;
  // Wouter Link uses href or to. 
  // It doesn't render an <a> inside automatically unless we just return it as a wrapper.
  // Wait, wouter Link IS an a tag. So we just pass props directly.
  return <Link href={href || as} {...rest} />;
}
