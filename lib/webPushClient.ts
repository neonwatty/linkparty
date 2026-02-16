'use client'

import { logger } from './logger'
import { supabase } from './supabase'

const log = logger.createLogger('WebPushClient')

/**
 * Convert a URL-safe base64 VAPID public key to a Uint8Array
 * for use with PushManager.subscribe().
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Get the existing push subscription from the service worker, if any.
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch (err) {
    log.error('Failed to get existing subscription', err)
    return null
  }
}

/**
 * Subscribe the browser to push notifications.
 * Requests permission, subscribes via PushManager, and saves the token to the server.
 */
export async function subscribeToPush(sessionId: string): Promise<boolean> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    log.error('VAPID public key not configured')
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      log.debug('Notification permission denied')
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    })

    // Get auth token for Bearer authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) {
      log.error('No auth session — cannot subscribe to push')
      return false
    }

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sessionId, subscription: subscription.toJSON() }),
    })

    if (!response.ok) {
      log.error('Failed to save subscription to server', await response.text())
      return false
    }

    log.debug('Push subscription saved')
    return true
  } catch (err) {
    log.error('Failed to subscribe to push', err)
    return false
  }
}

/**
 * Unsubscribe from push notifications and remove the token from the server.
 */
export async function unsubscribeFromPush(sessionId: string): Promise<boolean> {
  try {
    const subscription = await getExistingSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }

    // Get auth token for Bearer authentication
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) {
      log.error('No auth session — cannot unsubscribe from push')
      return false
    }

    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sessionId }),
    })

    log.debug('Push subscription removed')
    return true
  } catch (err) {
    log.error('Failed to unsubscribe from push', err)
    return false
  }
}
