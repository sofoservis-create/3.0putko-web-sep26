import mongoose from 'mongoose';

const DeletedAccommodationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false
  },
  slug: { type: String, required: true, unique: true },
  description: {
    type: String
  },
  specialNote: {
    type: String,
    required: false
  },
  cancellationPolicy: {
    type: String,
    required: false
  },
  url: {
    type: String
  },
  virtualTourUrl: {
    type: String
  },
  propertyType: {
    en: {
      type: String,
      required: true,
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
    },
    sk: {
      type: String,
      enum: ["Celé miesto", "Súkromná izba", "Zdieľaná izba"],
    },
  },
  excludedDates: {
    type: [Date], // Array of Date objects
    default: [],
  },
  // FixedPrice: {
  //   type: Number,
  //   required: false
  // },
  specialPrice: {
    start: {
      type: Date,
      required: false
    },
    end: {
      type: Date,
      required: false
    },
    price: {
      type: Number,
      required: false
    }
  },
  // Mirrors Accommodation.flexiblePrices so a soft-deleted listing keeps its
  // seasonal rates and can be restored without losing them.
  flexiblePrices: {
    type: [
      {
        _id: false,
        name: {
          type: String,
          required: false
        },
        start: {
          type: Date,
          required: false
        },
        end: {
          type: Date,
          required: false
        },
        note: {
          type: String,
          required: false
        },
        tiers: {
          type: [
            {
              _id: false,
              minNights: {
                type: Number,
                required: false,
                default: 1
              },
              maxNights: {
                type: Number,
                required: false,
                default: null
              },
              price: {
                type: Number,
                required: false
              }
            }
          ],
          default: []
        }
      }
    ],
    default: []
  },
  discount: {
    type: Number,
    required: false
  },
  pricePerNight: {
    type: Number,
    required: false
  },
  pricePerPerson: {
    type: Number,
    required: false
  },
  location: {
    address: {
      type: String,
      required: false
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    }
  },
  acreage: {
    type: String,
  },
  tags: { type: [String], default: [] },
  nightMin: { type: Number, required: true },
  nightMax: { type: Number, required: true },
  beds: { type: Number, },
  singlebed: { type: Number },
  doublebed: { type: Number },
  kitchen: { type: Number, },
  WCs: { type: Number, },
  SocialRoom: { type: Number, },
  CommonRoom: { type: Number, },
  LivingRoom: { type: Number, },
  bedroom: { type: Number, },  // Number of bedrooms
  bathroom: { type: Number, }, // Number of bathrooms
  person: { type: Number, required: true },
  locationDetails: {
    streetAndNumber: {
      type: String,
      set: (value) => value?.toLowerCase()
    },
    roomNumber: {
      type: String,
      set: (value) => value?.toLowerCase()
    },
    city: {
      type: String,
      set: (value) => value?.toLowerCase()
    },
    zipCode: {
      type: String
    },
    country: {
      type: String
    },
    state: {
      type: String,
      set: (value) => value?.toLowerCase()
    },
  },
  // Add userId to reference the user who created the accommodation
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Host', // Reference to the User model
    required: true // Ensure that every accommodation has a user associated with it
  },
  phoneNumber: { type: String, required: true },
  arrivalFrom: {
    type: String, // Store as a string in "HH:MM" format
    required: false,
  },
  arrivalTo: {
    type: String, // Store as a string in "HH:MM" format
    required: false,
  },
  departureFrom: {
    type: String, // Store as a string in "HH:MM" format
    required: false,
  },
  departureTo: {
    type: String, // Store as a string in "HH:MM" format
    required: false,
  },
  services: {
    en: {
      type: [String],
      enum: ["Wifi", "TV", "PC Desk(workspace)"],
    },
    sk: {
      type: [String],
      enum: ["Wifi", "TV", "PC stôl(pracovný priestor)"],
    },
  },
  bathroomAmenities: {
    en: {
      type: [String],
      enum: ["Bathtub", "Shower", "Washing Machine", "Dryer", "Ironing"],
    },
    sk: {
      type: [String],
      enum: ["Vaňa", "Sprcha", "Práčka", "Sušička", "Žehlenie"],
    },
  },
  kitchenDiningAmenities: {
    en: {
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
      type: [String],
      enum: ["Indoor Fireplace", "Air Conditioning", "Central Heating"],
    },
    sk: {
      type: [String],
      enum: ["Vnútorný krb", "Klimatizácia", "Ústredné kúrenie"],
    },
  },

  safetyAmenities: {
    en: {
      type: [String],
      enum: ["Fire Extinguisher", "First Aid Kit"],
    },
    sk: {
      type: [String],
      enum: ["Hasiaci prístroj", "Lekárnička"],
    },
  },

  wellnessAmenities: {
    en: {
      type: [String],
      enum: ["Sauna", "Hot Tub", "Indoor Pool", "Outdoor Pool", "None"],
    },
    sk: {
      type: [String],
      enum: ["Sauna", "Vírivka", "Vnútorný bazén", "Vonkajší bazén", "Žiadne"],
    },
  },

  outdoorAmenities: {
    en: {
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
      type: [String],
      enum: ["Free Parking on-site", "Paid Parking on-site", "Public Parking"],
    },
    sk: {
      type: [String],
      enum: ["Bezplatné parkovanie na mieste", "Platené parkovanie", "Verejné parkovanie"],
    },
  },
  checkIn: {
    en: {
      type: [String],
      enum: ["Self Check-in", "Reception", "Host Greeting"],
    },
    sk: {
      type: [String],
      enum: ["Samoobslužný check-in", "Recepcia", "Privítanie hostiteľom"],
    },
  },
  meals: {
    en: {
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
      enum: [
        "Allowed at no extra charge",
        "Allowed with an additional fee",
        "Not Allowed",
      ],
    },
    sk: {
      type: String,
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
      enum: ["Allowed", "Not Allowed"],
    },
    sk: {
      type: String,
      enum: ["Povolené", "Nepovolené"],
    },
  },

  smoking: {
    en: {
      type: String,
      enum: [
        "Allowed indoors",
        "Allowed in designated areas",
        "Not allowed",
      ],
    },
    sk: {
      type: String,
      enum: [
        "Povolené v interiéri",
        "Povolené v určených priestoroch",
        "Nepovolené",
      ],
    },
  },
  images: [
    {
      type: String
    }
  ],
  reviews: [{ type: mongoose.Types.ObjectId, ref: "Review" }],
  averageRating: {
    type: Number,
    default: 0,
  },
  Reservation: [{ type: mongoose.Types.ObjectId, ref: "Reservation" }],
  occupancyCalendar: [
    {
      startDate: {
        type: Date,
        required: false
      },
      endDate: {
        type: Date,
        required: false
      },
      guestName: {
        type: String,
        default: 'N/A'
      },
      status: {
        type: String,
        enum: ['booked', 'available', 'blocked'],
        default: 'booked'
      }
    }
  ],
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  customerInterest: { type: Number, default: 0 },
  date: {
    type: Date,
    default: Date.now // Sets the date to the current date/time upon creation
  },
  createdAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: Date.now }  // Stores deletion time
}, { timestamps: true });

// Retention: three years, matching DeletedReservation. A soft-deleted listing
// carries its host's identity and its bookings' history; nothing expired it.
DeletedAccommodationSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 365 * 3 }
);

export default mongoose.model('DeletedAccommodation', DeletedAccommodationSchema);
