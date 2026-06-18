# Integration Guide: Using the New Features

## Quick Start Integration

### 1. Enable Undo Shortcuts Globally

In your main App component:

```tsx
import { useUndoShortcuts } from './hooks/useUndoShortcuts';
import { UndoToast } from './components/undo/UndoToast';

export function App() {
  // Enable keyboard shortcuts
  useUndoShortcuts();

  return (
    <div className="app">
      {/* Your app content */}
      <UndoToast /> {/* Shows undo notifications */}
    </div>
  );
}
```

### 2. Add Trash View to Navigation

In your navigation/routing setup:

```tsx
import { TrashView } from './features/trash/TrashView';

// Add to your routes
const routes = [
  // ... other routes
  { path: '/trash', component: TrashView, label: 'Trash' }
];
```

### 3. Add Undo/Redo Buttons to Toolbars

In any toolbar or action bar:

```tsx
import { UndoButton } from './components/undo/UndoButton';
import { RedoButton } from './components/undo/RedoButton';

export function ActionBar() {
  return (
    <div className="action-bar">
      <UndoButton size="md" showLabel={true} />
      <RedoButton size="md" showLabel={true} />
      {/* ... other buttons ... */}
    </div>
  );
}
```

### 4. Add Recurrence Setup to Reminders

In your reminder creation/edit dialog:

```tsx
import { RecurrenceSetup } from './features/reminders/RecurrenceSetup';
import { useState } from 'react';

export function ReminderDialog() {
  const [recurrenceRule, setRecurrenceRule] = useState('daily');
  const [customPattern, setCustomPattern] = useState();
  const [showRecurrence, setShowRecurrence] = useState(false);

  return (
    <>
      <Button onClick={() => setShowRecurrence(true)}>
        Set Recurrence
      </Button>
      
      {showRecurrence && (
        <RecurrenceSetup
          recurrenceRule={recurrenceRule}
          customPattern={customPattern}
          onRecurrenceChange={(rule, pattern) => {
            setRecurrenceRule(rule);
            setCustomPattern(pattern);
          }}
          onClose={() => setShowRecurrence(false)}
        />
      )}
    </>
  );
}
```

### 5. Add Calendar Date Navigator

In your date selection contexts:

```tsx
import { CalendarDateNavigator } from './features/calendar/CalendarDateNavigator';
import { useState } from 'react';

export function DateSelector() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <button onClick={() => setShowPicker(true)}>
        {selectedDate.toLocaleDateString()}
      </button>

      {showPicker && (
        <CalendarDateNavigator
          currentDate={selectedDate}
          onDateChange={(date) => {
            setSelectedDate(date);
            setShowPicker(false); // Optional: close after selection
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
```

---

## Using the Undo Store Directly

### In Components

```tsx
import { useUndoStore } from './store/undo-store';

export function MyComponent() {
  const canUndo = useUndoStore((state) => state.canUndo());
  const canRedo = useUndoStore((state) => state.canRedo());
  const undo = useUndoStore((state) => state.undo);
  const redo = useUndoStore((state) => state.redo);

  return (
    <>
      <button onClick={() => undo()} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={() => redo()} disabled={!canRedo}>
        Redo
      </button>
    </>
  );
}
```

### Adding Actions to History

```tsx
import { useUndoStore } from './store/undo-store';
import { ipc } from './lib/ipc';

export function ItemEditor({ itemId, itemType }) {
  const addAction = useUndoStore((state) => state.addAction);

  const handleDelete = async () => {
    // Get current item data
    const item = await ipc.items.get(itemId);

    // Add to undo history
    addAction({
      id: itemId,
      type: 'delete',
      entityType: itemType,
      entityId: itemId,
      entityName: item.title,
      timestamp: Date.now(),
      previousState: item,
      restore: async () => {
        // Restore logic
        await ipc.trash.restore(trashId);
      },
      canUndo: true
    });

    // Then delete
    await ipc.items.delete(itemId);
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

---

## Using Recurrence Utilities

```tsx
import {
  calculateNextReminderDate,
  getRecurrenceDescription,
  validateCustomPattern,
  type CustomRecurrencePattern
} from './lib/recurrence-utils';

// Calculate next occurrence
const today = new Date();
const nextOccurrence = calculateNextReminderDate(
  today,
  'custom',
  {
    frequency: 'every_x_days',
    interval: 5 // Every 5 days
  }
);

// Get description
const description = getRecurrenceDescription('custom', {
  frequency: 'every_day_of_week',
  daysOfWeek: [1, 3, 5] // Mon, Wed, Fri
});
console.log(description); // "Every Monday, Wednesday, Friday"

// Validate pattern
const error = validateCustomPattern({
  frequency: 'every_x_days',
  interval: 0 // Invalid!
});
if (error) {
  console.error(error); // "Interval must be at least 1"
}
```

---

## Accessing Trash Items

```tsx
import { ipc } from './lib/ipc';

// Get all trash items
const items = await ipc.trash.list();

// Restore item
const result = await ipc.trash.restore(trashItemId);
const { entityType, entityId, data } = result;

// Permanently delete
await ipc.trash.delete(trashItemId);

// Empty entire trash
await ipc.trash.empty();
```

---

## Styling Customization

### Themes
All components use CSS variables that respect your theme:

```css
--text-primary: #000;
--text-secondary: #666;
--surface: #fff;
--surface-secondary: #f5f5f5;
--border-color: #ddd;
--primary: #3b82f6;
--primary-light: #dbeafe;
--primary-dark: #1e40af;
```

### Customizing Undo Toast

```css
/* Override in your CSS */
.undo-toast {
  background: var(--custom-color);
  border-radius: 12px;
}

.undo-toast:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}
```

### Customizing Calendar

```css
.calendar-day.selected {
  background: var(--accent-color);
}

.month-btn, .year-btn {
  font-size: 1.1rem;
}
```

---

## API Reference

### TrashService IPC Handlers

```typescript
// List all trash items
ipc.trash.list(): Promise<TrashItem[]>

// Add item to trash
ipc.trash.add(
  entityType: string,
  entityId: string,
  entityData: any,
  title?: string
): Promise<TrashItem>

// Restore from trash
ipc.trash.restore(trashId: string): Promise<{
  ok: true,
  entityType: string,
  entityId: string,
  data: any
}>

// Permanently delete
ipc.trash.delete(trashId: string): Promise<{ ok: true }>

// Empty trash
ipc.trash.empty(): Promise<{ ok: true }>
```

### Undo Store Methods

```typescript
useUndoStore
  .getState()
  .addAction(action: UndoAction): void

useUndoStore
  .getState()
  .undo(): Promise<void>

useUndoStore
  .getState()
  .redo(): Promise<void>

useUndoStore
  .getState()
  .canUndo(): boolean

useUndoStore
  .getState()
  .canRedo(): boolean

useUndoStore
  .getState()
  .getLastAction(): UndoAction | null

useUndoStore
  .getState()
  .clearHistory(): void

useUndoStore
  .getState()
  .getHistory(): UndoAction[]
```

---

## Best Practices

### 1. Always Confirm Destructive Actions
```tsx
const handleDelete = async () => {
  if (window.confirm('Delete this item?')) {
    // Add to trash and delete
  }
};
```

### 2. Show User Feedback
```tsx
// Use toast or notification
const handleDelete = async () => {
  try {
    await deleteItem();
    showNotification('Item deleted. Press Cmd+Z to undo.');
  } catch (error) {
    showError('Failed to delete item');
  }
};
```

### 3. Validate Recurrence Patterns
```tsx
const pattern = { frequency: 'every_x_days', interval: 0 };
const error = validateCustomPattern(pattern);
if (error) {
  return <div className="error">{error}</div>;
}
```

### 4. Handle Timezone Differences
```tsx
// Store all dates as ISO strings in UTC
const dateInUTC = new Date().toISOString();

// Convert for display
const displayDate = new Date(dateInUTC).toLocaleDateString();
```

### 5. Test Across Browsers
- Test keyboard shortcuts on Mac, Windows, Linux
- Verify touch interactions on mobile
- Check calendar rendering on different screen sizes

---

## Troubleshooting

### Undo Not Working
1. Ensure `useUndoShortcuts` is called in root component
2. Check that actions are added to store before performing action
3. Verify event handlers use async/await for trash operations

### Trash View Not Showing Items
1. Confirm items were deleted (check database)
2. Verify `ipc.trash.list()` returns data
3. Check browser console for errors

### Recurrence Not Saving
1. Validate pattern with `validateCustomPattern()`
2. Ensure `custom_recurrence_pattern` column exists in database
3. Verify customPattern is serialized to JSON in database

### Calendar Navigator Not Appearing
1. Check z-index of modal/dialog
2. Ensure parent has `position: relative` or fixed
3. Verify date is valid (not null or undefined)

---

## Performance Tips

1. **Limit Undo History**: Max 50 actions (configurable in store)
2. **Debounce Trash Operations**: Don't call delete multiple times rapidly
3. **Lazy Load Trash View**: Only load when user navigates to trash
4. **Memoize Recurrence Calculations**: Cache for repeated patterns

---

## Security Considerations

1. **User Scoping**: Trash respects user_id from auth service
2. **Permission Checks**: Verify user can delete before adding to trash
3. **Sensitive Data**: Full item snapshots in trash (consider redacting passwords)
4. **Input Validation**: All recurrence patterns validated before storage

---

## Migration Notes

### From Old System
If you had a previous delete system:

```tsx
// Old: Direct deletion
await db.delete('items', itemId);

// New: Move to trash first
const item = await getItem(itemId);
await trashService.moveToTrash('item', itemId, item);
await db.delete('items', itemId);
```

### Backward Compatibility
All new features are additive and don't break existing functionality:
- ✅ Existing reminders work without custom patterns
- ✅ Existing items can be deleted normally
- ✅ UI can render without undo components
- ✅ Calendar works without navigator

---

This integration guide provides everything needed to use the three new major features in your application.
