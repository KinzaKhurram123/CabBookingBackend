const cron = require('node-cron');
const User = require('../models/user');
const Rider = require('../models/riderModel');

/**
 * Runs every day at 2:00 AM
 * Permanently deletes accounts where scheduledDeletionAt has passed
 */
const startAccountDeletionCron = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('[AccountDeletionCron] Running scheduled account deletion check...');

    try {
      const now = new Date();

      // Find all users scheduled for deletion
      const usersToDelete = await User.find({
        isActive: false,
        scheduledDeletionAt: { $lte: now },
      });

      if (usersToDelete.length === 0) {
        console.log('[AccountDeletionCron] No accounts to delete.');
        return;
      }

      console.log(`[AccountDeletionCron] Found ${usersToDelete.length} account(s) to permanently delete.`);

      for (const user of usersToDelete) {
        try {
          // Delete linked rider profile first
          await Rider.findOneAndDelete({ user: user._id });

          // Delete the user
          await User.findByIdAndDelete(user._id);

          console.log(`[AccountDeletionCron] Permanently deleted user: ${user._id} (${user.email})`);
        } catch (err) {
          console.error(`[AccountDeletionCron] Failed to delete user ${user._id}:`, err.message);
        }
      }
    } catch (error) {
      console.error('[AccountDeletionCron] Cron job error:', error.message);
    }
  });

  console.log('[AccountDeletionCron] Account deletion cron job scheduled (runs daily at 2:00 AM)');
};

module.exports = { startAccountDeletionCron };
