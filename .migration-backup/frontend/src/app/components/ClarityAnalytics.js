"use client";

// Microsoft Clarity, behind the analytics consent gate.
//
// This used to be an inline <Script> in the root layout with no gate at all, so
// every visitor was session-recorded from first paint. Session recording is
// among the most intrusive analytics there is; it needs prior opt-in.

import Script from "next/script";
import { useConsent } from "./CookieConsent";

const CLARITY_PROJECT_ID = "rq26savlme";

export default function ClarityAnalytics() {
  const consent = useConsent();

  if (!consent?.analytics) return null;

  return (
    <Script
      id="microsoft-clarity"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
        `,
      }}
    />
  );
}
