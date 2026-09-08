import { Inter, Playfair_Display, Poppins, DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from './context/AuthContext.js'
import { ToastContainer } from "./Nexttoast";
import { FormProvider } from './FormContext';
import Script from "next/script";

import dynamic from "next/dynamic";

const CrispChat = dynamic(() => import("./Shared/CrispChat"), {
  ssr: false,
});

const MetaPixel = dynamic(() => import("./components/MetaPixel"), {
  ssr: false,
});

// Google Fonts setup with all weights
// Inter supports 100–900
const inter = Inter({ subsets: ["latin"], weight: ["400","500","600","700","800","900"], display: 'swap', variable: '--font-inter' });

// Playfair_Display supports 400–900
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400","500","600","700","800","900"], display: 'swap', variable: '--font-playfair' });

// Poppins supports 100–900
const poppins = Poppins({ subsets: ["latin"], weight: ["400","500","600","700","800","900"], display: 'swap', variable: '--font-poppins' });

// DM Sans supports 400, 500, 700
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400","500","700"], display: 'swap', variable: '--font-dmsans' });

// Fraunces supports 100–900
const fraunces = Fraunces({ subsets: ["latin"], weight: ["400","500","600","700","800","900"], display: 'swap', variable: '--font-fraunces' });

export const metadata = {
  title: "Putko",
  description: "Hotel and Apartment Booking Website",
};

export default function RootLayout({ children, pageProps }) {
  return (
    <html lang="en">
       <head>
        <Script
          id="microsoft-clarity"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "rq26savlme");
            `
          }}
        />
        <meta name="facebook-domain-verification" content="jnvl0hzx85r1pzgkaes6eyou6h9tqo" />
      </head>

      <body className={`${inter.variable} ${playfair.variable} ${poppins.variable} ${dmSans.variable} ${fraunces.variable}`}>
         <MetaPixel />
        <AuthContextProvider>
        <FormProvider {...pageProps}>
          {/* <Header/> */}
            {children }
            <ToastContainer
              theme="dark"
              position="top-right"
              autoClose={5000}
              closeOnClick
              pauseOnHover={false}
            />
            </FormProvider>
          {/* <Footer/> */}
        </AuthContextProvider>
        <CrispChat />
      </body>
      
    </html>
  );
}
