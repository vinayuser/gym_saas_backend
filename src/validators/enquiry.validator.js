import { z } from 'zod';

const optionalEmail = z.preprocess(
  (val) => (val === '' || val === undefined ? null : val),
  z.string().email().nullable().optional()
);

const optionalString = (max) =>
  z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.string().max(max).nullable().optional()
  );

const optionalEnum = (values) =>
  z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.enum(values).nullable().optional()
  );

const sharedOptionalFields = {
  lastName: optionalString(200),
  email: optionalEmail,
  dateOfBirth: optionalString(30),
  address: optionalString(500),
  city: optionalString(100),
  state: optionalString(100),
  pincode: optionalString(20),
  occupation: optionalString(200),
  source: z.string().max(100).optional(),
  referralSource: optionalString(200),
  interestedIn: optionalString(200),
  fitnessGoal: optionalString(1000),
  preferredContact: optionalEnum(['PHONE', 'EMAIL', 'WHATSAPP', 'SMS']),
  budget: z.coerce.number().optional().nullable(),
  trialDate: optionalString(30),
  status: z.enum(['NEW', 'CONTACTED', 'TRIAL', 'FOLLOW_UP', 'CONVERTED', 'LOST']).optional(),
  notes: optionalString(5000),
  followUpAt: optionalString(30),
};

export const createEnquirySchema = z.object({
  params: z.object({ gymId: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).max(200),
    phone: z.string().min(1).max(30),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
    ...sharedOptionalFields,
  }),
});

export const updateEnquirySchema = z.object({
  params: z.object({ gymId: z.string().uuid(), enquiryId: z.string().uuid() }),
  body: z
    .object({
      name: z.string().min(1).max(200).optional(),
      phone: z.string().min(1).max(30).optional(),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
      ...sharedOptionalFields,
    })
    .partial(),
});

export const enquiryParamsSchema = z.object({
  params: z.object({ gymId: z.string().uuid(), enquiryId: z.string().uuid() }),
});
