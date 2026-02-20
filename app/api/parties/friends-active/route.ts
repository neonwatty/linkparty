import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CACHE_HEADERS = { 'Cache-Control': 'private, max-age=30' }

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.replace('Bearer ', '')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return Response.json({ parties: [] }, { headers: CACHE_HEADERS })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Get accepted friend IDs
  const { data: friendships } = await supabase
    .from('friendships')
    .select('friend_id')
    .eq('user_id', user.id)
    .eq('status', 'accepted')

  const friendIds = (friendships || []).map((f) => f.friend_id)
  if (friendIds.length === 0) return Response.json({ parties: [] }, { headers: CACHE_HEADERS })

  // 2. Find party_members rows for friends
  const { data: memberRows } = await supabase.from('party_members').select('party_id, user_id').in('user_id', friendIds)

  const partyIds = [...new Set((memberRows || []).map((m) => m.party_id))]
  if (partyIds.length === 0) return Response.json({ parties: [] }, { headers: CACHE_HEADERS })

  // 3. Get visible, non-expired parties
  const { data: parties } = await supabase
    .from('parties')
    .select('id, code, name, created_at, expires_at')
    .in('id', partyIds)
    .eq('visible_to_friends', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  if (!parties || parties.length === 0) return Response.json({ parties: [] }, { headers: CACHE_HEADERS })

  // 4. Batch-fetch all members for these parties in a single query
  const visiblePartyIds = parties.map((p) => p.id)
  const { data: allMembers } = await supabase
    .from('party_members')
    .select('party_id, user_id, display_name, is_host')
    .in('party_id', visiblePartyIds)

  // Build per-party member counts and host info in memory
  const memberCountByParty = new Map<string, number>()
  const hostByParty = new Map<string, { user_id: string | null; display_name: string }>()

  for (const member of allMembers || []) {
    memberCountByParty.set(member.party_id, (memberCountByParty.get(member.party_id) || 0) + 1)
    if (member.is_host) {
      hostByParty.set(member.party_id, { user_id: member.user_id, display_name: member.display_name })
    }
  }

  // Batch-fetch host profiles for hosts that have a user_id
  const hostUserIds = [...hostByParty.values()].map((h) => h.user_id).filter((id): id is string => id !== null)

  const profileByUserId = new Map<string, string>()
  if (hostUserIds.length > 0) {
    const { data: profiles } = await supabase.from('user_profiles').select('id, display_name').in('id', hostUserIds)

    for (const profile of profiles || []) {
      profileByUserId.set(profile.id, profile.display_name)
    }
  }

  // Assemble results from in-memory data
  const result = parties.map((party) => {
    const host = hostByParty.get(party.id)
    let hostName = host?.display_name || 'Someone'
    if (host?.user_id && profileByUserId.has(host.user_id)) {
      hostName = profileByUserId.get(host.user_id)!
    }

    return {
      id: party.id,
      code: party.code,
      name: party.name,
      hostName,
      memberCount: memberCountByParty.get(party.id) || 1,
      expiresAt: party.expires_at,
    }
  })

  return Response.json({ parties: result }, { headers: CACHE_HEADERS })
}
