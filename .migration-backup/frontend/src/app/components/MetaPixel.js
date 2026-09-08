"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useConsent } from "./CookieConsent";

const TrackPageView = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname, searchParams]);

  return null;
};

const MetaPixel = () => {
  const consent = useConsent();

  useEffect(() => {
    if (window.__META_PIXEL_LOADED__) return;
    window.__META_PIXEL_LOADED__ = true;
  }, []);

  // Nothing is rendered — and therefore fbevents.js is never fetched and no
  // _fbp cookie is written — until the visitor has opted in. Previously this
  // component was mounted unconditionally from the root layout, so the pixel
  // initialised and fired PageView on first paint.
  if (!consent?.marketing) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            if (!window.fbq) {
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');

              fbq('init', '856494620486073');
              fbq('track', 'PageView');
            }
          `,
        }}
      />

      <Suspense fallback={null}>
        <TrackPageView />
      </Suspense>
    </>
  );
};

export default MetaPixel;
