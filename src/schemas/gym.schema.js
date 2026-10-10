import mongoose from 'mongoose';
import { defineSchema } from '../helpers/schema.js';
import { COLLECTIONS } from '../helpers/constants.js';

export const Gym = mongoose.models.Gym || mongoose.model(
  'Gym',
  defineSchema(
    {
      tenantId: { type: String, required: true, index: true },
      name: { type: String, required: true },
      slug: { type: String, required: true },
      description: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      country: { type: String, default: 'India' },
      pincode: String,
      latitude: Number,
      longitude: Number,
      logo: String,
      coverImage: String,
      primaryColor: { type: String, default: '#C3F400' },
      secondaryColor: { type: String, default: '#0B0F0A' },
      accentColor: { type: String, default: '#FFFFFF' },
      themeMode: { type: String, default: 'dark' },
      appTagline: String,
      appAlias: { type: String, unique: true, sparse: true },
      appPublished: { type: Boolean, default: false },
      adsEnabled: { type: Boolean, default: true },
      appAds: {
        banners: { type: Boolean, default: true },
        video: { type: Boolean, default: false },
        audio: { type: Boolean, default: false },
      },
      images: { type: [String], default: [] },
      operatingHours: { type: mongoose.Schema.Types.Mixed },
      gstNumber: String,
      taxRate: Number,
      isActive: { type: Boolean, default: true },
      qrCodeSecret: String,
      commercialAddons: { type: mongoose.Schema.Types.Mixed },
      dayPassPrice: Number,
    },
    { collection: COLLECTIONS.GYMS, indexes: [{ keys: { tenantId: 1, slug: 1 }, options: { unique: true } }] }
  )
);

export const GymBranch = mongoose.models.GymBranch || mongoose.model(
  'GymBranch',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      name: { type: String, required: true },
      address: String,
      phone: String,
      isActive: { type: Boolean, default: true },
    },
    { collection: COLLECTIONS.GYM_BRANCHES }
  )
);

export const GymStaff = mongoose.models.GymStaff || mongoose.model(
  'GymStaff',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      userId: { type: String, required: true },
      designation: String,
      joinedAt: { type: Date, default: Date.now },
      employmentType: String,
      baseSalary: Number,
      salaryCurrency: { type: String, default: 'INR' },
      paymentFrequency: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
      addressProofUrl: String,
      idProofUrl: String,
      isActive: { type: Boolean, default: true },
    },
    { collection: COLLECTIONS.GYM_STAFF, indexes: [{ keys: { gymId: 1, userId: 1 }, options: { unique: true } }] }
  )
);

export const Trainer = mongoose.models.Trainer || mongoose.model(
  'Trainer',
  defineSchema(
    {
      gymId: { type: String, required: true, index: true },
      tenantId: String,
      userId: { type: String, required: true, unique: true },
      bio: String,
      specialties: { type: [String], default: [] },
      experience: Number,
      isActive: { type: Boolean, default: true },
    },
    { collection: COLLECTIONS.TRAINERS }
  )
);
