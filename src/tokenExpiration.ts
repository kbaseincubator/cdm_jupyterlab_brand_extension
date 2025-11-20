import { Dialog, showDialog } from '@jupyterlab/apputils';
import { PageConfig } from '@jupyterlab/coreutils';
import { Widget } from '@lumino/widgets';

/**
 * Response from the KBase Auth2 /api/V2/token endpoint
 */
interface TokenInfo {
  type: string;
  id: string;
  expires: number; // Unix timestamp in milliseconds
  created: number;
  name: string | null;
  user: string;
  custom: Record<string, string>;
  cachefor: number;
}

// Warning shows 5 minutes before expiration
const WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000;
// After dismissing, warning returns after 1 minute
const DISMISS_COOLDOWN_MS = 60 * 1000;
// Check token status periodically
const CHECK_INTERVAL_MS = 30 * 1000;

// Module state
let tokenExpires: number | null = null;
let warningTimerId: number | null = null;
let checkTimerId: number | null = null;
let isWarningShown = false;
let isBlocked = false;
let dismissedAt: number | null = null;

/**
 * Get the KBase origin URL from environment.
 */
const getKBaseOrigin = (): string => {
  // Try to get from PageConfig (set by JupyterHub spawner)
  const kbaseOrigin = PageConfig.getOption('kbaseOrigin');
  if (kbaseOrigin) {
    return kbaseOrigin;
  }

  // Last resort: use ci.kbase.us
  return 'https://ci.kbase.us';
};

/**
 * Get the auth token from cookies.
 */
const getAuthToken = (): string | null => {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'kbase_session' || name === 'kbase_session_backup') {
      return value;
    }
  }
  return null;
};

/**
 * Show dialog when no token is found.
 */
const showNoTokenDialog = async (): Promise<void> => {
  if (isBlocked) {
    return;
  }

  isBlocked = true;

  const body = new Widget();
  body.node.innerHTML = `
    <div class="kbase-token-expired">
      <p><strong>No KBase session token found.</strong></p>
      <p>You must authenticate with KBase to use this notebook server.</p>
    </div>
  `;

  await showDialog({
    title: 'Authentication Required',
    body,
    buttons: [
      Dialog.okButton({ label: 'Authenticate' })
    ],
    hasClose: false
  });

  redirectToReauth();
};

/**
 * Fetch token information from the KBase Auth2 API.
 * Returns true if token was found, false otherwise.
 */
const fetchTokenInfo = async (): Promise<boolean> => {
  const kbaseOrigin = getKBaseOrigin();
  const token = getAuthToken();

  if (!token) {
    console.warn('Auth token not available');
    return false;
  }

  const response = await fetch(`${kbaseOrigin}/services/auth/api/V2/token`, {
    headers: {
      'Authorization': token
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch token info: ${response.status} ${response.statusText}`);
  }

  const tokenInfo: TokenInfo = await response.json();
  tokenExpires = tokenInfo.expires;

  console.log(`Token expires at: ${new Date(tokenExpires).toISOString()}`);
  return true;
};

/**
 * Redirect to KBase login page for re-authentication.
 */
const redirectToReauth = (): void => {
  const kbaseOrigin = getKBaseOrigin();
  const returnUrl = encodeURIComponent(window.location.href);
  window.location.href = `${kbaseOrigin}/login?nextrequest=${returnUrl}`;
};

/**
 * Show the dismissable warning dialog.
 */
const showWarningDialog = async (): Promise<void> => {
  if (isWarningShown || isBlocked || tokenExpires === null) {
    return;
  }

  isWarningShown = true;

  const timeLeft = tokenExpires - Date.now();
  const minutesLeft = Math.max(0, Math.ceil(timeLeft / 60000));

  const body = new Widget();
  body.node.innerHTML = `
    <div class="kbase-token-warning">
      <p><strong>Your session token will expire in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.</strong></p>
      <p>To continue working, please re-authenticate with KBase.</p>
      <p>You can dismiss this warning, but it will appear again in one minute if you haven't re-authenticated.</p>
    </div>
  `;

  const result = await showDialog({
    title: 'Session Expiring Soon',
    body,
    buttons: [
      Dialog.cancelButton({ label: 'Dismiss' }),
      Dialog.okButton({ label: 'Re-authenticate' })
    ]
  });

  isWarningShown = false;

  if (result.button.accept) {
    redirectToReauth();
  } else {
    dismissedAt = Date.now();
  }
};

/**
 * Show the blocking dialog that prevents further work.
 */
const showBlockingDialog = async (): Promise<void> => {
  if (isBlocked) {
    return;
  }

  isBlocked = true;

  // Clear any pending timers
  if (warningTimerId !== null) {
    clearTimeout(warningTimerId);
    warningTimerId = null;
  }
  if (checkTimerId !== null) {
    clearInterval(checkTimerId);
    checkTimerId = null;
  }

  const body = new Widget();
  body.node.innerHTML = `
    <div class="kbase-token-expired">
      <p><strong>Your session token has expired.</strong></p>
      <p>You must re-authenticate with KBase to continue working.</p>
      <p>Any unsaved work may be lost. Please save your notebooks before re-authenticating.</p>
    </div>
  `;

  await showDialog({
    title: 'Session Expired',
    body,
    buttons: [
      Dialog.okButton({ label: 'Re-authenticate' })
    ],
    hasClose: false
  });

  redirectToReauth();
};

/**
 * Check current token status and show appropriate dialogs.
 */
const checkTokenStatus = (): void => {
  if (tokenExpires === null) {
    return;
  }

  const now = Date.now();

  // Check if token has expired
  if (now >= tokenExpires && !isBlocked) {
    showBlockingDialog();
    return;
  }

  // Check if we should show warning again after dismiss cooldown
  if (dismissedAt !== null && !isWarningShown && !isBlocked) {
    const timeSinceDismiss = now - dismissedAt;
    const timeUntilExpiry = tokenExpires - now;

    if (timeSinceDismiss >= DISMISS_COOLDOWN_MS && timeUntilExpiry <= WARNING_BEFORE_EXPIRY_MS) {
      showWarningDialog();
    }
  }
};

/**
 * Schedule the warning dialog to appear before token expiration.
 */
const scheduleWarning = (): void => {
  if (tokenExpires === null) {
    return;
  }

  const now = Date.now();
  const warningTime = tokenExpires - WARNING_BEFORE_EXPIRY_MS;
  const delay = Math.max(0, warningTime - now);

  if (delay === 0 && now < tokenExpires) {
    // We're already within the warning window
    showWarningDialog();
  } else if (delay > 0) {
    warningTimerId = window.setTimeout(() => {
      showWarningDialog();
    }, delay);

    console.log(`Warning scheduled in ${Math.round(delay / 1000)} seconds`);
  } else {
    // Token already expired
    showBlockingDialog();
  }
};

/**
 * Start periodic checks for token status.
 */
const startPeriodicCheck = (): void => {
  checkTimerId = window.setInterval(() => {
    checkTokenStatus();
  }, CHECK_INTERVAL_MS);
};

/**
 * Initialize and start monitoring token expiration.
 */
export const startTokenExpirationMonitor = async (): Promise<void> => {
  try {
    const hasToken = await fetchTokenInfo();

    if (!hasToken) {
      // No token found - show blocking dialog
      showNoTokenDialog();
      return;
    }

    scheduleWarning();
    startPeriodicCheck();
  } catch (error) {
    console.error('Failed to initialize token expiration monitoring:', error);
    // If we can't verify the token, show the no-token dialog
    showNoTokenDialog();
  }
};

/**
 * Stop monitoring and clean up.
 */
export const stopTokenExpirationMonitor = (): void => {
  if (warningTimerId !== null) {
    clearTimeout(warningTimerId);
    warningTimerId = null;
  }
  if (checkTimerId !== null) {
    clearInterval(checkTimerId);
    checkTimerId = null;
  }
};
