import React, { lazy, Suspense, useContext, useEffect } from 'react';
import { Route, Switch } from 'wouter';
import RouteMetadata from './app/components/RouteMetadata';
import ProtectedRoute from './app/ProtectedRoute';
import { AuthContext } from './app/context/AuthContext';
import { useRouter } from './app/components/NextNavigation';
import { HostNavigationProvider, useHostNavigation } from './app/host/HostNavigationGuard';
import LeaveEditorDialog from './app/host-preview/components/editor/LeaveEditorDialog';
import { FormContext } from './app/FormContext';

const Home = lazy(() => import('./app/page.jsx'));
const About = lazy(() => import('./app/About/page.jsx'));
const AdminLogin = lazy(() => import('./app/Admin-Login/page.jsx'));
const Admin = lazy(() => import('./app/Admin/page.jsx'));
const BlogDetail = lazy(() => import('./app/Blog-Detail/[slug]/page.jsx'));
const Blog = lazy(() => import('./app/Blog/page.jsx'));
const Booking = lazy(() => import('./app/Booking/page.jsx'));
const BookNow = lazy(() => import('./app/book-now/page.jsx'));
const CheckingLogDetail = lazy(() => import('./app/Checking-log-Detail/page.jsx'));
const Checkout = lazy(() => import('./app/Checkout/page.jsx'));
const ErrorPage = lazy(() => import('./app/Error/page.jsx'));
const FAQ = lazy(() => import('./app/FAQ/page.jsx'));
const ForgetPassword = lazy(() => import('./app/Forget-Password/page.jsx'));
const HostDetail = lazy(() => import('./app/host-detail/[id]/page.jsx'));
const HostOnboardRefresh = lazy(() => import('./app/host/onboard/refresh/page.jsx'));
const HostOnboardSuccess = lazy(() => import('./app/host/onboard/success/page.jsx'));
const ListingsDetails = lazy(() => import('./app/listings/[details]/page.jsx'));
const TestListing = lazy(() => import('./app/testlisting/page.jsx'));
const ListingStayMap = lazy(() => import('./app/listing-stay-map/page.jsx'));
const Login = lazy(() => import('./app/login/page.jsx'));
const PaymentCancel = lazy(() => import('./app/payment-cancel/page.jsx'));
const PaymentSuccess = lazy(() => import('./app/payment-success/page.jsx'));
const PayPage = lazy(() => import('./app/PayPage/page.jsx'));
const PrivacyPolicy = lazy(() => import('./app/Privacy-Policy/page.jsx'));
const Account = lazy(() => import('./app/guest/page.jsx'));
const HostWorkspace = lazy(() => import('./app/host/page.jsx'));
const RequestSent = lazy(() => import('./app/request-sent/page.jsx'));
const Reservations = lazy(() => import('./app/reservations/page.jsx'));
const ResetPasswordToken = lazy(() => import('./app/reset-password/[token]/page.jsx'));
const ReviewId = lazy(() => import('./app/Review/[id]/page.jsx'));
const Signup = lazy(() => import('./app/Signup/page.jsx'));
const TermsAndCondition = lazy(() => import('./app/Terms-&-Condition/page.jsx'));
const UserGuide = lazy(() => import('./app/User-Guide/page.jsx'));
const VerifyEmail = lazy(() => import('./app/VerifyEmail/page.jsx'));
const VerifyEmailRoleToken = lazy(() => import('./app/verify-email/[role]/[token]/page.jsx'));

// We should also include the RootLayout equivalent here if we want AuthProvider etc.
// But for now let's just map routes.

function Fallback() {
  return <div className="flex h-screen items-center justify-center">Loading...</div>;
}

function LegacyAccountRedirect() {
  const { token, role, loading } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.push(token && role === "host" ? "/host" : "/account");
  }, [loading, router, role, token]);

  return <Fallback />;
}

function LegacyHostRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Replace so the legacy entry does not trap browser Back.
    router.replace("/host");
  }, [router]);

  return <Fallback />;
}

function ProtectedHostOnboardRefreshRoute() {
  return (
    <ProtectedRoute allowedRoles={["host"]}>
      <HostOnboardRefresh />
    </ProtectedRoute>
  );
}

function ProtectedHostOnboardSuccessRoute() {
  return (
    <ProtectedRoute allowedRoles={["host"]}>
      <HostOnboardSuccess />
    </ProtectedRoute>
  );
}

// While the Host editor holds unsaved changes, a URL change it does not own
// (browser Back to /account, etc.) is held here so the editor stays mounted
// until the host saves, discards, or stays. See HostNavigationGuard.
function GuardedSwitch({ children }) {
  const { shownPath } = useHostNavigation();
  const [pathname] = shownPath.split('?');
  return <Switch location={pathname}>{children}</Switch>;
}

function LeaveGuardDialog() {
  const nav = useHostNavigation();
  const { lang } = useContext(FormContext);
  return (
    <LeaveEditorDialog
      open={Boolean(nav.pending)}
      language={lang || 'sk'}
      saving={nav.saving}
      saveInFlight={nav.saveInFlight}
      saveError={nav.saveError}
      subject={nav.subject}
      onStay={nav.cancelLeave}
      onDiscard={nav.discardAndLeave}
      onSaveAndLeave={nav.saveAndLeave}
    />
  );
}

export default function AppRoutes() {
  return (
    <HostNavigationProvider>
      <AppRouteTree />
      <LeaveGuardDialog />
    </HostNavigationProvider>
  );
}

function AppRouteTree() {
  return (
    <Suspense fallback={<Fallback />}>
      <RouteMetadata />
      <GuardedSwitch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/admin-login" component={AdminLogin} />
        <Route path="/admin" component={Admin} />
        <Route path="/blog-detail/:slug" component={BlogDetail} />
        <Route path="/blog" component={Blog} />
        <Route path="/booking" component={Booking} />
        <Route path="/book-now" component={BookNow} />
        <Route path="/checking-log-detail" component={CheckingLogDetail} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/error" component={ErrorPage} />
        <Route path="/faq" component={FAQ} />
        <Route path="/forget-password" component={ForgetPassword} />
        <Route path="/host-detail/:id" component={HostDetail} />
        <Route path="/host/onboard/refresh" component={ProtectedHostOnboardRefreshRoute} />
        <Route path="/host/onboard/success" component={ProtectedHostOnboardSuccessRoute} />
        <Route path="/testlisting" component={TestListing} />
        <Route path="/listings/:details" component={ListingsDetails} />
        <Route path="/listing-stay-map" component={ListingStayMap} />
        <Route path="/login" component={Login} />
        <Route path="/payment-cancel" component={PaymentCancel} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route path="/paypage" component={PayPage} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/account" component={Account} />
        <Route path="/host/*?" component={HostWorkspace} />
        <Route path="/guest" component={LegacyAccountRedirect} />
        <Route path="/profile" component={LegacyAccountRedirect} />
        <Route path="/host-preview" component={LegacyHostRedirect} />
        <Route path="/request-sent" component={RequestSent} />
        <Route path="/reservations" component={Reservations} />
        <Route path="/reset-password/:token" component={ResetPasswordToken} />
        <Route path="/review/:id" component={ReviewId} />
        <Route path="/signup" component={Signup} />
        <Route path="/terms-&-condition" component={TermsAndCondition} />
        <Route path="/user-guide" component={UserGuide} />
        <Route path="/verifyemail" component={VerifyEmail} />
        <Route path="/verify-email/:role/:token" component={VerifyEmailRoleToken} />
        <Route>
          <div className="flex h-screen items-center justify-center">404 Not Found</div>
        </Route>
      </GuardedSwitch>
    </Suspense>
  );
}
