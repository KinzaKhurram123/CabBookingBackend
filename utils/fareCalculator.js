// Fare calculation utility

const PRICING = {
  BASE_FARE: 1.50,
  PER_MILE_RATE: 1.20,
  PER_MINUTE_RATE: 0.30,
  PEAK_HOUR_MULTIPLIER: 1.8,
};

// Peak hours: 7-9 AM and 5-7 PM
const PEAK_HOURS = [
  { start: 7, end: 9 },   // Morning rush
  { start: 17, end: 19 }, // Evening rush (5 PM - 7 PM)
];

/**
 * Check if the given time is during peak hours
 * @param {Date} date - The date/time to check
 * @returns {boolean} - True if it's peak hour
 */
const isPeakHour = (date = new Date()) => {
  const hour = date.getHours();

  return PEAK_HOURS.some(peak => hour >= peak.start && hour < peak.end);
};

/**
 * Calculate ride fare based on distance, time, and peak hours
 * @param {number} distanceMiles - Distance in miles
 * @param {number} timeMinutes - Time in minutes
 * @param {Date} bookingTime - Time of booking (optional, defaults to now)
 * @returns {Object} - Fare breakdown and total
 */
const calculateRideFare = (distanceMiles, timeMinutes, bookingTime = new Date()) => {
  // Validate inputs
  if (!distanceMiles || distanceMiles <= 0) {
    throw new Error("Distance must be greater than 0");
  }
  if (!timeMinutes || timeMinutes <= 0) {
    throw new Error("Time must be greater than 0");
  }

  // Step 1: Calculate distance cost
  const distanceCost = distanceMiles * PRICING.PER_MILE_RATE;

  // Step 2: Calculate time cost
  const timeCost = timeMinutes * PRICING.PER_MINUTE_RATE;

  // Step 3: Calculate subtotal
  const subtotal = PRICING.BASE_FARE + distanceCost + timeCost;

  // Step 4: Apply peak hour multiplier if applicable
  const isPeak = isPeakHour(bookingTime);
  const totalFare = isPeak ? subtotal * PRICING.PEAK_HOUR_MULTIPLIER : subtotal;

  return {
    baseFare: PRICING.BASE_FARE,
    distanceCost: parseFloat(distanceCost.toFixed(2)),
    timeCost: parseFloat(timeCost.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    isPeakHour: isPeak,
    peakMultiplier: isPeak ? PRICING.PEAK_HOUR_MULTIPLIER : 1,
    totalFare: parseFloat(totalFare.toFixed(2)),
    breakdown: {
      distance: `${distanceMiles} miles × $${PRICING.PER_MILE_RATE} = $${distanceCost.toFixed(2)}`,
      time: `${timeMinutes} minutes × $${PRICING.PER_MINUTE_RATE} = $${timeCost.toFixed(2)}`,
      peakHour: isPeak ? `Peak hour multiplier: ${PRICING.PEAK_HOUR_MULTIPLIER}x` : 'No peak hour multiplier',
    }
  };
};

/**
 * Calculate parcel delivery fare (similar logic but can have different rates)
 * @param {number} distanceMiles - Distance in miles
 * @param {number} timeMinutes - Time in minutes
 * @param {number} weight - Weight in kg (optional, for future use)
 * @param {Date} bookingTime - Time of booking
 * @returns {Object} - Fare breakdown and total
 */
const calculateParcelFare = (distanceMiles, timeMinutes, weight = 0, bookingTime = new Date()) => {
  // For now, use same calculation as ride fare
  // Can be customized later with weight-based pricing
  return calculateRideFare(distanceMiles, timeMinutes, bookingTime);
};

/**
 * Calculate pet delivery fare (similar logic but can have different rates)
 * @param {number} distanceMiles - Distance in miles
 * @param {number} timeMinutes - Time in minutes
 * @param {string} petType - Type of pet (optional, for future use)
 * @param {Date} bookingTime - Time of booking
 * @returns {Object} - Fare breakdown and total
 */
const calculatePetDeliveryFare = (distanceMiles, timeMinutes, petType = null, bookingTime = new Date()) => {
  // For now, use same calculation as ride fare
  // Can be customized later with pet-type-based pricing
  return calculateRideFare(distanceMiles, timeMinutes, bookingTime);
};

module.exports = {
  calculateRideFare,
  calculateParcelFare,
  calculatePetDeliveryFare,
  isPeakHour,
  PRICING,
};
