"use client"

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'

export default function TestEventAPIPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventId, setEventId] = useState('155')

  const testAPI = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Testing API with eventId:', eventId)
      const response = await api.event.getById(parseInt(eventId))
      console.log('API Response:', response)
      setResult(response)
    } catch (err) {
      console.error('API Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test Event API</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Event ID:</label>
            <input
              type="number"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter event ID"
            />
          </div>

          <button
            onClick={testAPI}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test API'}
          </button>

          {loading && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800">Loading...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-bold text-red-900 mb-2">Error:</h3>
              <pre className="text-red-800 text-sm whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-bold text-green-900 mb-2">Success! Event Data:</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Event Name:</strong> {result.event?.eventName}</p>
                <p><strong>Location:</strong> {result.event?.eventLocation}</p>
                <p><strong>Description:</strong> {result.event?.eventDescription}</p>
                <p><strong>Number of Tickets:</strong> {result.event?.tickets?.length}</p>

                {result.event?.tickets?.map((ticket: any, index: number) => (
                  <div key={index} className="mt-4 p-3 bg-white rounded border">
                    <p><strong>Ticket {index + 1}:</strong> {ticket.ticketName}</p>
                    <p><strong>Price:</strong> {ticket.ticketPrice}</p>
                    <p><strong>Quantity:</strong> {ticket.quantityAvailable}</p>
                    <p><strong>Limit Per Person:</strong> {ticket.ticketLimitPerPerson}</p>
                    <p><strong>Complementary:</strong> {ticket.numberOfComplementary}</p>
                    <p><strong>Tickets To Issue:</strong> {ticket.ticketsToIssue}</p>
                  </div>
                ))}
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-green-900 font-medium">View Full JSON</summary>
                <pre className="mt-2 text-xs overflow-auto bg-white p-4 rounded border">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

