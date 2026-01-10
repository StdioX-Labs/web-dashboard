import EditEventPage from "@/components/edit-event-page"

export default async function EditEventRoute({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const eventId = parseInt(resolvedParams.id, 10)

  return <EditEventPage eventId={eventId} />
}

