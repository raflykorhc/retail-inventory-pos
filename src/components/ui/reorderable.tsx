import * as React from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ReorderableItemProps {
  id: UniqueIdentifier
  children: (dragHandleProps: Record<string, any>) => React.ReactNode
  className?: string
}

export function SortableItem({ id, children, className }: ReorderableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 30 : 1,
  }

  const dragHandleProps = {
    ...attributes,
    ...listeners,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative transition-colors",
        isDragging && "shadow-xl rounded-lg bg-card ring-2 ring-primary/40 border border-primary/50 z-30 scale-[1.01]",
        className
      )}
    >
      {children(dragHandleProps)}
    </div>
  )
}

export interface ReorderableContainerProps<T extends { id: UniqueIdentifier }> {
  items: T[]
  onReorder: (newItems: T[], fromIndex: number, toIndex: number) => void
  renderItem: (item: T, index: number, dragHandleProps: Record<string, any>) => React.ReactNode
  className?: string
}

export function ReorderableContainer<T extends { id: UniqueIdentifier }>({
  items,
  onReorder,
  renderItem,
  className,
}: ReorderableContainerProps<T>) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(items, oldIndex, newIndex)
        onReorder(reordered, oldIndex, newIndex)
      }
    }
  }

  const itemIds = React.useMemo(() => items.map((item) => item.id), [items])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className={cn("space-y-1.5", className)}>
          {items.map((item, index) => (
            <SortableItem key={item.id} id={item.id}>
              {(dragHandleProps) => renderItem(item, index, dragHandleProps)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export function DragHandle({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "cursor-grab active:cursor-grabbing p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 touch-none focus:outline-none transition-colors",
        className
      )}
      {...props}
    >
      <GripVertical className="size-3.5" />
      <span className="sr-only">Seret untuk mengubah urutan</span>
    </button>
  )
}
