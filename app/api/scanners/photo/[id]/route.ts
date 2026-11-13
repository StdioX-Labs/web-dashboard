import { NextRequest, NextResponse } from 'next/server'
import { soldOutImage, soldOutJson } from '@/lib/soldout-proxy'
import { idFrom, requireOwnEvent, scannerAccess } from '@/lib/scanner-access'

/**
 * The photo a gate scanner took of a scan. Core serves photos by id alone, so
 * the event and barcode come along: the event must be the owner's and the
 * photo must be one taken of that ticket there.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = idFrom((await params).id)
  const eventId = idFrom(request.nextUrl.searchParams.get('eventId'))
  const barcode = request.nextUrl.searchParams.get('barcode')?.trim() ?? ''
  if (!id || !eventId || !barcode || barcode.length > 64) {
    return NextResponse.json({ status: false, message: 'A photo is required' }, { status: 400 })
  }

  const access = await scannerAccess(request)
  if (access instanceof NextResponse) return access
  const notOwn = await requireOwnEvent(access.companyId, eventId)
  if (notOwn) return notOwn

  const taken = await soldOutJson(`/gate/admin/photos?eventId=${eventId}&barcode=${encodeURIComponent(barcode)}`)
  const photos = taken.ok && Array.isArray(taken.data.photos) ? (taken.data.photos as Array<Record<string, unknown>>) : []
  if (!photos.some((p) => Number(p.id) === id)) {
    return NextResponse.json({ status: false, message: 'Photo not found' }, { status: 404 })
  }

  const jpeg = await soldOutImage(`/gate/admin/photo/${id}`)
  if (!jpeg) return NextResponse.json({ status: false, message: 'Photo not found' }, { status: 404 })
  return new NextResponse(jpeg, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' },
  })
}
