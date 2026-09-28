/**
 * Seed catalogue. The categories and task names follow the structure of
 * app.padosipro.com; the descriptions are written for this project.
 * Ids are stable slugs so re-seeding updates rows instead of duplicating them.
 */
export interface SeedCategory {
  id: string;
  name: string;
  /** Feather icon name, rendered by the mobile app. */
  icon: string;
  tasks: { id: string; name: string; description: string }[];
}

export const catalogue: SeedCategory[] = [
  {
    id: 'errands',
    name: 'Errands',
    icon: 'shopping-bag',
    tasks: [
      { id: 'courier-pickup-drop', name: 'Courier pickup & drop', description: 'We collect and deliver parcels and documents across the city.' },
      { id: 'grocery-restocking', name: 'Grocery pickup & restocking', description: 'Your weekly essentials bought, delivered and put away.' },
      { id: 'medicine-refills', name: 'Medicine pickup & refills', description: 'Prescriptions collected on time so you never run out.' },
      { id: 'bill-payments', name: 'Bill payments', description: 'Electricity, water, gas and society dues paid before they are due.' },
      { id: 'document-printing', name: 'Document printing & notarization', description: 'Printing, scanning and notary visits handled for you.' },
    ],
  },
  {
    id: 'home',
    name: 'Home',
    icon: 'home',
    tasks: [
      { id: 'deep-cleaning', name: 'Deep & regular cleaning', description: 'Trusted cleaners booked, supervised and checked after the job.' },
      { id: 'plumbing-repairs', name: 'Plumbing repairs & installations', description: 'Leaks, taps and fittings fixed by a vetted plumber.' },
      { id: 'ac-servicing', name: 'AC servicing & installation', description: 'Seasonal servicing, gas top-ups and new installations.' },
      { id: 'pest-control', name: 'Pest control', description: 'Treatments scheduled and follow-ups tracked for you.' },
      { id: 'furniture-assembly', name: 'Furniture assembly', description: 'New furniture unboxed, assembled and set up where you want it.' },
    ],
  },
  {
    id: 'travel',
    name: 'Travel',
    icon: 'map',
    tasks: [
      { id: 'flight-booking', name: 'Flight booking & rebooking', description: 'The best fares found and changes handled when plans move.' },
      { id: 'train-booking', name: 'Train booking (Tatkal & waitlist)', description: 'Tatkal bookings and waitlists watched until confirmed.' },
      { id: 'hotel-selection', name: 'Hotel & homestay selection', description: 'Stays shortlisted to your budget and taste, then booked.' },
      { id: 'itinerary-planning', name: 'Itinerary planning', description: 'Day-by-day plans with transfers, tickets and bookings sorted.' },
    ],
  },
  {
    id: 'health',
    name: 'Health',
    icon: 'heart',
    tasks: [
      { id: 'doctor-appointments', name: 'Doctor appointments', description: 'Appointments booked with the right specialist and reminders sent.' },
      { id: 'lab-tests-home', name: 'Lab tests at home', description: 'Sample collection booked at home and reports shared with you.' },
      { id: 'health-records', name: 'Health record organisation', description: 'Prescriptions and reports kept in one organised place.' },
      { id: 'insurance-claims', name: 'Insurance claims', description: 'Claim paperwork filed and followed up until it is settled.' },
    ],
  },
  {
    id: 'elder-care',
    name: 'Elder Care',
    icon: 'users',
    tasks: [
      { id: 'daily-check-ins', name: 'Daily check-ins', description: 'Regular calls and visits so your parents are never alone.' },
      { id: 'medical-escort', name: 'Medical escort', description: 'Someone with them for hospital visits, tests and pharmacy runs.' },
      { id: 'home-safety-checks', name: 'Home safety checks', description: 'Grab bars, lighting and fall risks checked and fixed.' },
    ],
  },
  {
    id: 'events',
    name: 'Events',
    icon: 'calendar',
    tasks: [
      { id: 'event-planning', name: 'Planning & venue booking', description: 'Birthdays, poojas and get-togethers planned from start to finish.' },
      { id: 'vendor-coordination', name: 'Vendor coordination', description: 'Caterers, decorators and photographers booked and managed.' },
      { id: 'guest-management', name: 'Guest management', description: 'Invites, RSVPs and guest travel or stay arranged.' },
    ],
  },
  {
    id: 'staff',
    name: 'Staff',
    icon: 'briefcase',
    tasks: [
      { id: 'hire-house-help', name: 'Hire house help', description: 'Cooks, cleaners and nannies sourced and interviewed for you.' },
      { id: 'staff-verification', name: 'Staff verification', description: 'Background and police verification for household staff.' },
      { id: 'staff-payroll', name: 'Staff records & payroll', description: 'Attendance, leave and salaries tracked every month.' },
    ],
  },
  {
    id: 'tech',
    name: 'Tech',
    icon: 'smartphone',
    tasks: [
      { id: 'wifi-setup', name: 'Wi-Fi & internet setup', description: 'Connections installed, routers set up and dead zones fixed.' },
      { id: 'device-setup', name: 'Device setup & support', description: 'New phones, TVs and laptops set up and data moved across.' },
      { id: 'smart-home', name: 'Smart home setup', description: 'Cameras, smart locks and speakers installed and configured.' },
    ],
  },
];
