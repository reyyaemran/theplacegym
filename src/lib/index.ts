/**
 * Central exports for library utilities
 * Import from "@/lib" instead of individual files for cleaner imports
 */

// Core utilities
export { cn } from "./utils";

// Date utilities
export {
  formatDate,
  getEventsForDay,
  getEventsForWeek,
  getMonthMatrix,
  getNextDate,
  getPreviousDate,
  getTimeSlots,
  getWeekDays,
  getWeekRange,
  isSameDayDate,
  isSameMonthDate,
  isTodayDate,
} from "./date-utils";

// Database
export { default as clientPromise, getCollection } from "./mongodb";

// Logging
export { logger } from "./logger";

// Mock data (for development/seeding)
export {
  mockAppointments,
  mockClients,
  mockIssues,
  mockStaff,
} from "./mock-data";
