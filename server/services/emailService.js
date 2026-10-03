const { db } = require('../db/database');

const emailQueue = [];
let isProcessingQueue = false;

// Mock / Log Email Dispatcher
async function sendEmail({ to, bcc, subject, body }) {
  // Enforce privacy: never combine multiple 'to' addresses in a single header
  if (Array.isArray(to) && to.length > 1) {
    // Convert to BCC or individual sends
    bcc = to;
    to = 'noreply@healthsec.gov.in';
  }

  const emailRecord = {
    timestamp: new Date().toISOString(),
    to: to || 'noreply@healthsec.gov.in',
    bcc: bcc || [],
    subject,
    body
  };

  console.log(`[EMAIL DISPATCH] Subject: "${subject}" | To: ${emailRecord.to} | BCC Count: ${emailRecord.bcc.length}`);
  return { success: true, emailRecord };
}

function queueEmail(emailPayload) {
  emailQueue.push({ ...emailPayload, retries: 0 });
  processEmailQueue();
}

async function processEmailQueue() {
  if (isProcessingQueue || emailQueue.length === 0) return;
  isProcessingQueue = true;

  while (emailQueue.length > 0) {
    const job = emailQueue.shift();
    try {
      await sendEmail(job);
    } catch (err) {
      console.error('Email send failed:', err.message);
      if (job.retries < 3) {
        job.retries += 1;
        emailQueue.push(job); // Retry queue
      }
    }
  }

  isProcessingQueue = false;
}

// 24-Hour Disease Alert Deduplication Check
function sendDiseaseAlertDeduplicated(disease, city, casesCount, recipientEmails = []) {
  return new Promise((resolve, reject) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    db.get(
      'SELECT * FROM disease_alerts WHERE disease = ? AND city = ? AND alert_sent_at > ?',
      [disease, city, twentyFourHoursAgo],
      async (err, row) => {
        if (err) return reject(err);

        if (row) {
          console.log(`[ALERT DEDUPLICATED] Alert for ${disease} in ${city} already sent within 24 hours. Suppressing duplicate.`);
          return resolve({ sent: false, reason: 'Duplicate alert within 24h window' });
        }

        // Fetch users in that city who have alerts_enabled = 1
        db.all(
          `SELECT u.email FROM users u 
           LEFT JOIN user_preferences p ON u.id = p.user_id 
           WHERE (p.alerts_enabled IS NULL OR p.alerts_enabled = 1)`,
          [],
          async (dbErr, userRows) => {
            if (dbErr) return reject(dbErr);

            const bccList = recipientEmails.length > 0 
              ? recipientEmails 
              : userRows.map(u => u.email);

            if (bccList.length === 0) {
              return resolve({ sent: false, reason: 'No subscribed recipients found' });
            }

            // Record alert sent timestamp in DB
            db.run(
              'INSERT INTO disease_alerts (disease, city, cases_count, alert_sent_at) VALUES (?, ?, ?, ?)',
              [disease, city, casesCount, new Date().toISOString()]
            );

            // Dispatch using BCC to prevent email address exposure across users
            queueEmail({
              to: 'alerts@healthsec.gov.in',
              bcc: bccList,
              subject: `🚨 HEALTH ALERT: High Case Spike for ${disease} in ${city}`,
              body: `Attention Resident / Healthcare Provider,\n\nA sudden spike of ${casesCount} cases of ${disease} has been reported in ${city}.\nPlease follow health guidelines and take preventive precautions.\n\nTo manage alert preferences, visit your account settings.`
            });

            resolve({ sent: true, recipientCount: bccList.length });
          }
        );
      }
    );
  });
}

function sendLockoutNotification(userEmail) {
  queueEmail({
    to: userEmail,
    subject: '⚠️ Security Alert: Account Temporarily Locked',
    body: 'Your account has been temporarily locked for 15 minutes due to 5 consecutive incorrect password attempts.\nIf this was not you, please reset your password immediately.'
  });
}

function sendNewDeviceLoginAlert(userEmail, device, ipAddress) {
  queueEmail({
    to: userEmail,
    subject: '🔔 Security Alert: New Device Login Detected',
    body: `We noticed a new login to your account.\nDevice: ${device}\nIP Address: ${ipAddress}\nTime: ${new Date().toLocaleString()}\n\nIf this wasn't you, please log out active sessions immediately from your Security Dashboard.`
  });
}

module.exports = {
  sendEmail,
  queueEmail,
  sendDiseaseAlertDeduplicated,
  sendLockoutNotification,
  sendNewDeviceLoginAlert
};
