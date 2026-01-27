import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { Transaction, TransactionsStats, EventData } from '../types'

/**
 * Hook to fetch and manage transactions data
 */
export function useTransactions(
  eventId: number,
  activeTab: string,
  transactionsPage: number,
  itemsPerPage: number,
  eventData: EventData | null
) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionsStats, setTransactionsStats] = useState<TransactionsStats | null>(null)
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1)
  const [transactionsTotalElements, setTransactionsTotalElements] = useState(0)

  useEffect(() => {
    const fetchTransactions = async () => {
      if (activeTab !== 'transactions' || !eventData) return

      setTransactionsLoading(true)
      try {
        const response = await api.transactions.fetchDetailed({
          id: eventId,
          idType: 'event',
          transactionType: 'TICKET_SALE',
          page: transactionsPage - 1, // API uses 0-based indexing
          size: itemsPerPage,
        })

        if (response.status && response.data) {
          // Transform API data to match component format
          const transformedTransactions = response.data.data.map((txn) => {
            const buyerName = txn.buyer.firstName && txn.buyer.lastName
              ? `${txn.buyer.firstName} ${txn.buyer.lastName}`
              : txn.buyer.firstName || txn.buyer.lastName || 'Unknown'

            return {
              id: txn.transactionId,
              buyer: buyerName,
              email: txn.buyer.email || 'N/A',
              ticketType: txn.ticket.ticketName,
              quantity: 1, // Each transaction is for 1 ticket based on API response
              amount: txn.transactionAmount,
              date: new Date(txn.createdAt).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }).replace(',', ''),
              status: 'completed', // All fetched transactions are completed
              barcode: txn.barcode,
              platformFee: txn.platformFee,
            }
          })

          setTransactions(transformedTransactions)
          setTransactionsTotalPages(response.data.totalPages)
          setTransactionsTotalElements(response.data.totalElements)

          // Set stats if available
          if (response.stats) {
            setTransactionsStats(response.stats)
          }
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
        toast.error('Failed to load transactions')
      } finally {
        setTransactionsLoading(false)
      }
    }

    fetchTransactions()
  }, [activeTab, transactionsPage, eventId, eventData, itemsPerPage])

  return {
    transactions,
    transactionsLoading,
    transactionsStats,
    transactionsTotalPages,
    transactionsTotalElements,
  }
}

