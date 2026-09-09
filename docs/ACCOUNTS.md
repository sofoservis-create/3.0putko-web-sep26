# Guest account and host area

Two areas, one shell, one identity model. This replaces `/Profile` and
`/reservations` in the old system, which were separate products that
happened to share a domain.

## What the old ones do

Read from `.migration-backup/`, not assumed.

### `/Profile` — host only, one URL, 12 744 lines

| | |
|---|---|
| Route | One. `activePage === "Payments" && <Payments/>`, 13 panels toggled by client state (`Profile/page.js:282–293`) |
| Guests | Cannot enter it at all — `allowedRoles={["host"]}` (`page.js:160`) |
| Identity | `JSON.parse(localStorage.getItem("user"))._id` (`page.js:93–94`, plus 4 components) |
| Rendering | Every panel `dynamic(..., { ssr: false })` — nothing server-rendered |
| Nav | 11 items, every one `href: "#"` |
| Largest file | `AddAccommodation.js`, **3 708 lines** |

Because there is one URL, nothing is linkable, the back button does nothing,
and no section can be opened from an email, a bookmark or a support ticket.

### `/reservations` — the guest "account", and a data breach

```js
const [isAuthenticated, setIsAuthenticated] = useState(false);
if (!isAuthenticated) return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
return <ReservationList />;   // fetches GET /api/reservation — unfiltered
```

`ReservationList` fetches **every reservation on the platform** and renders
`res.email` and `res.phone` in a table (`reservations/page.js:314–315`).
There is no filter by user anywhere in the file. The gate is a React
`useState`, so the data is public regardless of it.

**Every guest can read every other guest's name, email and phone number.**
That is a personal-data breach under GDPR, not a rendering bug.

## What replaces them

```
/prihlasenie          login
/ucet                 guest — prehľad
/ucet/rezervacie      guest — moje rezervácie
/ucet/profil          osobné údaje  (shared by both roles)
/host                 host — prehľad
/host/rezervacie      host — rezervácie
/host/ubytovania      host — moje ubytovania
```

Real routes, one per section, server-rendered.

### Identity comes from the server

`app/_lib/session.ts` resolves the caller from an **httpOnly** cookie joined
to a session row. The page never handles a user id it could substitute —
which is the shape of audit finding C-01, where
`POST /api/auth/change-password` takes the target account's id in the body
and changes anyone's password.

Verified in a real browser:

```
anon /ucet          -> /prihlasenie?next=%2Fucet
guest landed on     -> /ucet
guest /host         -> /ucet?nie-ste-ubytovatel=1     (server-side gate)
host landed on      -> /host
session cookie      -> httpOnly: true  sameSite: Lax
document.cookie sees it: false
wrong password  : "Nesprávny e-mail alebo heslo."
unknown account : "Nesprávny e-mail alebo heslo."
messages identical: true
```

The last two matter: distinguishing them turns the login form into an
account-existence oracle. An unknown account still runs a scrypt comparison
against a dummy hash, so the *timing* does not answer the question either.

### Queries cannot return someone else's row

Every function in `lib/db/src/queries/account.ts` takes the caller's identity
and filters by it in SQL. There is no "all reservations" function to call by
mistake. `getHostReservations` also does not select `guest_email` or
`guest_phone` — a host needs a name and a date, not a contact list.

### Auth primitives exist once

`lib/auth` — scrypt, `timingSafeEqual`, SHA-256 session-token hashing. This
is the scheme from `artifacts/api-server/src/routes/test-auth.ts` extracted
rather than rewritten, byte-compatible, so accounts work on both sides. Two
implementations of "is this password correct" is one too many.

Sessions are stored hashed: the row holds `sha256(token)`, the token exists
only in the cookie. A leaked database dump does not hand anyone a working
session.

### Host area: 4 nav items, not 11

The old nav has Overview, Reservation requests, My public profile, Add new
accommodation, Booking calendar, Calendar synchronization, Manage listing,
Personal profile, Change password, User guide, Payments, Messages. Several
are the same thing twice ("Add new accommodation" / "Manage listing"; "My
public profile" / "Personal profile"), and a *User guide* inside the nav is
a sign the nav needs explaining.

Calendar sync, payouts and messages become routes when their features do. An
empty tab teaches people the product is broken.

### One thing the old dashboard never tells a host

A published listing with no coordinates is **invisible** — in no destination,
in no distance search. It looks live from the inside and does not exist from
the outside. `/host` and `/host/ubytovania` say so, first, in amber.

## Deliberately not built yet

- **Editing personal data / changing password.** Needs email re-verification
  (the address decides which bookings the account can see) and a
  current-password check. Shipping the form before those checks reproduces
  audit C-01 exactly.
- **Registration, host onboarding, Stripe payouts, calendar sync, messages.**
  Later phases. The pages say so rather than showing dead buttons.
- **podnikateľ/nepodnikateľ badge.** The declaration is not modelled in the
  schema yet, so the listing page shows nothing rather than a wrong legal
  claim.

## Demo access (development only)

`pnpm run seed:demo-accounts` in `lib/db`. Fictional people, and it refuses
`NODE_ENV=production`.
