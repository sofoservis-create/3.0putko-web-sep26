import {
  accommodationCompletion,
  type AccommodationData,
  type AccommodationStatus,
} from "./test-host-accommodation.ts";
import {
  calendarChoiceOf,
  calendarFeedsOf,
  dateToDayNumber,
} from "./test-host-calendar.ts";
import { payoutReadiness, type PayoutReadiness } from "./test-host-profile.ts";
import { findStayConflicts, stageOf, type StayConflict } from "./test-host-reservation.ts";

/**
 * The Today dashboard is an aggregation over the other Host modules. This
 * file only derives — it never stores anything of its own — so every number
 * on the dashboard can be traced back to the module that owns the data:
 * listings (setup), reservations (requests), calendar (conflicts and feed
 * failures), messages (unread threads) and payouts (readiness).
 */

export type DashboardListing = {
  id: string;
  status: AccommodationStatus;
  data: AccommodationData;
  updatedAt: Date;
};

export type DashboardReservation = {
  id: string;
  accommodationId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: "requested" | "accepted" | "declined" | "cancelled";
  createdAt: Date;
};

export type DashboardBlock = {
  accommodationId: string;
  startDate: string;
  endDate: string;
  source: "manual" | "feed" | "reservation";
  note: string | null;
};

export type DashboardFeedStatus = {
  accommodationId: string;
  feedId: string;
  url: string;
  status: "never" | "ok" | "failed";
  lastError: string | null;
  lastAttemptAt: Date | null;
  lastFetchedAt: Date | null;
};

export type DashboardConversation = {
  id: string;
  accommodationId: string;
  reservationId: string | null;
  guestName: string;
  lastMessageAt: Date;
  unreadCount: number;
};

export type DashboardInputs = {
  today: string;
  listings: DashboardListing[];
  reservations: DashboardReservation[];
  blocks: DashboardBlock[];
  feedStatuses: DashboardFeedStatus[];
  conversations: DashboardConversation[];
};

export type ListingRef = { id: string; name: string | null; status: AccommodationStatus };

export type DashboardSummary = {
  today: string;
  generatedAt: string;
  setup: {
    counts: { total: number; draft: number; ready: number; live: number };
    /** Listings that are not live yet, most recently edited first. */
    items: Array<{
      listing: ListingRef;
      kind: "draft" | "ready";
      completionPercent: number;
      /** Server requirement keys still missing (empty for READY). */
      missingRequirements: string[];
    }>;
  };
  requests: {
    count: number;
    /** Oldest request first: the guest who waited longest is on top. */
    items: Array<{
      id: string;
      listing: ListingRef;
      guestName: string;
      checkIn: string;
      checkOut: string;
      createdAt: string;
      /** Nights already taken by something else, so accepting would fail. */
      conflicts: StayConflict[];
    }>;
  };
  calendar: {
    /** Accepted stays whose nights are also blocked by a manual block or an import. */
    conflicts: Array<{
      listing: ListingRef;
      reservationId: string;
      guestName: string;
      checkIn: string;
      checkOut: string;
      conflicts: StayConflict[];
    }>;
    /** Connected feeds whose last fetch failed. */
    feedFailures: Array<{
      listing: ListingRef;
      feedId: string;
      label: string;
      lastError: string | null;
      lastAttemptAt: string | null;
      /** Dates from an earlier successful fetch are still in use. */
      hasImportedDates: boolean;
    }>;
  };
  messages: {
    unreadConversations: number;
    unreadMessages: number;
    /** Threads with unread guest messages, most recent first. */
    items: Array<{
      id: string;
      listing: ListingRef;
      reservationId: string | null;
      guestName: string;
      unreadCount: number;
      lastMessageAt: string;
    }>;
  };
  payouts: {
    readiness: PayoutReadiness;
    /** Set when live listings exist without a way to be paid. */
    blocker: { liveListings: number } | null;
  };
};

const listingRef = (listing: DashboardListing): ListingRef => {
  const name = listing.data?.name;
  return {
    id: listing.id,
    name: typeof name === "string" && name.trim() ? name.trim() : null,
    status: listing.status,
  };
};

/** The full summary from module data already loaded for one host. */
export const buildDashboardSummary = (inputs: DashboardInputs): DashboardSummary => {
  const { today } = inputs;
  const listingsById = new Map(inputs.listings.map((listing) => [listing.id, listing]));
  const refOf = (accommodationId: string): ListingRef | null => {
    const listing = listingsById.get(accommodationId);
    return listing ? listingRef(listing) : null;
  };

  /* ---------------------------------------------------------------- setup */
  const counts = { total: inputs.listings.length, draft: 0, ready: 0, live: 0 };
  const setupItems: DashboardSummary["setup"]["items"] = [];
  for (const listing of [...inputs.listings].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())) {
    if (listing.status === "LIVE") counts.live += 1;
    else if (listing.status === "READY") counts.ready += 1;
    else counts.draft += 1;
    if (listing.status === "LIVE") continue;
    const completion = accommodationCompletion(listing.data);
    setupItems.push({
      listing: listingRef(listing),
      kind: listing.status === "READY" ? "ready" : "draft",
      completionPercent: completion.completionPercent,
      missingRequirements: completion.missingRequirements,
    });
  }
  // READY listings first (one tap from being live), then drafts.
  setupItems.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "ready" ? -1 : 1));

  /* ----------------------------------------------- requests and conflicts */
  const blocksByAccommodation = new Map<string, DashboardBlock[]>();
  for (const block of inputs.blocks) {
    const list = blocksByAccommodation.get(block.accommodationId) ?? [];
    list.push(block);
    blocksByAccommodation.set(block.accommodationId, list);
  }
  const acceptedByAccommodation = new Map<string, DashboardReservation[]>();
  for (const reservation of inputs.reservations) {
    if (reservation.status !== "accepted") continue;
    const list = acceptedByAccommodation.get(reservation.accommodationId) ?? [];
    list.push(reservation);
    acceptedByAccommodation.set(reservation.accommodationId, list);
  }
  const conflictsOf = (reservation: DashboardReservation) => {
    const listing = listingsById.get(reservation.accommodationId);
    const connected = listing ? calendarChoiceOf(listing.data) === "connect" : false;
    return findStayConflicts(
      reservation,
      acceptedByAccommodation.get(reservation.accommodationId) ?? [],
      blocksByAccommodation.get(reservation.accommodationId) ?? [],
      connected,
    );
  };

  const requestItems: DashboardSummary["requests"]["items"] = [];
  const calendarConflicts: DashboardSummary["calendar"]["conflicts"] = [];
  const todayNumber = dateToDayNumber(today);
  for (const reservation of inputs.reservations) {
    const listing = refOf(reservation.accommodationId);
    if (!listing) continue;
    const stage = stageOf(reservation, today);
    if (stage === "request") {
      requestItems.push({
        id: reservation.id,
        listing,
        guestName: reservation.guestName,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        createdAt: reservation.createdAt.toISOString(),
        conflicts: conflictsOf(reservation),
      });
    } else if (stage === "upcoming" || stage === "active") {
      // Nights already slept through cannot be double-booked any more.
      const conflicts = conflictsOf(reservation).filter(
        (conflict) => dateToDayNumber(conflict.endDate) >= todayNumber,
      );
      if (conflicts.length > 0) {
        calendarConflicts.push({
          listing,
          reservationId: reservation.id,
          guestName: reservation.guestName,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          conflicts,
        });
      }
    }
  }
  requestItems.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  calendarConflicts.sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  /* -------------------------------------------------------- feed failures */
  const feedFailures: DashboardSummary["calendar"]["feedFailures"] = [];
  for (const status of inputs.feedStatuses) {
    if (status.status !== "failed") continue;
    const listing = listingsById.get(status.accommodationId);
    if (!listing || calendarChoiceOf(listing.data) !== "connect") continue;
    // A status row for a URL the host has since changed is stale and is
    // dropped by the calendar API on its next read; never alert on it.
    const feed = calendarFeedsOf(listing.data).find((entry) => entry.id === status.feedId && entry.url === status.url);
    if (!feed) continue;
    feedFailures.push({
      listing: listingRef(listing),
      feedId: feed.id,
      label: feed.label,
      lastError: status.lastError,
      lastAttemptAt: status.lastAttemptAt?.toISOString() ?? null,
      hasImportedDates: Boolean(status.lastFetchedAt),
    });
  }

  /* ------------------------------------------------------------- messages */
  let unreadMessages = 0;
  const messageItems: DashboardSummary["messages"]["items"] = [];
  for (const conversation of inputs.conversations) {
    if (conversation.unreadCount <= 0) continue;
    const listing = refOf(conversation.accommodationId);
    if (!listing) continue;
    unreadMessages += conversation.unreadCount;
    messageItems.push({
      id: conversation.id,
      listing,
      reservationId: conversation.reservationId,
      guestName: conversation.guestName,
      unreadCount: conversation.unreadCount,
      lastMessageAt: conversation.lastMessageAt.toISOString(),
    });
  }
  messageItems.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  /* -------------------------------------------------------------- payouts */
  const readiness = payoutReadiness(inputs.listings);
  const payoutBlocker =
    readiness.listings.live > 0 && readiness.status !== ("ready" as string)
      ? { liveListings: readiness.listings.live }
      : null;

  return {
    today,
    generatedAt: new Date().toISOString(),
    setup: { counts, items: setupItems },
    requests: { count: requestItems.length, items: requestItems },
    calendar: { conflicts: calendarConflicts, feedFailures },
    messages: {
      unreadConversations: messageItems.length,
      unreadMessages,
      items: messageItems,
    },
    payouts: { readiness, blocker: payoutBlocker },
  };
};
