# Implementation Plan: Driver Payouts System

## Overview

This implementation plan converts the Driver Payouts System design into actionable coding tasks. The system enables drivers to withdraw earnings through automated weekly payouts and on-demand instant payouts, integrated with Stripe Connect for secure fund transfers. Additionally, the system includes driver document verification, scheduled ride booking, and support for multiple stops/waypoints in rides. Implementation will be done in **JavaScript (Node.js)** using the existing Express.js and MongoDB stack.

The plan follows an incremental approach: database models → core services → document verification → scheduled rides → waypoints → payout endpoints → scheduler → notifications → admin features → security → testing. Each task builds on previous work to ensure a cohesive, working system at every checkpoint.

**Key Features Implemented:**
- Automated weekly payouts with driver verification checks
- Instant payouts with $60 minimum threshold (updated from $6)
- Driver document verification system (upload, admin approval, verification status)
- Scheduled ride booking with advance date/time selection
- Multiple stops/waypoints support (1-5 waypoints with $2 per-stop fee)
- Comprehensive admin oversight for payouts and document verification
- Security controls, fraud detection, and audit logging

## Tasks

- [x] 1. Update database models for payout system
  - [x] 1.1 Enhance Withdrawal model with new payout fields
    - Add `payoutType` field (enum: 'weekly', 'instant')
    - Add `fee` field (Number, default: 0) for instant payout fees
    - Add `stripeTransferId` field for Stripe transaction tracking
    - Add `retryCount` field (Number, default: 0) for failure retry tracking
    - Add `lastRetryAt` field (Date) for exponential backoff
    - Add `failureReason` field (String) for detailed error messages
    - Update status enum to include 'processing', 'completed', 'failed'
    - Add indexes for efficient querying: `{payoutType: 1, status: 1, createdAt: -1}`
    - _Requirements: 4.7, 4.8, 5.1, 5.9, 10.1_
  
  - [x] 1.2 Add instant payout fields to Rider model
    - Add `instantPayoutCount` field (Number, default: 0) for daily limit tracking
    - Add `lastInstantPayoutDate` field (Date) for daily limit reset
    - Add `cardNumber` field to bankAccount subdocument (encrypted) for instant transfers
    - Add `bankAccountVerified` field (Boolean, default: false)
    - Ensure all Stripe Connect fields exist: `stripeConnectAccountId`, `connectChargesEnabled`, `connectPayoutsEnabled`, `connectOnboardingComplete`, `connectAccountStatus`
    - _Requirements: 2.4, 3.5, 3.8, 4.1, 4.3_
  
  - [x] 1.3 Add document verification fields to Rider model
    - Add `documents` subdocument with fields for license, insurance, vehicleRegistration, profilePhoto
    - Each document type should have: status (enum: pending/approved/rejected), rejectionReason, uploadedAt, reviewedAt, reviewedBy (Admin ID)
    - Add license-specific fields: licenseNumber, expiryDate, frontImage, backImage
    - Add insurance-specific fields: provider, policyNumber, expiryDate, documentUrl
    - Add vehicleRegistration-specific fields: registrationNumber, documentUrl
    - Add profilePhoto-specific fields: url
    - Add `isVerified` field (Boolean, default: false) for overall verification status
    - Add `verificationStatus` field (enum: pending/in_review/approved/rejected)
    - _Requirements: 13.1, 13.4, 13.5, 13.6, 14.9_
  
  - [x] 1.4 Add scheduling and waypoint fields to RideBooking model
    - Add `scheduledDateTime` field (Date, default: null) for scheduled rides
    - Add `isScheduled` field (Boolean, default: false)
    - Add `waypoints` array with fields: latitude, longitude, address, arrivalTime, departureTime, sequence
    - Add `fareBreakdown` subdocument with fields: baseFare, distanceFare, timeFare, waypointFees, totalFare
    - Update status enum to include "scheduled" and "no_driver_available"
    - Add `scheduledAt`, `matchingStartedAt` timestamp fields
    - _Requirements: 15.1, 15.5, 15.6, 16.1, 16.5, 16.8_

- [ ] 2. Implement bank account validation service
  - [ ] 2.1 Create bank account validator utility
    - Create `utils/bankAccountValidator.js`
    - Implement `validateBankAccount(bankAccountData)` function
    - Validate accountNumber length (5-34 characters)
    - Validate routingNumber format (exactly 9 digits)
    - Validate cardNumber format (13-19 digits) for instant payouts
    - Return validation errors with specific field messages
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_
  
  - [ ] 2.2 Implement bank account encryption utility
    - Create `utils/encryption.js` with AES-256 encryption
    - Implement `encryptBankAccount(accountData)` function
    - Implement `decryptBankAccount(encryptedData)` function
    - Implement `maskAccountNumber(accountNumber)` to show only last 4 digits
    - Implement `maskCardNumber(cardNumber)` to show only last 4 digits
    - Use environment variable for encryption key
    - _Requirements: 3.4, 3.9, 9.10, 9.11_

- [ ] 3. Create Stripe Connect payout processor service
  - [ ] 3.1 Create Stripe payout service
    - Create `services/stripePayoutService.js`
    - Implement `createStripeTransfer(riderId, amount, payoutRecordId)` function
    - Verify driver has valid `stripeConnectAccountId`
    - Verify `connectChargesEnabled` is true
    - Call Stripe API `stripe.transfers.create()` with amount, currency (USD), and metadata
    - Return Stripe transfer object with transaction ID
    - Handle Stripe API errors and return structured error responses
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ] 3.2 Implement payout processor with retry logic
    - Create `services/payoutProcessor.js`
    - Implement `processPayout(withdrawalId)` function
    - Update withdrawal status to 'processing'
    - Call `createStripeTransfer()` from Stripe service
    - On success: update status to 'completed', save `stripeTransferId`, update rider's `totalWithdrawn`
    - On failure: update status to 'failed', save `failureReason`, refund balance for instant payouts
    - Implement `shouldRetry(error)` to detect transient errors (network, rate limits)
    - Implement exponential backoff retry: 1 min, 5 min, 15 min (max 3 retries)
    - _Requirements: 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 10.1, 10.2, 10.3_
  
  - [ ]* 3.3 Write unit tests for payout processor
    - Test successful payout processing flow
    - Test Stripe API error handling (invalid account, insufficient funds)
    - Test retry logic with transient errors
    - Test balance refund on instant payout failure
    - Test idempotence (processing same payout multiple times)
    - _Requirements: 4.1-4.12, 10.1-10.3_

- [ ] 4. Implement instant payout API endpoint
  - [ ] 4.1 Create instant payout controller method
    - Add `requestInstantPayout` method to `controllers/withdrawalController.js`
    - Validate request body: `amount` (required, number > 0)
    - Fetch rider with database transaction for atomic operations
    - Validate rider account is active and not suspended
    - Check rider verification status (isVerified must be true)
    - Return error "Driver verification incomplete. Please upload and get all required documents approved." if not verified
    - _Requirements: 2.1, 9.1, 14.12_
  
  - [ ] 4.2 Add instant payout validation logic
    - Check wallet balance meets minimum threshold ($60 USD)
    - Return error "Minimum payout amount is $60" if below threshold
    - Check daily instant payout limit (3 per day)
    - Reset `instantPayoutCount` if `lastInstantPayoutDate` is not today
    - Return error "Daily instant payout limit reached (3 per day)" if limit exceeded
    - Check for existing pending payout for this rider
    - Return error "You have a pending payout request" if pending exists
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.8, 2.9_
  
  - [ ] 4.3 Implement instant payout fee calculation
    - Calculate fee as `Math.max(0.50, amount * 0.01)`
    - Round fee to 2 decimal places
    - Deduct `(amount + fee)` from rider's `walletBalance` atomically
    - Create Withdrawal record with `payoutType: 'instant'`, `amount`, `fee`, `status: 'pending'`
    - Increment rider's `instantPayoutCount` and update `lastInstantPayoutDate`
    - _Requirements: 2.5, 2.6, 2.7, 11.2, 11.8_
  
  - [ ] 4.4 Wire instant payout to processor
    - Call `payoutProcessor.processPayout(withdrawalId)` after creating withdrawal
    - Return success response with withdrawal details
    - Handle errors and rollback transaction on failure
    - _Requirements: 2.10, 9.4, 9.5_
  
  - [ ]* 4.5 Write unit tests for instant payout endpoint
    - Test successful instant payout request
    - Test minimum threshold validation
    - Test daily limit enforcement
    - Test fee calculation accuracy
    - Test concurrent request handling
    - Test balance deduction atomicity
    - _Requirements: 2.1-2.10_

- [ ] 5. Checkpoint - Ensure instant payout flow works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement driver document verification system
  - [ ] 6.1 Create document verification service
    - Create `services/documentVerificationService.js`
    - Implement `uploadDocument(driverId, documentType, file)` function
    - Validate file format (PDF, JPG, JPEG, PNG only)
    - Validate file size (maximum 10MB)
    - Validate document type (license, insurance, vehicle_registration, other)
    - Store file securely in `uploads/documents/` directory
    - Generate unique document ID and record upload timestamp
    - Update rider's documents subdocument with status "pending"
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 6.2 Implement document replacement logic
    - When uploading document of existing type, replace previous document
    - Ensure only one document per type per driver
    - If driver was previously verified, set isVerified to false when new document uploaded
    - _Requirements: 13.6, 13.7_
  
  - [ ] 6.3 Implement document verification status calculation
    - Create `isDriverFullyVerified(driverId)` function
    - Check if all required document types (license, insurance, vehicle_registration) have status "approved"
    - Update rider's isVerified field to true only when all required docs approved
    - Update verificationStatus field based on document statuses
    - _Requirements: 14.9_
  
  - [ ] 6.4 Add document notification triggers
    - Send notification to admins when new document uploaded
    - Send notification to driver when document approved
    - Send notification to driver when document rejected (include reason)
    - _Requirements: 13.8, 14.8_
  
  - [ ]* 6.5 Write unit tests for document verification service
    - Test file format validation (accept PDF/JPG/PNG, reject others)
    - Test file size validation (accept <=10MB, reject >10MB)
    - Test document type validation
    - Test document replacement logic
    - Test verification status calculation
    - _Requirements: 13.1-13.10, 14.9_

- [ ] 7. Implement document management API endpoints
  - [ ] 7.1 Create document upload endpoint
    - Add `uploadDocument` method to `controllers/riderController.js` or create new `controllers/documentController.js`
    - Handle multipart/form-data file upload
    - Validate documentType parameter
    - Call documentVerificationService.uploadDocument()
    - Return document metadata (id, type, status, uploadedAt)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [ ] 7.2 Create get driver documents endpoint
    - Add `getDriverDocuments` method to retrieve all documents for authenticated driver
    - Return document metadata for each type (status, uploadedAt, reviewedAt, rejectionReason)
    - Include isFullyVerified status
    - Do not return file URLs unless explicitly requested
    - _Requirements: 13.9, 13.10_
  
  - [ ] 7.3 Create get document file endpoint
    - Add `getDocumentFile` method to retrieve actual document file
    - Validate driver owns the document
    - Return file with appropriate content-type header
    - _Requirements: 13.9_
  
  - [ ]* 7.4 Write unit tests for document endpoints
    - Test upload with valid and invalid files
    - Test document retrieval
    - Test authorization (driver can only access own documents)
    - _Requirements: 13.1-13.10_

- [ ] 8. Implement admin document verification workflow
  - [ ] 8.1 Create admin get pending documents endpoint
    - Add `adminGetPendingDocuments` method to `controllers/adminController.js`
    - Support filtering by documentType, driverId
    - Support pagination (default 20 per page)
    - Sort by upload date (oldest first)
    - Return driver name, document type, upload date, thumbnail preview URL
    - _Requirements: 14.1, 14.2, 14.10_
  
  - [ ] 8.2 Create admin verify document endpoint
    - Add `adminVerifyDocument` method to approve or reject documents
    - Require action parameter ("approve" or "reject")
    - Require rejection reason if action is "reject"
    - Update document status to "approved" or "rejected"
    - Record admin ID and timestamp
    - Call isDriverFullyVerified() to update driver verification status
    - Send notification to driver
    - _Requirements: 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9_
  
  - [ ] 8.3 Create admin bulk approve documents endpoint
    - Add `adminBulkApproveDocuments` method
    - Accept array of document IDs
    - Validate all documents belong to same driver
    - Approve all documents with same admin ID and timestamp
    - Update driver verification status after all approvals
    - Return results with approved and failed lists
    - _Requirements: 14.11_
  
  - [ ] 8.4 Create admin view document endpoint
    - Add `adminViewDocument` method to retrieve document file
    - Support zoom and download capabilities (return file with appropriate headers)
    - Log admin access for audit purposes
    - _Requirements: 14.3_
  
  - [ ]* 8.5 Write unit tests for admin document endpoints
    - Test pending documents filtering and sorting
    - Test document approval flow
    - Test document rejection with reason
    - Test bulk approval
    - Test verification status updates
    - _Requirements: 14.1-14.11_

- [ ] 9. Checkpoint - Ensure document verification system works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement scheduled ride booking system
  - [ ] 10.1 Create scheduled ride service
    - Create `services/scheduledRideService.js`
    - Implement `validateScheduledDateTime(scheduledDateTime)` function
    - Check scheduledDateTime is in the future
    - Check scheduledDateTime is within 30 days
    - Return validation errors with specific messages
    - _Requirements: 15.2, 15.3, 15.4_
  
  - [ ] 10.2 Implement scheduled ride creation
    - Update `createRideBooking` in `controllers/rideBookingController.js`
    - Support optional scheduledDateTime field
    - If scheduledDateTime provided, validate using scheduledRideService
    - Set booking status to "scheduled" for scheduled rides
    - Store scheduledDateTime in UTC format
    - Set isScheduled flag to true
    - _Requirements: 15.1, 15.5, 15.6_
  
  - [ ] 10.3 Implement scheduled ride processing cron job
    - Create cron job that runs every minute
    - Find all rides with status "scheduled" and scheduledDateTime 15 minutes from now
    - For each ride, attempt to match with available drivers
    - Send notifications to nearby drivers
    - _Requirements: 15.7_
  
  - [ ] 10.4 Implement scheduled ride driver matching
    - When driver accepts scheduled ride, update status to "accepted"
    - Send notification to user with driver details
    - If no driver accepts within 10 minutes of scheduled time, update status to "no_driver_available"
    - Send notification to user explaining no driver found
    - _Requirements: 15.8, 15.9_
  
  - [ ] 10.5 Implement scheduled ride cancellation
    - Add `cancelScheduledRide` method to ride controller
    - Validate cancellation is more than 5 minutes before scheduled time
    - Return error "Cannot cancel within 5 minutes of scheduled time" if too late
    - Update status to "cancelled"
    - Refund any prepaid amount to user
    - _Requirements: 15.11, 15.12_
  
  - [ ] 10.6 Add scheduled ride filtering
    - Update `getRideBookings` endpoint to support filtering by isScheduled
    - Display scheduled rides separately from immediate rides
    - _Requirements: 15.10_
  
  - [ ]* 10.7 Write unit tests for scheduled ride service
    - Test date/time validation (future, within 30 days)
    - Test status assignment for scheduled rides
    - Test cancellation time window validation
    - Test driver matching timing
    - Test no driver timeout
    - _Requirements: 15.1-15.12_

- [ ] 11. Implement multiple stops/waypoints system
  - [ ] 11.1 Create waypoint processing service
    - Create `services/waypointProcessingService.js`
    - Implement `validateWaypoints(waypoints)` function
    - Validate waypoints array contains 0-5 waypoints
    - Validate each waypoint has latitude, longitude, address
    - Return error "Maximum 5 stops allowed per ride" if more than 5
    - Return specific validation errors for missing fields
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  
  - [ ] 11.2 Implement waypoint storage and ordering
    - Update ride booking creation to support waypoints array
    - Store waypoints in order between pickup and destination
    - Add sequence number to each waypoint
    - Preserve waypoint order in database
    - _Requirements: 16.5, 16.10_
  
  - [ ] 11.3 Enhance fare calculator with waypoint fees
    - Update `utils/fareCalculator.js`
    - Implement `calculateWaypointFees(waypoints)` function
    - Calculate fee as waypoints.length * $2
    - Update `calculateFare()` to include waypoint fees in total
    - Calculate total distance including all waypoints
    - Store fare breakdown with waypointFees field
    - _Requirements: 16.6, 16.7_
  
  - [ ] 11.4 Implement waypoint tracking during ride
    - Add `trackWaypointEvent` method to ride controller
    - Support "arrived" and "departed" events for each waypoint
    - Record arrivalTime and departureTime for each waypoint
    - Send notification to user when driver arrives at waypoint
    - _Requirements: 16.8, 16.9_
  
  - [ ] 11.5 Implement waypoint modification endpoint
    - Add `updateWaypoints` method to ride controller
    - Validate ride status is "pending" or "scheduled" (not accepted)
    - Return error "Cannot modify waypoints after driver acceptance" if ride accepted
    - Recalculate fare with new waypoints
    - Update booking with new waypoints and fare
    - _Requirements: 16.11, 16.12_
  
  - [ ]* 11.6 Write unit tests for waypoint processing
    - Test waypoint count validation (0-5)
    - Test waypoint structure validation
    - Test order preservation
    - Test fee calculation ($2 per waypoint)
    - Test modification restrictions
    - Test fare recalculation
    - _Requirements: 16.1-16.12_

- [ ] 12. Checkpoint - Ensure scheduled rides and waypoints work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement weekly payout scheduler
  - [ ] 13.1 Create weekly payout scheduler service
    - Create `services/weeklyPayoutScheduler.js`
    - Implement `executeWeeklyPayouts()` function
    - Query all riders with `walletBalance > 0`
    - Filter riders with valid bank account information or Stripe Connect enabled
    - Filter riders with isVerified = true (all documents approved)
    - Process riders in batches of 50 to prevent overload
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 14.12_
  
  - [ ] 13.2 Implement weekly payout processing logic
    - For each eligible rider, create Withdrawal record with `payoutType: 'weekly'`, `amount: walletBalance`, `status: 'pending'`
    - Call `payoutProcessor.processPayout(withdrawalId)` for each withdrawal
    - On success: update rider's `walletBalance` to 0, increment `totalWithdrawn`
    - On failure: preserve `walletBalance`, update withdrawal status to 'failed', log reason
    - Track processed riders to ensure idempotence (process each rider only once per day)
    - _Requirements: 1.7, 1.8, 1.9, 1.10, 8.1_
  
  - [ ] 13.3 Set up cron job for weekly scheduler
    - Use `node-cron` package to schedule weekly payouts
    - Schedule for every Monday at 00:00 UTC: `0 0 * * 1`
    - Add scheduler initialization to `server.js` or dedicated scheduler file
    - Add environment variable `WEEKLY_PAYOUT_ENABLED` to enable/disable scheduler
    - _Requirements: 1.1, 12.7_
  
  - [ ]* 13.4 Write unit tests for weekly scheduler
    - Test batch processing of eligible riders
    - Test idempotence (running scheduler multiple times on same day)
    - Test skipping riders with invalid bank accounts
    - Test skipping riders with zero balance
    - Test skipping unverified riders
    - Test balance preservation on payout failure
    - _Requirements: 1.1-1.10, 14.12_

- [ ] 14. Implement bank account management API endpoints
  - [ ] 14.1 Update bank account endpoint
    - Enhance existing `updateBankAccount` method in `controllers/withdrawalController.js`
    - Add validation using `bankAccountValidator.validateBankAccount()`
    - Encrypt sensitive fields using `encryption.encryptBankAccount()`
    - Mark account as unverified when updated (`bankAccountVerified: false`)
    - Support optional `cardNumber` field for instant payouts
    - Return masked account information in response
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9_
  
  - [ ] 14.2 Get bank account endpoint
    - Add `getBankAccount` method to `controllers/withdrawalController.js`
    - Fetch rider's bank account information
    - Decrypt sensitive fields
    - Mask accountNumber and cardNumber (show only last 4 digits)
    - Return masked bank account with verification status
    - _Requirements: 3.9_
  
  - [ ]* 14.3 Write unit tests for bank account endpoints
    - Test bank account creation with valid data
    - Test validation errors for invalid account numbers
    - Test validation errors for invalid routing numbers
    - Test encryption and decryption round trip
    - Test masking of sensitive fields
    - _Requirements: 3.1-3.9_

- [ ] 15. Implement payout history and tracking API endpoints
  - [ ] 15.1 Enhance get withdrawal history endpoint
    - Update existing `getWithdrawalHistory` method in `controllers/withdrawalController.js`
    - Add support for filtering by `payoutType` (weekly/instant)
    - Add support for date range filtering (`startDate`, `endDate`)
    - Include fee information in response for instant payouts
    - Include failure reason for failed payouts
    - Return masked bank account information for each payout
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7_
  
  - [ ] 15.2 Add payout summary statistics endpoint
    - Add `getPayoutSummary` method to `controllers/withdrawalController.js`
    - Calculate total amounts by status (pending, processing, completed, failed)
    - Calculate total fees collected (for instant payouts)
    - Return summary with counts and amounts
    - _Requirements: 5.8_
  
  - [ ] 15.3 Add payout details endpoint
    - Add `getPayoutDetails` method to `controllers/withdrawalController.js`
    - Fetch single withdrawal by ID
    - Include all details: amount, status, fee, timestamps, bank account (masked), Stripe transaction ID
    - Include status transition audit log
    - _Requirements: 5.4, 5.9, 5.10_
  
  - [ ]* 15.4 Write unit tests for payout history endpoints
    - Test pagination functionality
    - Test filtering by status and date range
    - Test summary statistics accuracy
    - Test that summary matches filtered results
    - _Requirements: 5.1-5.10_

- [ ] 16. Checkpoint - Ensure payout history and tracking works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement notification service for payout events
  - [ ] 17.1 Create payout notification service
    - Create `services/payoutNotificationService.js`
    - Implement `sendPayoutNotification(riderId, notificationType, payoutData)` function
    - Support notification types: 'processing', 'completed', 'failed', 'scheduled', 'skipped', 'bank_account_missing'
    - Integrate with existing Firebase Cloud Messaging (FCM) service
    - Include deep link to payout history screen in notifications
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [ ] 17.2 Add notification triggers to payout processor
    - Send 'processing' notification when payout status changes to 'processing'
    - Send 'completed' notification when payout succeeds (include amount and expected arrival time)
    - Send 'failed' notification when payout fails (include failure reason and next steps)
    - For instant payouts, include net amount (after fees) in completed notification
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 17.3 Add notification fallback mechanism
    - If FCM push notification fails, create in-app notification record
    - Store all payout notifications in rider's notification history
    - Use existing notification model and service
    - _Requirements: 6.6, 6.7_
  
  - [ ] 17.4 Add weekly payout notifications
    - Send notification 24 hours before weekly payout processing
    - Send notification when driver skipped due to insufficient balance
    - Send notification when driver skipped due to missing/invalid bank account
    - _Requirements: 6.8, 6.9, 6.10_
  
  - [ ]* 17.5 Write unit tests for notification service
    - Test notification sent for each status transition
    - Test fallback to in-app notification on FCM failure
    - Test notification content includes correct data
    - _Requirements: 6.1-6.10_

- [ ] 18. Implement admin payout dashboard API endpoints
  - [ ] 18.1 Enhance admin get withdrawals endpoint
    - Update existing `adminGetWithdrawals` method in `controllers/withdrawalController.js`
    - Add filtering by `payoutType` (weekly/instant)
    - Add search by driver name, email, or phone number
    - Include Stripe transaction ID in response
    - Highlight payouts pending for more than 24 hours
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.9_
  
  - [ ] 18.2 Add admin payout summary endpoint
    - Add `adminGetPayoutSummary` method to `controllers/withdrawalController.js`
    - Calculate total pending amount, completed amount, failed amount
    - Calculate count by status
    - Support filtering by date range and payout type
    - _Requirements: 7.6_
  
  - [ ] 18.3 Add admin retry failed payout endpoint
    - Add `adminRetryPayout` method to `controllers/withdrawalController.js`
    - Validate payout status is 'failed'
    - Create new Withdrawal record linked to original (store `originalWithdrawalId`)
    - Call `payoutProcessor.processPayout()` for retry
    - Log admin action with admin ID and timestamp
    - _Requirements: 7.7, 7.8, 10.6, 10.7_
  
  - [ ] 18.4 Add admin export payouts endpoint
    - Add `adminExportPayouts` method to `controllers/withdrawalController.js`
    - Support CSV export with all fields including sensitive data
    - Require admin authorization check
    - Log export action with admin ID and timestamp for audit
    - _Requirements: 7.10, 7.11, 9.8_
  
  - [ ]* 18.5 Write unit tests for admin endpoints
    - Test search and filtering functionality
    - Test summary statistics accuracy
    - Test retry failed payout flow
    - Test export authorization and audit logging
    - _Requirements: 7.1-7.11_

- [ ] 19. Implement admin manual approval workflow
  - [ ] 19.1 Add manual approval configuration
    - Add `MANUAL_APPROVAL_ENABLED` environment variable
    - Add `MANUAL_APPROVAL_THRESHOLD` environment variable (default: $1000)
    - When enabled or amount exceeds threshold, set withdrawal status to 'pending_approval'
    - _Requirements: 8.1, 9.6_
  
  - [ ] 19.2 Add admin approve payout endpoint
    - Enhance existing `adminApproveWithdrawal` method
    - Support approving payouts with status 'pending_approval'
    - Update status to 'pending' and queue for processing
    - Record admin user ID and timestamp
    - Call `payoutProcessor.processPayout()` after approval
    - _Requirements: 8.2, 8.3, 8.7_
  
  - [ ] 19.3 Add admin reject payout endpoint
    - Enhance existing `adminRejectWithdrawal` method
    - Support rejecting payouts with status 'pending_approval'
    - Require rejection reason
    - Update status to 'rejected' and store reason
    - Refund amount and fee to rider's walletBalance for instant payouts
    - Record admin user ID and timestamp
    - Send rejection notification to driver
    - _Requirements: 8.4, 8.5, 8.6, 8.7, 8.8_
  
  - [ ] 19.4 Add bulk approve endpoint
    - Enhance existing `adminBulkApproveWithdrawals` method
    - Support bulk approval of multiple pending payouts
    - Validate each payout individually
    - Return results with approved and failed lists
    - _Requirements: 8.9, 8.10_
  
  - [ ]* 19.5 Write unit tests for manual approval workflow
    - Test approval flow updates status correctly
    - Test rejection refunds balance for instant payouts
    - Test bulk approval validates each payout
    - Test admin actions are logged with timestamps
    - _Requirements: 8.1-8.10_

- [ ] 20. Checkpoint - Ensure admin features work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Implement security and validation controls
  - [ ] 21.1 Add concurrent transaction protection
    - Implement optimistic locking for wallet balance updates
    - Check if balance was modified in last 100ms before payout
    - Retry payout request with updated balance if concurrent modification detected
    - Use MongoDB transactions for atomic balance updates
    - _Requirements: 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 21.2 Add rate limiting for payout requests
    - Implement rate limiting middleware for payout endpoints
    - Limit to 1 payout request per 60 seconds per driver
    - Return error "Too many requests. Please wait before trying again."
    - _Requirements: 9.7_
  
  - [ ] 21.3 Add fraud detection and flagging
    - Create `services/fraudDetectionService.js`
    - Implement `checkSuspiciousActivity(riderId)` function
    - Detect patterns: multiple failed payouts, unusual amounts, frequent bank account changes
    - Flag rider account for review when suspicious activity detected
    - Log all flagged activities for admin review
    - _Requirements: 9.9_
  
  - [ ] 21.4 Add audit logging for all payout operations
    - Create audit log utility in `utils/auditLogger.js`
    - Log all payout requests, approvals, rejections, completions with timestamp and user/admin ID
    - Log all bank account updates
    - Log all admin actions (retry, export, approve, reject)
    - Store audit logs in separate collection for compliance
    - _Requirements: 9.8, 5.10_
  
  - [ ]* 21.5 Write unit tests for security controls
    - Test concurrent transaction handling
    - Test rate limiting enforcement
    - Test fraud detection patterns
    - Test audit logging for all operations
    - _Requirements: 9.1-9.11_

- [ ] 22. Implement payout fee configuration
  - [ ] 22.1 Create fee configuration model
    - Create `models/payoutFeeConfig.js`
    - Fields: `fixedFee` (Number, default: 0.50), `percentageFee` (Number, default: 0.01)
    - Fields: `driverTier` (enum: 'standard', 'premium', 'vip'), `isActive` (Boolean)
    - Add indexes for efficient querying
    - _Requirements: 11.1, 11.6_
  
  - [ ] 22.2 Update fee calculation to use configuration
    - Modify instant payout fee calculation to fetch from database
    - Implement `getFeeForDriver(riderId)` to determine driver tier and applicable fee
    - Apply tier-specific fee structure (standard, premium, VIP)
    - Store fee configuration used in Withdrawal record
    - _Requirements: 11.2, 11.3, 11.6, 11.7_
  
  - [ ] 22.3 Add admin fee configuration endpoints
    - Add `adminGetFeeConfig` method to get current fee configuration
    - Add `adminUpdateFeeConfig` method to update fee configuration
    - Validate new fees only apply to future payouts
    - Add `adminGetFeeStats` method to show total fees collected (daily, weekly, monthly)
    - _Requirements: 11.3, 11.9_
  
  - [ ] 22.4 Display fees to drivers before payout
    - Update instant payout endpoint to return calculated fee before processing
    - Show fee clearly in response
    - Include fee in payout history and notifications
    - _Requirements: 11.4, 11.10_
  
  - [ ]* 22.5 Write unit tests for fee configuration
    - Test fee calculation with different configurations
    - Test tier-specific fee structures
    - Test fee configuration updates only affect future payouts
    - Test fee calculation determinism
    - _Requirements: 11.1-11.10_

- [ ] 23. Implement weekly payout schedule configuration
  - [ ] 23.1 Create schedule configuration model
    - Create `models/payoutScheduleConfig.js`
    - Fields: `dayOfWeek` (Number, 0-6), `timeUTC` (String, HH:MM format), `isEnabled` (Boolean)
    - Add validation for valid day and time
    - _Requirements: 12.1, 12.3_
  
  - [ ] 23.2 Update scheduler to use configuration
    - Modify `weeklyPayoutScheduler.js` to read schedule from database
    - Update cron expression dynamically based on configuration
    - Support disabling automatic payouts globally
    - Support disabling automatic payouts per driver (add `autoPayoutEnabled` field to Rider model)
    - Skip drivers with `autoPayoutEnabled: false` during processing
    - _Requirements: 12.2, 12.4, 12.5, 12.6, 12.7_
  
  - [ ] 23.3 Add admin schedule configuration endpoints
    - Add `adminGetPayoutSchedule` method to get current schedule
    - Add `adminUpdatePayoutSchedule` method to update schedule
    - Add `adminGetNextScheduledPayout` method to show next execution time
    - Add `adminTriggerWeeklyPayout` method to manually trigger weekly payouts immediately
    - _Requirements: 12.8, 12.9, 12.10_
  
  - [ ]* 23.4 Write unit tests for schedule configuration
    - Test schedule updates apply to next execution
    - Test manual trigger processes all eligible drivers
    - Test idempotence of manual trigger
    - Test disabling/enabling automatic payouts
    - _Requirements: 12.1-12.10_

- [ ] 24. Add API routes for all payout and document endpoints
  - [ ] 24.1 Create payout routes file
    - Create `routes/payout.js` or update existing withdrawal routes
    - Add driver routes: POST `/api/payouts/instant`, GET `/api/payouts/history`, GET `/api/payouts/summary`, GET `/api/payouts/:id`
    - Add bank account routes: PUT `/api/payouts/bank-account`, GET `/api/payouts/bank-account`
    - Apply authentication middleware (`authMiddleware`, `riderAuthMiddleware`)
    - Apply rate limiting middleware to payout request endpoints
    - _Requirements: All driver-facing payout requirements_
  
  - [ ] 24.2 Create document routes file
    - Create `routes/document.js` or add to rider routes
    - Add driver routes: POST `/api/documents/upload`, GET `/api/documents`, GET `/api/documents/:id/file`
    - Apply authentication middleware (`authMiddleware`, `riderAuthMiddleware`)
    - Apply file upload middleware (multer) for document upload
    - _Requirements: All driver-facing document requirements_
  
  - [ ] 24.3 Create ride booking routes (update existing)
    - Update `routes/rideBooking.js` to support scheduled rides and waypoints
    - Add/update routes: POST `/api/rides/book`, PUT `/api/rides/:id/waypoints`, POST `/api/rides/:id/cancel`
    - Add route: POST `/api/rides/:id/waypoints/:index/track` for waypoint tracking
    - Apply authentication middleware
    - _Requirements: All ride booking requirements_
  
  - [ ] 24.4 Add admin payout routes
    - Add admin routes: GET `/api/admin/payouts`, GET `/api/admin/payouts/summary`, POST `/api/admin/payouts/:id/retry`
    - Add admin routes: POST `/api/admin/payouts/:id/approve`, POST `/api/admin/payouts/:id/reject`
    - Add admin routes: POST `/api/admin/payouts/bulk-approve`, GET `/api/admin/payouts/export`
    - Add admin routes: GET `/api/admin/payouts/fees`, PUT `/api/admin/payouts/fees`, GET `/api/admin/payouts/fees/stats`
    - Add admin routes: GET `/api/admin/payouts/schedule`, PUT `/api/admin/payouts/schedule`, POST `/api/admin/payouts/trigger-weekly`
    - Apply admin authentication middleware (`adminMiddleware`)
    - _Requirements: All admin-facing payout requirements_
  
  - [ ] 24.5 Add admin document routes
    - Add admin routes: GET `/api/admin/documents/pending`, POST `/api/admin/documents/verify`, POST `/api/admin/documents/bulk-approve`
    - Add admin route: GET `/api/admin/documents/:id/view` for viewing document files
    - Apply admin authentication middleware (`adminMiddleware`)
    - _Requirements: All admin-facing document requirements_
  
  - [ ] 24.6 Wire routes to server
    - Import payout routes in `server.js`
    - Import document routes in `server.js`
    - Import/update ride booking routes in `server.js`
    - Mount routes: `app.use('/api/payouts', payoutRoutes)`, `app.use('/api/documents', documentRoutes)`
    - Mount admin routes: `app.use('/api/admin/payouts', adminPayoutRoutes)`, `app.use('/api/admin/documents', adminDocumentRoutes)`
    - Ensure routes are registered after authentication middleware

- [ ] 25. Final checkpoint - End-to-end testing and integration
  - [ ] 25.1 Test complete instant payout flow
    - Test driver requests instant payout with valid balance
    - Verify $60 minimum threshold enforcement
    - Verify driver verification status check (all documents approved)
    - Verify fee calculation and balance deduction
    - Verify Stripe transfer creation
    - Verify notifications sent
    - Verify payout history updated
  
  - [ ] 25.2 Test document verification flow
    - Test driver uploads documents (license, insurance, vehicle registration)
    - Verify file format and size validation
    - Verify admin receives notification
    - Test admin approves all documents
    - Verify driver isVerified status updated to true
    - Verify driver can now request payouts
  
  - [ ] 25.3 Test scheduled ride flow
    - Test user creates scheduled ride with future date/time
    - Verify date validation (future, within 30 days)
    - Verify ride status set to "scheduled"
    - Test cron job triggers driver matching 15 minutes before
    - Test driver accepts scheduled ride
    - Test no driver timeout scenario
  
  - [ ] 25.4 Test waypoint flow
    - Test user creates ride with multiple waypoints (1-5)
    - Verify waypoint validation (coordinates, address required)
    - Verify fare calculation includes $2 per waypoint
    - Test waypoint modification before driver acceptance
    - Test waypoint tracking during ride (arrival/departure)
    - Verify modification blocked after driver acceptance
  
  - [ ] 25.5 Test complete weekly payout flow
    - Test scheduler executes on schedule
    - Verify batch processing of eligible drivers
    - Verify only verified drivers (isVerified=true) are processed
    - Verify Stripe transfers for all drivers
    - Verify balance updates and notifications
    - Verify idempotence (no duplicate payouts)
  
  - [ ] 25.6 Test admin workflows
    - Test admin dashboard displays all payouts correctly
    - Test admin views pending documents and approves/rejects
    - Test manual payout approval workflow
    - Test retry failed payout
    - Test export functionality
    - Test fee and schedule configuration
  
  - [ ] 25.7 Test error handling and recovery
    - Test payout failure with invalid Stripe account
    - Test retry logic with transient errors
    - Test balance refund on instant payout failure
    - Test concurrent payout request handling
    - Test rate limiting enforcement
    - Test unverified driver payout rejection
  
  - [ ] 25.8 Final verification
    - Ensure all tests pass
    - Verify all requirements are implemented (Requirements 1-16)
    - Check security controls are in place
    - Verify audit logging works correctly
    - Verify document verification integrates with payout system
    - Verify scheduled rides and waypoints work correctly
    - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Implementation uses JavaScript (Node.js) with Express.js and MongoDB
- Checkpoints ensure incremental validation at key milestones
- Security and validation are integrated throughout, not added as afterthoughts
- The design document includes 24 Correctness Properties for property-based testing
- Unit tests and integration tests validate functionality and edge cases
- All sensitive data (bank accounts, card numbers, driver documents) must be encrypted at rest
- All API responses must mask sensitive fields
- Database transactions ensure atomic balance updates
- Stripe Connect integration requires proper error handling and retry logic
- **New Features Added:**
  - **Driver Document Verification**: Upload, storage, and admin approval workflow for driver documents (license, insurance, vehicle registration)
  - **Scheduled Ride Booking**: Advance ride scheduling with date/time validation and time-based driver matching
  - **Multiple Stops/Waypoints**: Support for 1-5 waypoints per ride with $2 per-stop fee and tracking
  - **Updated Instant Payout Threshold**: Minimum increased from $6 to $60 USD
  - **Verification Integration**: Only verified drivers (all documents approved) can request payouts
