// Test fare calculation
const { calculateRideFare } = require('../utils/fareCalculator');

console.log('=== Testing Fare Calculation ===\n');

// Test case from user: 8 miles, 15 minutes, peak hour (5:30 PM)
const testDate = new Date();
testDate.setHours(17, 30, 0, 0); // 5:30 PM

const result = calculateRideFare(8, 15, testDate);

console.log('Test Case: 8 miles, 15 minutes, 5:30 PM (Peak Hour)');
console.log('Expected: $28.08');
console.log('\nCalculation Breakdown:');
console.log('- Base Fare: $' + result.baseFare);
console.log('- Distance Cost: $' + result.distanceCost + ' (' + result.breakdown.distance + ')');
console.log('- Time Cost: $' + result.timeCost + ' (' + result.breakdown.time + ')');
console.log('- Subtotal: $' + result.subtotal);
console.log('- Peak Hour: ' + (result.isPeakHour ? 'Yes' : 'No'));
console.log('- Peak Multiplier: ' + result.peakMultiplier + 'x');
console.log('- Total Fare: $' + result.totalFare);
console.log('\nMatch: ' + (result.totalFare === 28.08 ? '✓ PASS' : '✗ FAIL'));

// Test non-peak hour
console.log('\n\n=== Non-Peak Hour Test ===\n');
const nonPeakDate = new Date();
nonPeakDate.setHours(14, 0, 0, 0); // 2:00 PM

const nonPeakResult = calculateRideFare(8, 15, nonPeakDate);
console.log('Test Case: 8 miles, 15 minutes, 2:00 PM (Non-Peak)');
console.log('Total Fare: $' + nonPeakResult.totalFare);
console.log('Peak Hour: ' + (nonPeakResult.isPeakHour ? 'Yes' : 'No'));
