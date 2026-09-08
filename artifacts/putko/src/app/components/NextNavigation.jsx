import { useLocation, useSearch } from 'wouter';

export function useRouter() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  
  return {
    push: (url) => setLocation(url),
    replace: (url) => setLocation(url, { replace: true }),
    prefetch: () => {},
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    pathname: location,
    query: new URLSearchParams(search)
  };
}

export function usePathname() {
  const [location] = useLocation();
  return location;
}

export function useSearchParams() {
  const search = useSearch();
  return new URLSearchParams(search);
}

import { useParams as wouterUseParams } from 'wouter';

export function useParams() {
  return wouterUseParams();
}
export function redirect(url) { window.location.href = url; }
