import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import AppRoutes from './AppRoutes';

import { AuthContextProvider } from './app/context/AuthContext.jsx';
import { FormProvider } from './app/FormContext.jsx';
import { ToastContainer } from './app/Nexttoast.jsx';
import dynamic from '@/app/components/NextDynamic';

import './index.css';
import './app/globals.css';

const queryClient = new QueryClient();

const CrispChat = dynamic(() => import("./app/Shared/CrispChat"), { ssr: false });
const MetaPixel = dynamic(() => import("./app/components/MetaPixel"), { ssr: false });

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <RoutedErrorBoundary>
            <AuthContextProvider>
              <FormProvider>
                <AppRoutes />
                <ToastContainer
                  theme="dark"
                  position="top-right"
                  autoClose={5000}
                  closeOnClick
                  pauseOnHover={false}
                />
              </FormProvider>
            </AuthContextProvider>
            <CrispChat />
            <MetaPixel />
          </RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
