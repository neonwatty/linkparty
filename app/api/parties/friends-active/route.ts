import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.replace('Bearer ', '')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return Response.json({ parties: [] })
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
  if (friendIds.length === 0) return Response.json({ parties: [] })

  // 2. Find party_members rows for friends
  const { data: memberRows } = await supabase.from('party_members').select('party_id, user_id').in('user_id', friendIds)

  const partyIds = [...new Set((memberRows || []).map((m) => m.party_id))]
  if (partyIds.length === 0) return Response.json({ parties: [] })

  // 3. Get visible, non-expired parties
  const { data: parties } = await supabase
    .from('parties')
    .select('id, code, name, created_at, expires_at')
    .in('id', partyIds)
    .eq('visible_to_friends', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  if (!parties || parties.length === 0) return Response.json({ parties: [] })

  // 4. Get member counts and host info for each party
  const result = await Promise.all(
    parties.map(async (party) => {
      const { count } = await supabase
        .from('party_members')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', party.id)

      const { data: hostMember } = await supabase
        .from('party_members')
        .select('user_id, display_name')
        .eq('party_id', party.id)
        .eq('is_host', true)
        .single()

      let hostName = hostMember?.display_name || 'Someone'
      if (hostMember?.user_id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('id', hostMember.user_id)
          .single()
        if (profile) hostName = profile.display_name
      }

      return {
        id: party.id,
        code: party.code,
        name: party.name,
        hostName,
        memberCount: count || 1,
        expiresAt: party.expires_at,
      }
    }),
  )

  return Response.json({ parties: result })
}
