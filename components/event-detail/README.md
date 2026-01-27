# Event Detail Component Structure

This directory contains the refactored Event Detail page components, broken down into maintainable modules.

## 📁 Directory Structure

```
event-detail/
├── hooks/
│   ├── index.ts              # Exports all hooks
│   ├── useEventData.ts       # Fetches and manages event data
│   ├── useTransactions.ts    # Fetches and manages transactions
│   ├── useAttendees.ts       # Fetches and manages attendees
│   └── useEventHandlers.ts   # Business logic and event handlers
├── modals/
│   ├── index.ts              # Exports all modals
│   ├── ComplementaryTicketModal.tsx  # Issue complimentary tickets
│   └── SuspendActivateModal.tsx      # Suspend/activate events/tickets
├── types.ts                  # TypeScript type definitions
├── utils.ts                  # Helper functions
└── README.md                 # This file
```

## 🎯 Purpose

The original `event-detail-page.tsx` was **3570 lines** - too large and difficult to maintain. This refactored structure breaks it down into:

1. **Types** - Centralized type definitions
2. **Utilities** - Pure helper functions
3. **Custom Hooks** - Data fetching and business logic
4. **Modal Components** - Reusable modal dialogs
5. **Tab Components** - Individual tab content (to be created)
6. **Main Component** - Orchestrates everything

## 🔧 Components

### Hooks

#### `useEventData(eventId)`
Fetches event data from the API with caching support.
- Returns: `{ eventData, isLoading, currency }`

#### `useTransactions(eventId, activeTab, transactionsPage, itemsPerPage, eventData)`
Fetches paginated transactions data.
- Returns: `{ transactions, transactionsLoading, transactionsStats, transactionsTotalPages, transactionsTotalElements }`

#### `useAttendees(eventId, activeTab, eventData)`
Fetches attendees list.
- Returns: `{ attendees, attendeesLoading }`

#### `useEventHandlers()`
Manages all event handlers and modal states.
- Returns: All state and handlers for complementary tickets, suspend/activate actions

### Modals

#### `ComplementaryTicketModal`
Modal for issuing complimentary tickets with email/phone validation.

#### `SuspendActivateModal`
Modal for suspending or activating events/tickets with OTP confirmation.

### Utilities

- `formatKenyanPhone()` - Format phone numbers to international format
- `validateKenyanPhone()` - Validate Kenyan phone numbers
- `validateEmail()` - Email validation
- `getPageNumbers()` - Smart pagination helper
- `getPaginatedData()` - Paginate array data
- `getTotalPages()` - Calculate total pages
- `isEventPastOrInactive()` - Check event status

## 🚀 Usage Example

```typescript
import { useEventData, useTransactions, useAttendees, useEventHandlers } from './hooks'
import { ComplementaryTicketModal, SuspendActivateModal } from './modals'
import { isEventPastOrInactive } from './utils'

function EventDetailPage({ eventId }) {
  // Fetch data
  const { eventData, isLoading, currency } = useEventData(eventId)
  const { transactions, transactionsLoading } = useTransactions(...)
  const { attendees, attendeesLoading } = useAttendees(...)
  
  // Handlers
  const {
    showComplementaryModal,
    handleIssueCompTicket,
    handleCloseCompModal,
    // ... more handlers
  } = useEventHandlers()

  return (
    <>
      {/* Your UI */}
      
      <ComplementaryTicketModal
        isOpen={showComplementaryModal}
        onSubmit={handleIssueCompTicket}
        onClose={handleCloseCompModal}
        {...otherProps}
      />
    </>
  )
}
```

## ✅ Benefits

1. **Maintainability** - Each file has a single responsibility
2. **Testability** - Easy to unit test individual functions/hooks
3. **Reusability** - Components and hooks can be reused
4. **Readability** - Easier to understand and navigate
5. **Scalability** - Easy to add new features

## 🔄 Migration Plan

To complete the refactoring:
1. ✅ Create type definitions
2. ✅ Extract utilities
3. ✅ Create data fetching hooks
4. ✅ Create event handler hooks
5. ✅ Extract modal components
6. ⏳ Extract tab components (Overview, Tickets, Transactions, Attendees)
7. ⏳ Create simplified main component
8. ⏳ Update imports in route file
9. ⏳ Test thoroughly
10. ⏳ Remove old file

## 📝 Next Steps

- Create tab components for each section
- Extract the PDF export functionality
- Create a simplified main orchestrator component
- Add comprehensive tests

