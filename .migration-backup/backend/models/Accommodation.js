import mongoose from 'mongoose';
import { validateCustomTiers } from '../utils/cancellationPolicy.js';

const accommodationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
    index: true,
  },
  slug: { type: String, required: true, unique: true, index: true, },
  description: {
    type: String
  },
  specialNote: {
    type: String,
    required: false
  },
  // Free-text description shown on the listing page. Kept as-is so existing
  // listings and the current UI are unaffected.
  cancellationPolicy: {
    type: String,
    required: false
  },
  // Machine-readable policy that actually drives refunds. Separate from the
  // free-text field above so no existing data has to be migrated or reinterpreted.
  cancellationPolicyType: {
    type: String,
    enum: ['flexible', 'standard', 'strict', 'custom'],
    default: 'standard',
    index: true,
  },
  // Only meaningful when cancellationPolicyType === 'custom'.
  // Always stored in HOURS before check-in — a 48-hour boundary cannot be
  // expressed precisely in days. Max 3 tiers, sorted descending, last tier
  // must be { hoursBefore: 0, refundPercent: 0 } so no-shows never refund.
  customPolicyTiers: {
    type: [
      {
        _id: false,
        hoursBefore: { type: Number, required: true, min: 0 },
        refundPercent: { type: Number, required: true, min: 0, max: 100 },
      },
    ],
    default: undefined,
  },
  // Legacy single-feed field – kept only for migration. Prefer calendarSync[].
  url: { type: String },
  virtualTourUrl: { type: String },
  propertyType: {
    en: {
      type: String,
      required: true,
      index: true,
      enum: [
        "Nature House", "Wooden House", "Houseboats", "Farm House", "Dome House",
        "Wooden Dome", "Apartment", "Glamping", "Cottages", "Motels/Hostel",
        "Wooden Houses", "Guest Houses", "Secluded Accommodation", "Hotels",
        "Dormitories", "Campsites", "Treehouses", "Rooms", "Entire Homes",
        "Luxury Accommodation"
      ]
    },
    sk: {
      type: String,
      required: true,
      index: true,
      enum: [
        "Prírodný dom", "Drevený dom", "Hausbóty", "Farma", "Kupolový dom",
        "Drevená kupola", "Apartmán", "Glamping", "Chaty", "Motely/Hostely",
        "Drevené domy", "Penzióny", "Odľahlé ubytovanie", "Hotely",
        "Ubytovne", "Kempingy", "Domy na strome", "Izby", "Celé domy",
        "Luxusné ubytovanie"
      ]
    }
  },

  rentalform: {
    en: {
      type: String,
      enum: ["Entire place", "Private room", "Share room"],
      index: true,
    },
    sk: {
      type: String,
      enum: ["Celé miesto", "Súkromná izba", "Zdieľaná izba"],
      index: true,
    },
  },
  excludedDates: {
    type: [Date], // Array of Date objects
    default: [],
  },
  specialPrice: {
    name: { type: String, required: false },
    start: { type: Date, required: false },
    end: { type: Date, required: false },
    price: { type: Number, required: false }
  },
  // Flexible seasonal pricing. Each period covers a date range and holds one or
  // more length-of-stay tiers, e.g. Summer 1-3 nights €120, 4-6 €105, 7+ €95.
  // A tier with maxNights null/absent means "and above". Takes precedence over
  // specialPrice, which itself takes precedence over pricePerNight.
  flexiblePrices: {
    type: [
      {
        _id: false,
        name: { type: String, required: false },
        start: { type: Date, required: false },
        end: { type: Date, required: false },
        note: { type: String, required: false },
        tiers: {
          type: [
            {
              _id: false,
              minNights: { type: Number, required: false, default: 1 },
              maxNights: { type: Number, required: false, default: null },
              price: { type: Number, required: false }
            }
          ],
          default: []
        }
      }
    ],
    default: []
  },
  discount: { type: Number, required: false },
  pricePerNight: { type: Number, required: false },
  pricePerPerson: { type: Number, required: false },
  location: {
    address: { type: String, required: false, index: true },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  acreage: { type: String },
  tags: { type: [String], default: [] },
  nightMin: { type: Number, required: true, index: true },
  nightMax: { type: Number, required: true, index: true },
  beds: { type: Number, index: true },
  singlebed: { type: Number, index: true },
  doublebed: { type: Number, index: true },
  kitchen: { type: Number, index: true },
  WCs: { type: Number, index: true },
  SocialRoom: { type: Number, index: true },
  CommonRoom: { type: Number, index: true },
  LivingRoom: { type: Number, index: true },
  Sofa: { type: Number, index: true },
  bedroom: { type: Number, index: true },
  bathroom: { type: Number, index: true },
  person: { type: Number, required: true, index: true },
  recommended: {
    type: Boolean,
    default: false,
    index: true
  },

  // ── Listing status (Stripe-driven) ───────────────────────────────────────
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'PUBLISHED'],
    default: 'DRAFT',
    index: true,
  },
  stripeAccountId: {
    type: String,
    required: false,
    index: true,
  },
  stripeStatus: {
    type: String,
    enum: ['not_connected', 'pending', 'active', 'restricted'],
    default: 'not_connected',
    index: true,
  },
  stripeRequirements: {
    type: String,
    required: false,
  },
  stripeEnabled: {
    type: Boolean,
    default: true,
    index: true,
  },

  /**
   * Lifecycle, driven by the host's Stripe account — never set by hand.
   *
   *   DRAFT      details saved, no Stripe account linked yet
   *   PENDING    account linked, Stripe still verifying
   *   PUBLISHED  Stripe reports charges_enabled + payouts_enabled
   *
   * Recomputed from the `account.updated` webhook, so a listing goes live the
   * moment its own host finishes onboarding. See utils/listingStatus.js.
   *
   * No value means DRAFT. A listing with nothing stored has, by definition,
   * never had a payout account linked to it — which is what DRAFT says.
   *
   * Mongoose only applies a default to a MISSING path, so a listing already
   * carrying PENDING or PUBLISHED keeps it through any save; the default can
   * only ever fill a blank.
   *
   * The value moves on its own: `account.updated` when Stripe verifies the
   * account, and when the host completes their billing details. Nothing
   * publishes a listing by hand.
   */
  listingStatus: {
    type: String,
    enum: ["DRAFT", "PENDING", "PUBLISHED"],
    default: "DRAFT",
    index: true,
  },
  listingStatusUpdatedAt: { type: Date },

  /**
   * Which of the host's connected accounts THIS listing pays out to.
   *
   * Null means "the host's default account" — which is what every listing that
   * predates multiple accounts means, and what a host running one account for
   * everything will always mean. Set it only when a property is deliberately
   * pointed at a different account.
   *
   * Must be one of the accountIds on the host's `stripeAccounts`; a listing
   * naming an account its host does not hold falls back to the default rather
   * than paying a stranger.
   */
  payoutStripeAccountId: { type: String, index: true },

  // ── Multi calendar sync ──────────────────────────────────────────────────
  /**
   * External iCal feeds (Airbnb, Booking.com, …).
   * One source of truth used by the add-form and the sidebar overview.
   */
  calendarSync: {
    type: [
      {
        url: { type: String, required: true, trim: true },
        label: { type: String, trim: true },          // optional "Airbnb", "Booking"…
        lastSyncAt: { type: Date },
        lastSyncStatus: {
          type: String,
          enum: ['ok', 'error', 'never'],
          default: 'never',
        },
        lastSyncError: { type: String },
        lastImportedCount: { type: Number, default: 0 },
      },
    ],
    default: [],
  },
  /**
   * Putko’s own export URL for this listing.
   * Generated after draft autosave / first feed add.
   */
  icalExportUrl: { type: String },

  locationDetails: {
    streetAndNumber: {
      type: String,
      index: true,
      set: (value) => value?.toLowerCase()
    },
    roomNumber: {
      type: String,
      index: true,
      set: (value) => value?.toLowerCase()
    },
    city: {
      type: String,
      index: true,
      set: (value) => value?.toLowerCase()
    },
    zipCode: {
      type: String,
      index: true,
    },
    country: {
      type: String,
      index: true,
    },
    state: {
      type: String,
      index: true,
      set: (value) => value?.toLowerCase()
    },
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Host',
    required: true
  },
  phoneNumber: { type: String, required: true },
  arrivalFrom: { type: String, required: false },
  arrivalTo: { type: String, required: false },
  departureFrom: { type: String, required: false },
  departureTo: { type: String, required: false },
  services: {
    en: {
      index: true,
      type: [String],
      enum: ["Wifi", "TV", "PC Desk(workspace)"],
    },
    sk: {
      index: true,
      type: [String],
      enum: ["Wifi", "TV", "PC stôl(pracovný priestor)"],
    },
  },
  bathroomAmenities: {
    en: {
      index: true,
      type: [String],
      enum: ["Bathtub", "Shower", "Washing Machine", "Dryer", "Ironing"],
    },
    sk: {
      index: true,
      type: [String],
      enum: ["Vaňa", "Sprcha", "Práčka", "Sušička", "Žehlenie"],
    },
  },
  kitchenDiningAmenities: {
    en: {
      index: true,
      type: [String],
      enum: [
        "Stovetop",
        "Oven",
        "Dishwasher",
        "Refrigerator",
        "Freezer",
        "Dining Table",
        "Coffee Maker",
      ],
    },
    sk: {
      index: true,
      type: [String],
      enum: [
        "Varná doska",
        "Rúra",
        "Umývačka riadu",
        "Chladnička",
        "Mraznička",
        "Jedálenský stôl",
        "Kávovar",
      ],
    },
  },
  heatingCoolingAmenities: {
    en: {
      index: true,
      type: [String],
      enum: ["Indoor Fireplace", "Air Conditioning", "Central Heating"],
    },
    sk: {
      index: true,
      type: [String],
      enum: ["Vnútorný krb", "Klimatizácia", "Ústredné kúrenie"],
    },
  },

  safetyAmenities: {
    en: {
      index: true,
      type: [String],
      enum: ["Fire Extinguisher", "First Aid Kit"],
    },
    sk: {
      index: true,
      type: [String],
      enum: ["Hasiaci prístroj", "Lekárnička"],
    },
  },
  wellnessAmenities: {
    en: {
      index: true,
      type: [String],
      enum: ["Sauna", "Hot Tub", "Indoor Pool", "Outdoor Pool", "None"],
    },
    sk: {
      index: true,
      type: [String],
      enum: ["Sauna", "Vírivka", "Vnútorný bazén", "Vonkajší bazén", "Žiadne"],
    },
  },

  outdoorAmenities: {
    en: {
      index: true,
      type: [String],
      enum: [
        "Firepit",
        "Balcony",
        "Terrace",
        "Outdoor dining area",
        "Grill",
        "None",
      ],
    },
    sk: {
      index: true,
      type: [String],
      enum: [
        "Ohnisko",
        "Balkón",
        "Terasa",
        "Vonkajší jedálenský priestor",
        "Gril",
        "Žiadne",
      ],
    },
  },
  parkingFacilities: {
    en: {
      index: true,
      type: [String],
      enum: ["Free Parking on-site", "Paid Parking on-site", "Public Parking"],
    },
    sk: {
      index: true,
      type: [String],
      enum: ["Bezplatné parkovanie na mieste", "Platené parkovanie", "Verejné parkovanie"],
    },
  },
  checkIn: {
    en: {
      index: true,
      type: [String],
      enum: ["Self Check-in", "Reception", "Host Greeting"],
    },
    sk: {
      index: true,
      type: [String],
      enum: ["Samoobslužný check-in", "Recepcia", "Privítanie hostiteľom"],
    },
  },
  meals: {
    en: {
      index: true,
      type: [String],
      enum: [
        "No Meals",
        "Breakfast",
        "Half Board",
        "Full Board",
        "All-Inclusive",
      ],
    },
    sk: {
      index: true,
      type: [String],
      enum: [
        "Bez stravy",
        "Raňajky",
        "Polpenzia",
        "Plná penzia",
        "All-inclusive",
      ],
    },
  },

  pet: {
    en: {
      type: String,
      index: true,
      enum: [
        "Allowed at no extra charge",
        "Allowed with an additional fee",
        "Not Allowed",
      ],
    },
    sk: {
      type: String,
      index: true,
      enum: [
        "Povolené bez príplatku",
        "Povolené za príplatok",
        "Nepovolené",
      ],
    },
  },

  // Optional. Only meaningful when pet.en === "Allowed with an additional fee";
  // 0 means pets are allowed without an extra charge.
  petFeePerNight: {
    type: Number,
    required: false,
    default: 0,
    min: 0,
  },

  partyOrganizing: {
    en: {
      type: String,
      index: true,
      enum: ["Allowed", "Not Allowed"],
    },
    sk: {
      type: String,
      index: true,
      enum: ["Povolené", "Nepovolené"],
    },
  },
  smoking: {
    en: {
      type: String,
      index: true,
      enum: [
        "Allowed indoors",
        "Allowed in designated areas",
        "Not allowed",
      ],
    },
    sk: {
      type: String,
      index: true,
      enum: [
        "Povolené v interiéri",
        "Povolené v určených priestoroch",
        "Nepovolené",
      ],
    },
  },
  images: [{ type: String }],
  reviews: [{ type: mongoose.Types.ObjectId, ref: "Review" }],
  averageRating: {
    type: Number,
    default: 0,
  },
  Reservation: [{ type: mongoose.Types.ObjectId, ref: "Reservation" }],
  occupancyCalendar: [
    {
      startDate: { type: Date, required: false },
      endDate: { type: Date, required: false },
      guestName: { type: String, default: 'N/A' },
      status: {
        type: String,
        enum: ['booked', 'available', 'blocked', 'held'],
        default: 'booked'
      },
      holdExpiresAt: { type: Date, required: false },
      reservationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reservation',
        required: false
      },
      // Only 'ics' rows are swept when a host disconnects a feed
      source: {
        type: String,
        enum: ['manual', 'ics', 'reservation'],
        default: 'manual'
      },
      // Which calendarSync entry produced this row (precise cleanup)
      calendarSyncId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
      },
    }
  ],
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  customerInterest: { type: Number, default: 0 },
  isApproved: {
    type: Boolean,
    default: false,
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Reject an invalid custom cancellation policy at save time
accommodationSchema.pre('validate', function validateCustomPolicy(next) {
  if (this.cancellationPolicyType !== 'custom') return next();

  const { valid, errors, tiers } = validateCustomTiers(this.customPolicyTiers);
  if (!valid) {
    return next(new Error(`Invalid custom cancellation policy: ${errors.join('; ')}`));
  }

  this.customPolicyTiers = tiers;
  next();
});

export default mongoose.model('Accommodation', accommodationSchema);