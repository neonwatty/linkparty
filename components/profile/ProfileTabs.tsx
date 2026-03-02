'use client'

import { useState, useEffect, useCallback } from 'react'
import ProfileEditor from './ProfileEditor'
import FriendsList from './FriendsList'
import FriendRequests from './FriendRequests'
import BlockedUsers from './BlockedUsers'
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  listBlockedUsers,
  unblockUser,
  blockUser,
} from '@/lib/friends'
import type { FriendWithProfile, FriendRequest, OutgoingRequest } from '@/lib/friends'
import type { UserProfile } from '@/lib/profile'

type Tab = 'profile' | 'friends' | 'requests' | 'blocked'

export default function ProfileTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Friends data
  const [friends, setFriends] = useState<FriendWithProfile[]>([])
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [friendsFetched, setFriendsFetched] = useState(false)

  // Requests data
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<OutgoingRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsFetched, setRequestsFetched] = useState(false)

  // Blocked users data
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([])
  const [blockedLoading, setBlockedLoading] = useState(true)
  const [blockedFetched, setBlockedFetched] = useState(false)

  const fetchFriends = useCallback(async () => {
    setFriendsLoading(true)
    setFetchError(null)
    try {
      const data = await listFriends()
      setFriends(data)
      setFriendsFetched(true)
    } catch {
      setFetchError('Failed to load friends')
    } finally {
      setFriendsLoading(false)
    }
  }, [])

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true)
    setFetchError(null)
    try {
      const [inc, out] = await Promise.all([listIncomingRequests(), listOutgoingRequests()])
      setIncoming(inc)
      setOutgoing(out)
      setRequestsFetched(true)
    } catch {
      setFetchError('Failed to load requests')
    } finally {
      setRequestsLoading(false)
    }
  }, [])

  const fetchBlocked = useCallback(async () => {
    setBlockedLoading(true)
    setFetchError(null)
    try {
      const data = await listBlockedUsers()
      setBlockedUsers(data)
      setBlockedFetched(true)
    } catch {
      setFetchError('Failed to load blocked users')
    } finally {
      setBlockedLoading(false)
    }
  }, [])

  // Lazy-load tab data when tab is first activated
  useEffect(() => {
    if (activeTab === 'friends' && !friendsFetched) fetchFriends()
    if (activeTab === 'requests' && !requestsFetched) fetchRequests()
    if (activeTab === 'blocked' && !blockedFetched) fetchBlocked()
  }, [activeTab, friendsFetched, requestsFetched, blockedFetched, fetchFriends, fetchRequests, fetchBlocked])

  // Mutation handlers
  const handleRemoveFriend = useCallback(
    async (friendshipId: string) => {
      const result = await removeFriend(friendshipId)
      if (!result.error) await fetchFriends()
    },
    [fetchFriends],
  )

  const handleAccept = useCallback(
    async (friendshipId: string) => {
      const result = await acceptFriendRequest(friendshipId)
      if (!result.error) {
        await Promise.all([fetchFriends(), fetchRequests()])
      }
    },
    [fetchFriends, fetchRequests],
  )

  const handleDecline = useCallback(
    async (friendshipId: string) => {
      const result = await declineFriendRequest(friendshipId)
      if (!result.error) await fetchRequests()
    },
    [fetchRequests],
  )

  const handleCancel = useCallback(
    async (friendshipId: string) => {
      const result = await cancelFriendRequest(friendshipId)
      if (!result.error) await fetchRequests()
    },
    [fetchRequests],
  )

  const handleBlockUser = useCallback(
    async (userId: string) => {
      const result = await blockUser(userId)
      if (!result.error) {
        await Promise.all([fetchFriends(), fetchBlocked()])
      }
    },
    [fetchFriends, fetchBlocked],
  )

  const handleUnblock = useCallback(
    async (userId: string) => {
      const result = await unblockUser(userId)
      if (!result.error) await fetchBlocked()
    },
    [fetchBlocked],
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'friends', label: 'Friends' },
    { key: 'requests', label: 'Requests' },
    { key: 'blocked', label: 'Blocked' },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-6 border-b border-surface-800 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'text-accent-400 border-b-2 border-accent-500'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.key === 'requests' && incoming.length > 0 && (
                <span className="bg-accent-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {incoming.length}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {fetchError}
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'profile' && <ProfileEditor />}
      {activeTab === 'friends' && (
        <FriendsList
          friends={friends}
          loading={friendsLoading}
          onRemoveFriend={handleRemoveFriend}
          onBlockUser={handleBlockUser}
        />
      )}
      {activeTab === 'requests' && (
        <FriendRequests
          incoming={incoming}
          outgoing={outgoing}
          loading={requestsLoading}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onCancel={handleCancel}
        />
      )}
      {activeTab === 'blocked' && (
        <BlockedUsers blockedUsers={blockedUsers} loading={blockedLoading} onUnblock={handleUnblock} />
      )}
    </div>
  )
}
