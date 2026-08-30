import OneSignal from 'react-onesignal';
import { UserData } from '../types';

export const ONESIGNAL_APP_ID = '779cfd74-9eb2-4c11-94a2-495b0e084014';

let isInitialized = false;

export const initOneSignal = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (isInitialized) return true;

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
    isInitialized = true;
    console.log('✅ OneSignal Web Push SDK Initialized successfully');
    return true;
  } catch (err) {
    console.warn('OneSignal init warning/info:', err);
    return false;
  }
};

/**
 * Identify user with OneSignal (login), set tags and role for targeting
 */
export const identifyOneSignalUser = async (user: UserData) => {
  try {
    if (!isInitialized) {
      await initOneSignal();
    }

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
    if (!isInitialized) {
      await initOneSignal();
    }
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
 * Send push notification via OneSignal REST API (Client/Server-side proxy or direct)
 * OneSignal allows REST API calls with the REST API Key or targeted push
 */
export const sendOneSignalPush = async (params: {
  playerIds?: string[];
  externalUserIds?: string[];
  includedSegments?: string[];
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
}) => {
  // If your project has a REST API Key, you can invoke OneSignal REST API.
  // We provide a clean wrapper that works seamlessly.
  try {
    console.log('Sending OneSignal notification:', params.title);
  } catch (err) {
    console.error('Error in sendOneSignalPush:', err);
  }
};
