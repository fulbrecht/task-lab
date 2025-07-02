/**
 * Converts a VAPID public key string to a Uint8Array.
 * This is necessary for the Push API.
 * @param {string} base64String
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Subscribes the user to push notifications and sends the subscription to the server.
 */
async function subscribeUserToPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();

        if (existingSubscription) {
            console.log('User is already subscribed.');
            return;
        }

        // Fetch the VAPID public key from the server.
        const response = await fetch('/api/notifications/vapidPublicKey');
        if (!response.ok) throw new Error('Failed to get VAPID public key from server.');
        const vapidPublicKey = await response.text();
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

        const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true, // Required for web push
            applicationServerKey
        });

        // Send the new subscription to your backend.
        await fetch('/api/notifications/subscribe', {
            method: 'POST',
            body: JSON.stringify({ subscription: newSubscription }),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('User subscribed successfully and subscription sent to server.');
    } catch (error) {
        console.error('Failed to subscribe the user: ', error);
    }
}

export async function initializePushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported by this browser.');
        return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') await subscribeUserToPush();
}
