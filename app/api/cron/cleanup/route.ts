import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 50

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this automatically for cron jobs)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let totalDeleted = 0
    let totalImagesDeleted = 0
    let hasMore = true

    while (hasMore) {
      // Fetch a batch of expired parties
      const { data: expiredParties, error: fetchError } = await supabase
        .from('parties')
        .select('id')
        .lt('expires_at', new Date().toISOString())
        .limit(BATCH_SIZE)

      if (fetchError) {
        console.error('Failed to fetch expired parties:', fetchError)
        return NextResponse.json({ error: 'Failed to fetch expired parties' }, { status: 500 })
      }

      if (!expiredParties || expiredParties.length === 0) {
        hasMore = false
        break
      }

      const partyIds = expiredParties.map((p) => p.id)

      // Collect image storage paths from queue_items for these parties
      const { data: imageItems } = await supabase
        .from('queue_items')
        .select('image_storage_path')
        .in('party_id', partyIds)
        .not('image_storage_path', 'is', null)

      // Delete images from storage bucket
      if (imageItems && imageItems.length > 0) {
        const storagePaths = imageItems
          .map((item) => item.image_storage_path)
          .filter((path): path is string => Boolean(path))

        if (storagePaths.length > 0) {
          const { error: storageError } = await supabase.storage.from('queue-images').remove(storagePaths)

          if (storageError) {
            console.error('Failed to delete storage images:', storageError)
            // Continue with party deletion even if storage cleanup fails
          } else {
            totalImagesDeleted += storagePaths.length
          }
        }
      }

      // Delete parties (CASCADE handles party_members, queue_items, notification_logs)
      const { error: deleteError } = await supabase.from('parties').delete().in('id', partyIds)

      if (deleteError) {
        console.error('Failed to delete expired parties:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete expired parties', deletedSoFar: totalDeleted },
          { status: 500 },
        )
      }

      totalDeleted += partyIds.length

      // If we got fewer than BATCH_SIZE, we're done
      if (expiredParties.length < BATCH_SIZE) {
        hasMore = false
      }
    }

    // Clean up expired invite tokens
    let tokensDeleted = 0
    const { data: deletedTokens, error: tokenError } = await supabase
      .from('invite_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (tokenError) {
      console.error('Failed to delete expired invite tokens:', tokenError)
    } else {
      tokensDeleted = deletedTokens?.length ?? 0
    }

    // Clean up old read notifications (older than 30 days)
    let notificationsDeleted = 0
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: deletedNotifications, error: notifError } = await supabase
      .from('notifications')
      .delete()
      .eq('read', true)
      .lt('created_at', thirtyDaysAgo)
      .select('id')

    if (notifError) {
      console.error('Failed to delete old notifications:', notifError)
    } else {
      notificationsDeleted = deletedNotifications?.length ?? 0
    }

    console.log(
      `Cleanup complete: ${totalDeleted} parties deleted, ${totalImagesDeleted} images removed, ${tokensDeleted} expired tokens deleted, ${notificationsDeleted} old notifications deleted`,
    )

    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      imagesDeleted: totalImagesDeleted,
      tokensDeleted,
      notificationsDeleted,
    })
  } catch (err) {
    console.error('Cron cleanup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
