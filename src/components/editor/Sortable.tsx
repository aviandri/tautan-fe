"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis, restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DragHandleProps } from "./BlockCard";

/**
 * Sortable list of items with ids. Calls onReorder with the full new id order
 * (the BE's order endpoints need the whole sibling group). Keyboard: focus a
 * handle, Space to lift, arrows to move, Space to drop.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  axis = "y",
  children,
}: {
  items: T[];
  onReorder: (ids: string[]) => void;
  axis?: "x" | "y";
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      // Cards collapse when a drag starts, so keep re-measuring droppables.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      modifiers={[axis === "y" ? restrictToVerticalAxis : restrictToHorizontalAxis, restrictToParentElement]}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={axis === "y" ? verticalListSortingStrategy : horizontalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function SortableItem({
  id,
  children,
  className,
}: {
  id: string;
  children: (p: { drag: DragHandleProps; isDragging: boolean }) => React.ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={className}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        position: "relative",
      }}
    >
      {children({ drag: { attributes, listeners, setActivatorNodeRef }, isDragging })}
    </div>
  );
}
