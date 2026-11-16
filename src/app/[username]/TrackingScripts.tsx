import Script from "next/script";
import type { PageSettings } from "@/lib/page-extras";

/**
 * The owner's GA4 and Meta Pixel tags (settings.ga4_id / meta_pixel_id). Only on the public route,
 * never in the editor preview. IDs reach this component already format-checked by readSettings
 * (G-XXXX / digits), which is what makes interpolating them into the inline snippets safe.
 */
export function TrackingScripts({ settings }: { settings: PageSettings }) {
  const { ga4_id: ga, meta_pixel_id: px } = settings;
  return (
    <>
      {ga ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="tautan-ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      ) : null}
      {px ? (
        <Script id="tautan-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px}');fbq('track','PageView');`}
        </Script>
      ) : null}
    </>
  );
}
