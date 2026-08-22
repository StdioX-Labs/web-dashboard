import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { META_PIXEL_ID } from "@/lib/meta-pixel";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dashboard.soldoutafrica.com"),
  title: {
    default: "SoldOutAfrica Dashboard",
    template: "%s | SoldOutAfrica Dashboard",
  },
  description: "Manage your events, track ticket sales, and grow your audience on SoldOutAfrica.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    url: "https://dashboard.soldoutafrica.com",
    siteName: "SoldOutAfrica Dashboard",
    title: "SoldOutAfrica Dashboard",
    description: "Manage your events, track ticket sales, and grow your audience on SoldOutAfrica.",
    images: [
      {
        url: "/soldoutafrica-white.png",
        alt: "SoldOutAfrica Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@soldoutafrica",
    title: "SoldOutAfrica Dashboard",
    description: "Manage your events, track ticket sales, and grow your audience on SoldOutAfrica.",
    images: ["/soldoutafrica-white.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
        <meta name="format-detection" content="telephone=no"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta charSet="UTF-8"/>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent MetaMask from auto-connecting
              if (typeof window !== 'undefined') {
                window.ethereum = undefined;
                window.web3 = undefined;
              }
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster position="top-center" richColors closeButton />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18374176127"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18374176127');
          `}
        </Script>
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          />
        </noscript>
        <Script id="mixpanel-init" strategy="afterInteractive">
          {`
            (function(e,c){if(!c.__SV){var l,h;window.mixpanel=c;c._i=[];c.init=function(q,r,f){function t(d,a){var g=a.split(".");2==g.length&&(d=d[g[0]],a=g[1]);d[a]=function(){d.push([a].concat(Array.prototype.slice.call(arguments,0)))}}var b=c;"undefined"!==typeof f?b=c[f]=[]:f="mixpanel";b.people=b.people||[];b.toString=function(d){var a="mixpanel";"mixpanel"!==f&&(a+="."+f);d||(a+=" (stub)");return a};b.people.toString=function(){return b.toString(1)+".people (stub)"};l="disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders start_session_recording stop_session_recording people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");for(h=0;h<l.length;h++)t(b,l[h]);var n="set set_once union unset remove delete".split(" ");b.get_group=function(){function d(p){a[p]=function(){b.push([g,[p].concat(Array.prototype.slice.call(arguments,0))])}}for(var a={},g=["get_group"].concat(Array.prototype.slice.call(arguments,0)),m=0;m<n.length;m++)d(n[m]);return a};c._i.push([q,r,f])};c.__SV=1.2;var k=e.createElement("script");k.type="text/javascript";k.async=!0;k.src="undefined"!==typeof MIXPANEL_CUSTOM_LIB_URL?MIXPANEL_CUSTOM_LIB_URL:"file:"===e.location.protocol&&"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\\/\\//)?"https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js":"//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";e=e.getElementsByTagName("script")[0];e.parentNode.insertBefore(k,e)}})(document,window.mixpanel||[]);
            mixpanel.init('61131e698b942ddad0793eb7f8d0d218', {
              autocapture: true,
              record_sessions_percent: 100,
            });
          `}
        </Script>
      </body>
    </html>
  );
}
