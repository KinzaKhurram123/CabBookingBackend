# Requirements Document: Driver Payouts System

## Introduction

The Driver Payouts System enables drivers (riders) in the Ridelynk ride-hailing platform to withdraw their earnings through two methods: automated weekly payouts and on-demand instant payouts. The system integrates with Stripe Connect for secure money transfers, maintains comprehensive payout history, provides admin oversight capabilities, and ensures proper validation and security controls throughout the payout lifecycle.

## Glossary

- **Payout_System**: The complete driver earnings withdrawal system including weekly automatic and instant payout capabilities
- **Driver**: A rider in the Ridelynk system who earns money from completed rides (synonymous with "Rider" in the codebase)
- **Weekly_Payout_Scheduler**: The automated service that processes weekly payouts every Monday
- **Instant_Payout_Service**: The service that handles on-demand driver payout requests
- **Payout_Processor**: The component that executes money transfers via Stripe Connect
- **Bank_Account_Validator**: The component that validates driver bank account information
- **Payout_Record**: A database record tracking a single payout transaction
- **Admin_Dashboard**: The administrative interface for managing and monitoring payouts
- **Wallet_Balance**: The current available earnings balance for a driver
- **Minimum_Threshold**: The minimum amount ($60 USD) required for instant payouts
- **Instant_Payout_Fee**: The fee charged for instant payouts ($0.50 or 1% of amount, whichever is greater)
- **Daily_Instant_Limit**: Maximum number of instant payouts (3) allowed per driver per day
- **Payout_Status**: The current state of a payout (pending, processing, completed, failed)
- **Stripe_Connect**: The payment processing service used for transferring funds to driver bank accounts
- **Notification_Service**: The service that sends payout notifications to drivers
- **Verification_Document**: A document uploaded by a driver for identity and vehicle verification (license, insurance, vehicle registration)
- **Document_Verification_System**: The system that manages driver document uploads and admin approval workflow
- **Document_Status**: The current state of a verification document (pending, approved, rejected)
- **Ride_Booking_System**: The system that handles ride requests and scheduling
- **Scheduled_Ride**: A ride booking created in advance with specific date and time
- **Waypoint**: An intermediate stop location during a ride between pickup and final destination

## Requirements

### Requirement 1: Weekly Automatic Payout Scheduling

**User Story:** As a driver, I want my earnings automatically transferred to my bank account every week, so that I receive regular payments without manual intervention.

#### Acceptance Criteria

1. THE Weekly_Payout_Scheduler SHALL execute every Monday at 00:00 UTC
2. WHEN the Weekly_Payout_Scheduler executes, THE Payout_System SHALL identify all drivers with positive Wallet_Balance
3. WHEN a driver has positive Wallet_Balance, THE Payout_System SHALL create a Payout_Record with status "pending"
4. WHEN a Payout_Record is created, THE Payout_System SHALL validate the driver has valid bank account information
5. IF a driver lacks valid bank account information, THEN THE Payout_System SHALL skip that driver and log the reason
6. WHEN processing weekly payouts, THE Payout_System SHALL process drivers in batches of 50 to prevent system overload
7. FOR ALL weekly payouts, THE Payout_System SHALL transfer the entire Wallet_Balance amount
8. WHEN a weekly payout is initiated, THE Payout_System SHALL update the Payout_Status to "processing"
9. WHEN a weekly payout completes successfully, THE Payout_System SHALL update Wallet_Balance to zero and increment totalWithdrawn
10. IF a weekly payout fails, THEN THE Payout_System SHALL update Payout_Status to "failed" and preserve the Wallet_Balance

**Property-Based Testing Guidance:**
- **Invariant**: Total system money (sum of all Wallet_Balance + sum of all totalWithdrawn + sum of all pending payouts) remains constant before and after scheduler execution
- **Idempotence**: Running the scheduler multiple times on the same day processes each eligible driver exactly once
- **Error Conditions**: Drivers with invalid bank accounts, zero balance, or negative balance are correctly skipped

### Requirement 2: Instant Payout Request Handling

**User Story:** As a driver, I want to request immediate payout of my earnings, so that I can access my money when I need it urgently.

#### Acceptance Criteria

1. WHEN a driver requests an instant payout, THE Instant_Payout_Service SHALL validate the Wallet_Balance meets the Minimum_Threshold
2. IF Wallet_Balance is less than $60 USD, THEN THE Instant_Payout_Service SHALL reject the request with error message "Minimum payout amount is $60"
3. WHEN an instant payout is requested, THE Instant_Payout_Service SHALL check the Daily_Instant_Limit
4. IF a driver has already made 3 instant payouts today, THEN THE Instant_Payout_Service SHALL reject the request with error message "Daily instant payout limit reached (3 per day)"
5. WHEN an instant payout is approved, THE Instant_Payout_Service SHALL calculate the Instant_Payout_Fee as MAX($0.50, amount * 0.01)
6. WHEN the fee is calculated, THE Instant_Payout_Service SHALL deduct (requested_amount + fee) from Wallet_Balance
7. WHEN the balance is deducted, THE Instant_Payout_Service SHALL create a Payout_Record with the net amount (requested_amount) and fee recorded separately
8. WHEN a Payout_Record is created, THE Instant_Payout_Service SHALL validate no other pending payout exists for this driver
9. IF a pending payout exists, THEN THE Instant_Payout_Service SHALL reject the request with error message "You have a pending payout request"
10. WHEN an instant payout is initiated, THE Payout_Processor SHALL update Payout_Status to "processing"

**Property-Based Testing Guidance:**
- **Invariant**: For any instant payout, (Wallet_Balance_before = Wallet_Balance_after + payout_amount + fee)
- **Metamorphic**: Fee calculation always satisfies: fee >= $0.50 AND fee >= (amount * 0.01)
- **Error Conditions**: Requests below threshold, exceeding daily limit, or with pending payouts are rejected with appropriate error messages

### Requirement 3: Bank Account Information Management

**User Story:** As a driver, I want to securely store my bank account details, so that I can receive payouts without re-entering information each time.

#### Acceptance Criteria

1. WHEN a driver adds bank account information, THE Bank_Account_Validator SHALL require accountTitle, accountNumber, bankName, routingNumber, and branchCode
2. WHEN accountNumber is provided, THE Bank_Account_Validator SHALL verify it contains between 5 and 34 characters
3. WHEN routingNumber is provided, THE Bank_Account_Validator SHALL verify it contains exactly 9 digits
4. WHEN bank account information is validated, THE Payout_System SHALL store it encrypted in the driver's profile
5. WHERE instant payouts are requested, THE Bank_Account_Validator SHALL additionally require cardNumber for instant transfer capability
6. WHEN cardNumber is provided, THE Bank_Account_Validator SHALL verify it matches standard card number format (13-19 digits)
7. WHEN bank account information is updated, THE Payout_System SHALL mark the account as unverified until next successful payout
8. WHEN a payout completes successfully, THE Payout_System SHALL mark the bank account as verified
9. THE Payout_System SHALL NOT allow payout requests from drivers without complete bank account information
10. WHEN bank account information is retrieved, THE Payout_System SHALL mask sensitive fields (show only last 4 digits of accountNumber and cardNumber)

**Property-Based Testing Guidance:**
- **Round Trip**: Storing and retrieving bank account information preserves all non-sensitive data accurately
- **Error Conditions**: Invalid account numbers, routing numbers, or card numbers are rejected with specific validation errors
- **Invariant**: Masked account numbers always show exactly 4 digits regardless of original length

### Requirement 4: Stripe Connect Payout Processing

**User Story:** As the system, I want to securely transfer funds to driver bank accounts via Stripe Connect, so that drivers receive their money safely and reliably.

#### Acceptance Criteria

1. WHEN a payout is ready for processing, THE Payout_Processor SHALL verify the driver has a valid stripeConnectAccountId
2. IF stripeConnectAccountId is missing, THEN THE Payout_Processor SHALL update Payout_Status to "failed" with reason "Stripe Connect account not configured"
3. WHEN stripeConnectAccountId exists, THE Payout_Processor SHALL verify connectChargesEnabled is true
4. IF connectChargesEnabled is false, THEN THE Payout_Processor SHALL update Payout_Status to "failed" with reason "Stripe Connect account not enabled"
5. WHEN Stripe Connect is verified, THE Payout_Processor SHALL call Stripe API to create a transfer to the driver's connected account
6. WHEN calling Stripe API, THE Payout_Processor SHALL include payout amount, currency (USD), and Payout_Record ID as metadata
7. WHEN Stripe API returns success, THE Payout_Processor SHALL update Payout_Status to "completed" and record the Stripe transaction ID
8. IF Stripe API returns an error, THEN THE Payout_Processor SHALL update Payout_Status to "failed" and record the error message
9. WHEN a payout fails, THE Payout_Processor SHALL refund the deducted amount back to Wallet_Balance (for instant payouts only)
10. WHEN a payout completes, THE Payout_Processor SHALL update the driver's totalWithdrawn field
11. THE Payout_Processor SHALL implement exponential backoff retry logic for transient Stripe API failures (network errors, rate limits)
12. THE Payout_Processor SHALL retry failed payouts up to 3 times with delays of 1 minute, 5 minutes, and 15 minutes

**Property-Based Testing Guidance:**
- **Idempotence**: Processing the same Payout_Record multiple times results in exactly one Stripe transfer
- **Error Conditions**: Various Stripe API failures (invalid account, insufficient funds, network errors) are handled correctly
- **Invariant**: For failed instant payouts, Wallet_Balance is restored to original amount (balance_before = balance_after)

### Requirement 5: Payout Status Tracking and History

**User Story:** As a driver, I want to view my complete payout history with current status, so that I can track my earnings and transfers.

#### Acceptance Criteria

1. WHEN a driver requests payout history, THE Payout_System SHALL return all Payout_Records for that driver sorted by creation date (newest first)
2. WHEN displaying payout history, THE Payout_System SHALL include amount, status, creation date, completion date, and fee (for instant payouts)
3. WHERE a payout has failed, THE Payout_System SHALL include the failure reason in the history
4. WHEN a driver views payout details, THE Payout_System SHALL show masked bank account information used for that payout
5. THE Payout_System SHALL support pagination with default page size of 20 records
6. THE Payout_System SHALL support filtering by Payout_Status (pending, processing, completed, failed)
7. THE Payout_System SHALL support filtering by date range (start date and end date)
8. WHEN calculating summary statistics, THE Payout_System SHALL provide total amount by status (pending, completed, failed)
9. WHEN a payout status changes, THE Payout_System SHALL record the timestamp of the status change
10. THE Payout_System SHALL maintain an immutable audit log of all status transitions for each Payout_Record

**Property-Based Testing Guidance:**
- **Invariant**: Sum of all completed payout amounts equals driver's totalWithdrawn field
- **Metamorphic**: Filtering by status and summing amounts equals the corresponding summary statistic
- **Confluence**: Applying filters in different orders (status then date vs date then status) produces identical results

### Requirement 6: Driver Payout Notifications

**User Story:** As a driver, I want to receive notifications when my payout is processed, so that I know when to expect money in my bank account.

#### Acceptance Criteria

1. WHEN a payout status changes to "processing", THE Notification_Service SHALL send a push notification to the driver
2. WHEN a payout status changes to "completed", THE Notification_Service SHALL send a push notification with the amount and expected arrival time
3. WHEN a payout status changes to "failed", THE Notification_Service SHALL send a push notification with the failure reason
4. WHEN sending a completed payout notification, THE Notification_Service SHALL include the net amount received (after fees for instant payouts)
5. WHEN sending notifications, THE Notification_Service SHALL include a deep link to the payout history screen
6. IF push notification delivery fails, THEN THE Notification_Service SHALL create an in-app notification as fallback
7. THE Notification_Service SHALL store all payout notifications in the driver's notification history
8. WHEN a weekly payout is scheduled, THE Notification_Service SHALL send a notification 24 hours before processing
9. WHEN a driver has insufficient balance for weekly payout, THE Notification_Service SHALL send a notification explaining why payout was skipped
10. WHEN a driver's bank account information is missing or invalid, THE Notification_Service SHALL send a notification prompting them to update it

**Property-Based Testing Guidance:**
- **Invariant**: Every payout status transition generates exactly one notification
- **Error Conditions**: Notification delivery failures trigger fallback mechanisms correctly

### Requirement 7: Admin Payout Dashboard

**User Story:** As an admin, I want to view and manage all driver payouts, so that I can monitor the system and resolve issues.

#### Acceptance Criteria

1. WHEN an admin accesses the payout dashboard, THE Admin_Dashboard SHALL display all Payout_Records sorted by creation date (newest first)
2. WHEN displaying payouts, THE Admin_Dashboard SHALL show driver name, amount, status, creation date, and bank account (masked)
3. THE Admin_Dashboard SHALL support searching by driver name, email, or phone number
4. THE Admin_Dashboard SHALL support filtering by Payout_Status, payout type (weekly/instant), and date range
5. WHEN viewing payout details, THE Admin_Dashboard SHALL display complete payout information including Stripe transaction ID
6. THE Admin_Dashboard SHALL display summary statistics: total pending amount, total completed amount, total failed amount, and count by status
7. WHERE a payout has status "failed", THE Admin_Dashboard SHALL display a "Retry" button
8. WHEN an admin clicks "Retry", THE Payout_System SHALL attempt to reprocess the failed payout
9. WHERE a payout has status "pending" for more than 24 hours, THE Admin_Dashboard SHALL highlight it as requiring attention
10. THE Admin_Dashboard SHALL support exporting payout data to CSV format with all fields including sensitive data (for authorized admins only)
11. WHEN exporting data, THE Payout_System SHALL log the export action with admin ID and timestamp for audit purposes

**Property-Based Testing Guidance:**
- **Metamorphic**: Summary statistics match the sum of individual payout records when filtered by the same criteria
- **Confluence**: Searching and filtering in different orders produces identical result sets

### Requirement 8: Admin Manual Payout Approval

**User Story:** As an admin, I want to manually approve or reject pending payouts, so that I can handle edge cases and prevent fraudulent transactions.

#### Acceptance Criteria

1. WHERE manual approval is enabled, WHEN a payout is created, THE Payout_System SHALL set status to "pending_approval"
2. WHEN an admin views a pending payout, THE Admin_Dashboard SHALL display "Approve" and "Reject" buttons
3. WHEN an admin approves a payout, THE Payout_System SHALL update status to "pending" and queue it for processing
4. WHEN an admin rejects a payout, THE Payout_System SHALL update status to "rejected" and require a rejection reason
5. WHEN a rejection reason is provided, THE Payout_System SHALL store it with the Payout_Record
6. WHEN an instant payout is rejected, THE Payout_System SHALL refund the amount and fee back to the driver's Wallet_Balance
7. WHEN a payout is approved or rejected, THE Payout_System SHALL record the admin user ID and timestamp
8. WHEN a payout is rejected, THE Notification_Service SHALL send a notification to the driver with the rejection reason
9. THE Admin_Dashboard SHALL support bulk approval of multiple pending payouts
10. WHEN bulk approving, THE Payout_System SHALL validate each payout individually and report any that cannot be approved

**Property-Based Testing Guidance:**
- **Invariant**: For rejected instant payouts, Wallet_Balance after rejection equals Wallet_Balance before request
- **Error Conditions**: Attempting to approve/reject already processed payouts fails with appropriate error

### Requirement 9: Payout Security and Validation

**User Story:** As the system, I want to prevent fraudulent or erroneous payouts, so that the platform and drivers are protected from financial loss.

#### Acceptance Criteria

1. WHEN a payout is requested, THE Payout_System SHALL verify the driver account is active and not suspended
2. WHEN a payout is requested, THE Payout_System SHALL verify the Wallet_Balance has not been modified by another transaction in the last 100ms
3. IF concurrent balance modification is detected, THEN THE Payout_System SHALL retry the payout request with updated balance
4. WHEN processing a payout, THE Payout_System SHALL use database transactions to ensure atomic balance updates
5. IF a database transaction fails, THEN THE Payout_System SHALL rollback all changes and mark the payout as failed
6. WHEN a payout amount exceeds $1000, THE Payout_System SHALL require additional verification (email confirmation or admin approval)
7. WHEN a driver requests multiple payouts rapidly (within 60 seconds), THE Payout_System SHALL implement rate limiting
8. THE Payout_System SHALL log all payout requests, approvals, rejections, and completions with timestamp and user/admin ID
9. WHEN detecting suspicious patterns (multiple failed payouts, unusual amounts, frequent bank account changes), THE Payout_System SHALL flag the driver account for review
10. THE Payout_System SHALL encrypt all bank account information at rest using AES-256 encryption
11. THE Payout_System SHALL mask sensitive bank account information in all API responses and logs

**Property-Based Testing Guidance:**
- **Invariant**: Database transactions ensure Wallet_Balance + totalWithdrawn + pending_payout_amount remains constant
- **Error Conditions**: Concurrent payout requests are handled correctly without double-spending
- **Idempotence**: Retrying a failed payout request does not create duplicate payouts

### Requirement 10: Payout Failure Handling and Recovery

**User Story:** As a driver, I want failed payouts to be automatically retried, so that temporary issues don't prevent me from receiving my earnings.

#### Acceptance Criteria

1. WHEN a payout fails due to a transient error (network timeout, Stripe rate limit), THE Payout_Processor SHALL automatically retry
2. WHEN retrying a payout, THE Payout_Processor SHALL use exponential backoff: 1 minute, 5 minutes, 15 minutes
3. WHEN a payout fails after 3 retry attempts, THE Payout_Processor SHALL update status to "failed" and stop retrying
4. WHEN a payout fails permanently, THE Notification_Service SHALL notify the driver with the failure reason and next steps
5. IF a payout fails due to invalid bank account, THEN THE Notification_Service SHALL prompt the driver to update their bank information
6. WHEN a driver updates bank information after a failure, THE Payout_System SHALL allow manual retry of the failed payout
7. WHEN an admin manually retries a failed payout, THE Payout_System SHALL create a new Payout_Record linked to the original
8. WHEN a weekly payout fails, THE Payout_System SHALL preserve the Wallet_Balance and include it in the next weekly payout
9. WHEN an instant payout fails after balance deduction, THE Payout_System SHALL refund the full amount (including fee) to Wallet_Balance
10. THE Payout_System SHALL maintain a failure count for each driver and escalate to admin review after 5 consecutive failures

**Property-Based Testing Guidance:**
- **Invariant**: Failed instant payouts always restore the exact Wallet_Balance before the request
- **Idempotence**: Retrying the same failed payout multiple times creates only one successful transfer
- **Error Conditions**: Different failure types (network, invalid account, insufficient funds) trigger appropriate recovery actions

### Requirement 11: Payout Fee Configuration and Calculation

**User Story:** As an admin, I want to configure payout fees, so that the platform can adjust pricing based on business needs.

#### Acceptance Criteria

1. THE Payout_System SHALL store instant payout fee configuration in the database (fixed_fee and percentage_fee)
2. WHEN calculating instant payout fee, THE Payout_System SHALL compute MAX(fixed_fee, amount * percentage_fee)
3. WHEN an admin updates fee configuration, THE Payout_System SHALL apply new fees only to future payouts
4. WHEN displaying fee to driver before payout, THE Payout_System SHALL show the calculated fee amount clearly
5. WHEN a payout is completed, THE Payout_Record SHALL store the fee amount and fee configuration used
6. THE Payout_System SHALL support different fee structures for different driver tiers (standard, premium, VIP)
7. WHERE a driver qualifies for reduced fees, THE Payout_System SHALL apply the appropriate tier's fee structure
8. WHEN calculating fees, THE Payout_System SHALL round to 2 decimal places (nearest cent)
9. THE Admin_Dashboard SHALL display total fees collected per day, week, and month
10. THE Payout_System SHALL include fee information in all payout notifications and history records

**Property-Based Testing Guidance:**
- **Invariant**: Calculated fee always satisfies: fee >= fixed_fee AND fee >= (amount * percentage_fee)
- **Metamorphic**: Doubling the payout amount doubles the percentage-based fee (when percentage fee is greater than fixed fee)
- **Round Trip**: Fee calculation is deterministic and produces the same result for the same inputs

### Requirement 12: Weekly Payout Schedule Configuration

**User Story:** As an admin, I want to configure the weekly payout schedule, so that payouts can be processed at optimal times for the business.

#### Acceptance Criteria

1. THE Payout_System SHALL store weekly payout schedule configuration (day of week and time in UTC)
2. WHEN the configured schedule time arrives, THE Weekly_Payout_Scheduler SHALL execute automatically
3. WHEN an admin updates the schedule, THE Payout_System SHALL validate the new schedule is a valid day and time
4. WHEN the schedule is updated, THE Weekly_Payout_Scheduler SHALL use the new schedule for the next execution
5. THE Payout_System SHALL support disabling automatic weekly payouts globally or per driver
6. WHERE automatic payouts are disabled for a driver, THE Payout_System SHALL skip that driver during weekly processing
7. WHEN weekly payouts are disabled globally, THE Weekly_Payout_Scheduler SHALL not execute
8. THE Admin_Dashboard SHALL display the next scheduled weekly payout execution time
9. THE Admin_Dashboard SHALL allow admins to manually trigger weekly payout processing immediately
10. WHEN manually triggering weekly payouts, THE Payout_System SHALL process all eligible drivers regardless of schedule

**Property-Based Testing Guidance:**
- **Idempotence**: Manually triggering weekly payouts multiple times on the same day processes each driver only once
- **Invariant**: Disabling and re-enabling automatic payouts does not affect driver balances

### Requirement 13: Driver Document Verification

**User Story:** As a driver, I want to upload my verification documents, so that I can complete my profile and become eligible for payouts.

#### Acceptance Criteria

1. WHEN a driver uploads a verification document, THE Document_Verification_System SHALL require document type (license, insurance, vehicle_registration, other)
2. WHEN a document is uploaded, THE Document_Verification_System SHALL validate the file format is supported (PDF, JPG, PNG)
3. WHEN a document is uploaded, THE Document_Verification_System SHALL validate the file size does not exceed 10MB
4. WHEN a document is validated, THE Document_Verification_System SHALL store it securely with Document_Status "pending"
5. WHEN a document is stored, THE Document_Verification_System SHALL generate a unique document ID and record upload timestamp
6. THE Document_Verification_System SHALL support multiple documents per driver (one per document type)
7. WHEN a driver uploads a new document of the same type, THE Document_Verification_System SHALL replace the previous document
8. WHEN a document is uploaded, THE Notification_Service SHALL notify admins that a new document requires review
9. THE Document_Verification_System SHALL allow drivers to view their uploaded documents with current Document_Status
10. WHEN retrieving documents, THE Document_Verification_System SHALL return document metadata (type, status, upload date, review date) but not the file itself unless explicitly requested

**Property-Based Testing Guidance:**
- **Invariant**: Each driver has at most one document per document type at any given time
- **Error Conditions**: Invalid file formats, oversized files, and unsupported document types are rejected with specific error messages

### Requirement 14: Admin Document Verification Workflow

**User Story:** As an admin, I want to review and approve driver verification documents, so that I can ensure only qualified drivers receive payouts.

#### Acceptance Criteria

1. WHEN an admin accesses the document verification dashboard, THE Document_Verification_System SHALL display all documents with Document_Status "pending" sorted by upload date (oldest first)
2. WHEN displaying pending documents, THE Document_Verification_System SHALL show driver name, document type, upload date, and thumbnail preview
3. WHEN an admin views a document, THE Document_Verification_System SHALL display the full document with zoom and download capabilities
4. WHEN viewing a document, THE Admin_Dashboard SHALL display "Approve" and "Reject" buttons
5. WHEN an admin approves a document, THE Document_Verification_System SHALL update Document_Status to "approved" and record admin ID and timestamp
6. WHEN an admin rejects a document, THE Document_Verification_System SHALL require a rejection reason
7. WHEN a rejection reason is provided, THE Document_Verification_System SHALL update Document_Status to "rejected" and store the reason
8. WHEN a document is approved or rejected, THE Notification_Service SHALL send a notification to the driver with the decision and reason (if rejected)
9. WHEN all required documents are approved, THE Document_Verification_System SHALL mark the driver as "verified" and eligible for payouts
10. THE Document_Verification_System SHALL support filtering documents by status, document type, and driver name
11. THE Document_Verification_System SHALL support bulk approval of multiple documents from the same driver
12. WHEN a driver is marked as verified, THE Payout_System SHALL allow payout requests from that driver

**Property-Based Testing Guidance:**
- **Invariant**: A driver is marked as "verified" if and only if all required document types have Document_Status "approved"
- **Error Conditions**: Attempting to approve/reject already processed documents fails with appropriate error

### Requirement 15: Scheduled Ride Booking

**User Story:** As a user, I want to schedule rides in advance, so that I can plan my transportation ahead of time.

#### Acceptance Criteria

1. WHEN a user creates a ride booking, THE Ride_Booking_System SHALL support an optional scheduledDateTime field
2. WHEN scheduledDateTime is provided, THE Ride_Booking_System SHALL validate it is a future date and time
3. IF scheduledDateTime is in the past, THEN THE Ride_Booking_System SHALL reject the request with error message "Scheduled time must be in the future"
4. WHEN scheduledDateTime is more than 30 days in the future, THE Ride_Booking_System SHALL reject the request with error message "Cannot schedule rides more than 30 days in advance"
5. WHEN a scheduled ride is created, THE Ride_Booking_System SHALL set booking status to "scheduled"
6. WHEN a scheduled ride is created, THE Ride_Booking_System SHALL store the scheduledDateTime in UTC format
7. WHEN the scheduled time approaches (15 minutes before), THE Ride_Booking_System SHALL attempt to match the ride with available drivers
8. WHEN a driver accepts a scheduled ride, THE Ride_Booking_System SHALL update booking status to "accepted" and notify the user
9. IF no driver accepts within 10 minutes of scheduled time, THEN THE Ride_Booking_System SHALL update status to "no_driver_available" and notify the user
10. WHEN a user views their bookings, THE Ride_Booking_System SHALL display scheduled rides separately from immediate rides
11. THE Ride_Booking_System SHALL allow users to cancel scheduled rides up to 5 minutes before the scheduled time
12. WHEN a scheduled ride is cancelled, THE Ride_Booking_System SHALL refund any prepaid amount to the user

**Property-Based Testing Guidance:**
- **Invariant**: All scheduled rides have scheduledDateTime in the future at creation time
- **Error Conditions**: Past dates, dates beyond 30 days, and invalid date formats are rejected with specific error messages
- **Metamorphic**: Scheduling a ride for time T and querying bookings at time T-1 hour shows the ride as "scheduled"

### Requirement 16: Multiple Stops in Ride Booking

**User Story:** As a user, I want to add multiple stops during my ride, so that I can complete multiple errands in one trip.

#### Acceptance Criteria

1. WHEN a user creates a ride booking, THE Ride_Booking_System SHALL support an optional waypoints array field
2. WHEN waypoints are provided, THE Ride_Booking_System SHALL validate each waypoint has latitude, longitude, and address
3. WHEN waypoints are provided, THE Ride_Booking_System SHALL validate the array contains between 1 and 5 waypoints
4. IF more than 5 waypoints are provided, THEN THE Ride_Booking_System SHALL reject the request with error message "Maximum 5 stops allowed per ride"
5. WHEN waypoints are validated, THE Ride_Booking_System SHALL store them in order between pickup and destination
6. WHEN calculating fare for a ride with waypoints, THE Ride_Booking_System SHALL calculate the total distance including all waypoints
7. WHEN calculating fare, THE Ride_Booking_System SHALL add a per-stop fee of $2 USD for each waypoint
8. WHEN a ride with waypoints is in progress, THE Ride_Booking_System SHALL track arrival and departure at each waypoint
9. WHEN a driver arrives at a waypoint, THE Ride_Booking_System SHALL notify the user
10. WHEN displaying ride details, THE Ride_Booking_System SHALL show all waypoints in order with their addresses
11. THE Ride_Booking_System SHALL allow users to modify waypoints before the ride is accepted by a driver
12. WHEN waypoints are modified, THE Ride_Booking_System SHALL recalculate the fare and update the booking

**Property-Based Testing Guidance:**
- **Invariant**: Total fare with waypoints = base fare + (distance_with_waypoints * rate) + (waypoint_count * $2)
- **Error Conditions**: Invalid coordinates, missing addresses, and exceeding maximum waypoints are rejected with specific error messages
- **Metamorphic**: Adding waypoints always increases the total fare compared to direct route

---

## Requirements Summary

This requirements document defines 16 major requirements with 160 acceptance criteria covering:

- **Automated weekly payouts** with scheduling and batch processing
- **Instant on-demand payouts** with $60 minimum threshold, fees, and daily limits  
- **Bank account management** with validation, security, and support for routing numbers and card numbers
- **Stripe Connect integration** with retry logic and error handling
- **Comprehensive payout tracking** with history and audit logs
- **Driver notifications** for all payout events
- **Admin dashboard** with monitoring and management capabilities
- **Manual approval workflows** for edge cases
- **Security and fraud prevention** with encryption and validation
- **Failure handling and recovery** with automatic retries
- **Configurable fee structures** for different driver tiers
- **Flexible scheduling** for weekly payout processing
- **Driver document verification** with upload and admin approval workflow
- **Admin document review** with approve/reject capabilities
- **Scheduled ride booking** with advance date/time selection
- **Multiple stops support** with waypoints and per-stop fees

All requirements follow EARS patterns and INCOSE quality rules to ensure clarity, testability, and completeness.
