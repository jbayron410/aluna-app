module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    let firebaseConfig = null;

    if (process.env.FIREBASE_CONFIG) {
      try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
      } catch (parseErr) {
        console.error('Failed to parse FIREBASE_CONFIG JSON:', parseErr);
      }
    }

    if (!firebaseConfig && process.env.FIREBASE_API_KEY) {
      firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
      };
    }

    if (!firebaseConfig || !firebaseConfig.apiKey) {
      res.status(500).json({
        error: 'Firebase configuration is not defined in environment variables (FIREBASE_CONFIG).',
      });
      return;
    }

    const defaultAllowedEmails = [
      'bayron410@gmail.com',
      'alunaco1204@gmail.com',
    ];

    const configuredEmails = process.env.ALLOWED_EMAILS
      ? process.env.ALLOWED_EMAILS.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
      : defaultAllowedEmails;

    res.status(200).json({
      success: true,
      config: firebaseConfig,
      allowedEmails: configuredEmails,
    });
  } catch (err) {
    console.error('Failed to provide auth configuration:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
