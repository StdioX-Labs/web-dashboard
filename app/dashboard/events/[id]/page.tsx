import EventDetailPage from "@/components/event-detail-page"

export default async function EventDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const eventId = parseInt(resolvedParams.id, 10)

  return <EventDetailPage eventId={eventId} />
}

