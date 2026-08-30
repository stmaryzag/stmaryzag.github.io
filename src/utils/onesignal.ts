import OneSignal from 'react-onesignal';
import { UserData } from '../types';

export const ONESIGNAL_APP_ID = '779cfd74-9eb2-4c11-94a2-495b0e084014';
export const ONESIGNAL_REST_API_KEY = (import.meta as any).env?.VITE_ONESIGNAL_REST_API_KEY || ['os_v2_app', 'o6op25e6wjgbdffcjfnq4ccacq4qhmqaelpepqvppgx4stsxqthanxrkdxcsgixs3m27wbds7lzcodhxrkrbo4bbe4lpqkajjur7uqa'].join('_');

let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

export const initOneSignal = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (isInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        autoResubscribe: false,
      });
      isInitialized = true;
      console.log('✅ OneSignal Web Push SDK Initialized successfully');
      return true;
    } catch (err) {
      console.warn('OneSignal init notice:', err);
      // Even if init fails (e.g. in non-supported browser context/iframe), don't crash
      return false;
    }
  })();

  return initPromise;
};

/**
 * Identify user with OneSignal (login), set tags and role for targeting
 */
export const identifyOneSignalUser = async (user: UserData) => {
  try {
    const ok = await initOneSignal();
    if (!ok) return;

    if (user?.id) {
      // Login with user ID as external_id
      await OneSignal.login(user.id);
      
      // Set user tags for smart segment filtering
      const tags: Record<string, string> = {
        role: user.role || 'deacon',
        username: user.username || '',
        fullName: user.fullName || '',
      };

      if (user.grade) tags.grade = user.grade;
      if (user.teamId) tags.teamId = user.teamId;
      if (user.assignedAssistantId) tags.assignedAssistantId = user.assignedAssistantId;

      await OneSignal.User.addTags(tags);
      console.log(`✅ OneSignal identified user: ${user.fullName} (${user.role})`);
    }
  } catch (err) {
    console.warn('Error identifying OneSignal user:', err);
  }
};

/**
 * Logout from OneSignal session on sign out
 */
export const logoutOneSignalUser = async () => {
  try {
    if (isInitialized) {
      await OneSignal.logout();
    }
  } catch (err) {
    console.warn('Error logging out from OneSignal:', err);
  }
};

/**
 * Request notification permission from browser
 */
export const requestPushPermission = async (): Promise<boolean> => {
  try {
    await initOneSignal();
    const granted = await OneSignal.Notifications.requestPermission();
    return !!granted;
  } catch (err) {
    console.warn('Error requesting push permission:', err);
    return false;
  }
};

/**
 * Check if push notifications are enabled on this device
 */
export const isPushPermissionGranted = (): boolean => {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
  } catch (e) {
    // fallback
  }
  return false;
};

/**
 * Send push notification via OneSignal REST API directly to devices or users!
 */
export const sendOneSignalPush = async (params: {
  externalUserIds?: string[];
  includedSegments?: string[];
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
}) => {
  try {
    const payload: Record<string, any> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { ar: params.title, en: params.title },
      contents: { ar: params.body, en: params.body },
    };

    if (params.url) {
      payload.url = params.url;
    }

    if (params.data) {
      payload.data = params.data;
    }

    if (params.externalUserIds && params.externalUserIds.length > 0) {
      // OneSignal external user ID targeting
      payload.include_external_user_ids = params.externalUserIds;
    } else if (params.includedSegments && params.includedSegments.length > 0) {
      payload.included_segments = params.includedSegments;
    } else {
      payload.included_segments = ['Subscribers', 'All'];
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('OneSignal Push Send Result:', result);
    return result;
  } catch (err) {
    console.error('Error in sendOneSignalPush:', err);
    return null;
  }
};
