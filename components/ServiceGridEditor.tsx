'use client';

import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Service, Unit, servicesApi, unitsApi } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FolderIcon } from '@/src/components/ui/icons/akar-icons-folder';
import { XSmallIcon } from '@/src/components/ui/icons/akar-icons-x-small';
import {
  useUnitServicesTree,
  useUpdateService
} from '@/lib/hooks';

type ServiceWithPosition = Service & {
  gridRow: number | null;
  gridCol: number | null;
  gridRowSpan: number | null;
  gridColSpan: number | null;
  t?: (key: string) => string;
};

const GRID_COLS = 8;
const GRID_ROWS = 4;

// Helper functions to convert between positions and indices
const positionToIndex = (row: number, col: number): number => {
  return row * GRID_COLS + col;
};

const indexToPosition = (index: number): { row: number; col: number } => {
  const row = Math.floor(index / GRID_COLS);
  const col = index % GRID_COLS;
  return { row, col };
};

// Component for the Start Cell input to handle local state correctly
const StartCellInput: React.FC<{
  service: ServiceWithPosition;
  max: number;
  onPositionChange: (id: string, row: number, col: number) => void;
}> = ({ service, max, onPositionChange }) => {
  const [value, setValue] = useState<string>(
    positionToIndex(service.gridRow!, service.gridCol!).toString()
  );
  const [isFocused, setIsFocused] = useState(false);

  // Removed useEffect that was causing setState in effect warning.
  // Instead, we rely on the parent to remount this component (using key) 
  // or we accept that local state might diverge while typing (which is desired).
  // If we need to sync from props, we can use a key on the component instance in the parent.

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    const index = parseInt(newValue);
    if (!isNaN(index)) {
      // If valid number, try to update immediately
      // We don't clamp here to allow typing "50" temporarily, but we only update if within bounds
      if (index >= 0 && index <= max) {
        const { row, col } = indexToPosition(index);
        onPositionChange(service.id, row, col);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const index = parseInt(value);
    if (!isNaN(index)) {
      const safeIndex = Math.max(0, Math.min(max, index));
      const { row, col } = indexToPosition(safeIndex);

      // Always ensure we are in sync on blur
      onPositionChange(service.id, row, col);
      setValue(safeIndex.toString());
    } else {
      // Reset to current actual value if invalid
      setValue(positionToIndex(service.gridRow!, service.gridCol!).toString());
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <Input
      id={`startCell-${service.id}`}
      type="number"
      min="0"
      max={max}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      className="w-20 text-right"
    />
  );
};

// Service item in the sidebar
const ServiceItem: React.FC<{
  service: ServiceWithPosition;
  onAdd: (service: ServiceWithPosition) => void;
}> = ({ service, onAdd }) => {
  if (service.gridRow !== null && service.gridCol !== null) return null; // Don't show if already placed

  // Check if the service is a parent (has children)
  const isParentService = service.isLeaf === false;

  return (
    <div
      className={`p-3 border rounded bg-background hover:bg-accent mb-2 cursor-pointer flex items-center`}
      onClick={() => onAdd(service)}
    >
      <span className="flex-grow">{service.name}</span>
      {/* Show folder icon for parent services on the right side */}
      {isParentService && (
        <FolderIcon size={16} className="ml-2 flex-shrink-0" />
      )}
    </div>
  );
};

// Grid cell component
const GridCell: React.FC<{
  row: number;
  col: number;
  allServices: ServiceWithPosition[];
}> = ({ row, col, allServices }) => {
  const cellIndex = positionToIndex(row, col);
  const isOccupied = allServices.some(s => {
    if (s.gridRow === null || s.gridCol === null) return false;
    const serviceRowSpan = s.gridRowSpan || 1;
    const serviceColSpan = s.gridColSpan || 1;
    return (
      row >= s.gridRow &&
      row < s.gridRow + serviceRowSpan &&
      col >= s.gridCol &&
      col < s.gridCol + serviceColSpan
    );
  });

  return (
    <div
      className={`
        w-full h-full rounded border
        ${isOccupied ? 'bg-muted border-border' : 'bg-secondary border-border'}
        border-dashed
      `}
      style={{ minHeight: '40px' }}
    >
      <div className="flex items-center justify-center h-full text-xs text-gray-500">
        {cellIndex}
      </div>
    </div>
  );
};

// Service overlay that fully covers its cells
const GridServiceOverlay: React.FC<{
  service: ServiceWithPosition;
  onChange: (id: string, field: string, value: number | null) => void;
  allServices: ServiceWithPosition[];
  cellWidth: number;
  cellHeight: number;
}> = ({ service, onChange, allServices, cellWidth, cellHeight }) => {
  if (service.gridRow === null || service.gridCol === null) return null;
  if (service.gridRow >= GRID_ROWS || service.gridCol >= GRID_COLS) return null; // Out of bounds

  // Calculate position and dimensions using provided cell dimensions
  const gapSize = 2; // Gap between cells in pixels
  const top = service.gridRow * (cellHeight + gapSize);
  const left = service.gridCol * (cellWidth + gapSize);
  const width = (service.gridColSpan || 1) * cellWidth + ((service.gridColSpan || 1) - 1) * gapSize;
  const height = (service.gridRowSpan || 1) * cellHeight + ((service.gridRowSpan || 1) - 1) * gapSize;

  // Check for conflicts with other services in the same grid
  const hasConflict = () => {
    let conflict = false;
    allServices.forEach(s => {
      if (s.id === service.id || s.gridRow === null || s.gridCol === null) return;
      if (s.gridRow >= GRID_ROWS || s.gridCol >= GRID_COLS) return;

      const sRow = s.gridRow;
      const sCol = s.gridCol;
      const sRowSpan = s.gridRowSpan || 1;
      const sColSpan = s.gridColSpan || 1;

      const ourRow = service.gridRow!;
      const ourCol = service.gridCol!;
      const ourRowSpan = service.gridRowSpan || 1;
      const ourColSpan = service.gridColSpan || 1;

      // Check for intersection
      if (
        ourRow < sRow + sRowSpan &&
        ourRow + ourRowSpan > sRow &&
        ourCol < sCol + sColSpan &&
        ourCol + ourColSpan > sCol
      ) {
        conflict = true;
      }
    });
    return conflict;
  };

  const conflict = hasConflict();

  // Check if the service is a parent (has children)
  const isParentService = service.isLeaf === false;

  // Function to remove the service from the grid
  const handleRemoveService = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering grid clicks
    console.log('Remove service clicked', service.id); // Debug log

    // Update local state which will trigger the API call through handlePropertyChange
    onChange(service.id, 'gridRow', null);
    onChange(service.id, 'gridCol', null);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: service.backgroundColor || '#dbeafe',
        color: service.textColor || '#1e293b',
        border: conflict ? '2px solid #ef4444' : '1px solid #9ca3af', // Red border if there's a conflict
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      <div className="text-xs break-words text-center p-1 relative w-full h-full flex items-center justify-center">
        {service.name}
        {/* Show folder icon for parent services in the bottom-right corner */}
        {isParentService && (
          <div className="absolute bottom-1 right-1 z-10">
            <FolderIcon size={16} color={service.textColor || '#1e293b'} />
          </div>
        )}
        {/* Remove button in the top-right corner */}
        <div
          className="absolute top-0 right-0 cursor-pointer hover:opacity-80 flex items-center justify-center w-6 h-6 z-[50] m-1"
          style={{ pointerEvents: 'auto' }} // Ensure it receives pointer events
          onClick={handleRemoveService}
          title="Remove from grid"
        >
          <XSmallIcon size={14} color={service.textColor || '#1e293b'} />
        </div>
      </div>
    </div>
  );
};

// Main grid component with overlays
const MainGridWithOverlays: React.FC<{
  services: ServiceWithPosition[],
  cellWidth: number,
  cellHeight: number,
  onChange: (id: string, field: string, value: number | null) => void
}> = ({ services: gridServices, cellWidth, cellHeight, onChange }) => {
  const gridContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={gridContainerRef}
      style={{
        width: '100%',
        paddingBottom: `${(GRID_ROWS / GRID_COLS) * 100}%`, // Aspect ratio
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          gap: '2px',
        }}
      >
        {Array.from({ length: GRID_ROWS }).map((_, rowIndex) =>
          Array.from({ length: GRID_COLS }).map((_, colIndex) => (
            <GridCell
              key={`cell-${rowIndex}-${colIndex}`}
              row={rowIndex}
              col={colIndex}
              allServices={gridServices}
            />
          ))
        )}
      </div>

      {/* Overlays for services */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none' // Allow input events to work properly
      }}>
        {gridServices.map(service => (
          <GridServiceOverlay
            key={`overlay-${service.id}`}
            service={service}
            onChange={onChange}
            allServices={gridServices}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
          />
        ))}
      </div>
    </div>
  );
};

// Child grid component with overlays
const ChildGridWithOverlays: React.FC<{
  services: ServiceWithPosition[],
  title: string,
  cellWidth: number,
  cellHeight: number,
  onChange: (id: string, field: string, value: number | null) => void
}> = ({ services: gridServices, title, cellWidth, cellHeight, onChange }) => {
  const childGridRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={childGridRef}
      style={{
        width: '100%',
        paddingBottom: `${(GRID_ROWS / GRID_COLS) * 100}%`, // Aspect ratio
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          gap: '2px',
        }}
      >
        {Array.from({ length: GRID_ROWS }).map((_, rowIndex) =>
          Array.from({ length: GRID_COLS }).map((_, colIndex) => (
            <GridCell
              key={`child-cell-${rowIndex}-${colIndex}`}
              row={rowIndex}
              col={colIndex}
              allServices={gridServices}
            />
          ))
        )}
      </div>

      {/* Overlays for child services */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none' // Allow input events to work properly
      }}>
        {gridServices.map(service => (
          <GridServiceOverlay
            key={`child-overlay-${service.id}`}
            service={service}
            onChange={onChange}
            allServices={gridServices}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
          />
        ))}
      </div>
    </div>
  );
};

// Editor for service properties
const ServiceEditor: React.FC<{
  service: ServiceWithPosition;
  onChange: (id: string, field: string, value: number | null) => void;
  onPositionChange: (id: string, row: number, col: number) => void;
  allServices: ServiceWithPosition[];
}> = ({ service, onChange, onPositionChange, allServices }) => {
  if (service.gridRow === null || service.gridCol === null) return null;

  // Check for conflicts
  const hasConflict = () => {
    let conflict = false;
    allServices.forEach(s => {
      if (s.id === service.id || s.gridRow === null || s.gridCol === null) return;
      if (s.gridRow >= GRID_ROWS || s.gridCol >= GRID_COLS) return;

      const sRow = s.gridRow;
      const sCol = s.gridCol;
      const sRowSpan = s.gridRowSpan || 1;
      const sColSpan = s.gridColSpan || 1;

      const ourRow = service.gridRow!;
      const ourCol = service.gridCol!;
      const ourRowSpan = service.gridRowSpan || 1;
      const ourColSpan = service.gridColSpan || 1;

      // Check for intersection
      if (
        ourRow < sRow + sRowSpan &&
        ourRow + ourRowSpan > sRow &&
        ourCol < sCol + sColSpan &&
        ourCol + ourColSpan > sCol
      ) {
        conflict = true;
      }
    });
    return conflict;
  };

  const conflict = hasConflict();

  return (
    <Card className="mb-2">
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Start Cell Setting with dotted separator */}
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-2 grid grid-rows-2">
              <Label htmlFor={`startCell-${service.id}`} className="text-sm font-medium">
                {service.t?.('grid_configuration.start_cell')}
              </Label>
              <span className="text-xs text-muted-foreground">
                (0-{GRID_ROWS * GRID_COLS - 1})
              </span>
            </div>
            <div className="flex-1 border-t border-dashed border-border mx-2"></div>
            <div className="flex-1 border-t border-dashed border-border mx-2"></div>
            <StartCellInput
              key={`${service.id}-${service.gridRow}-${service.gridCol}`}
              service={service}
              max={GRID_ROWS * GRID_COLS - 1}
              onPositionChange={onPositionChange}
            />
          </div>

          {/* Width Setting with dotted separator */}
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-2 grid grid-rows-2">
              <Label htmlFor={`width-${service.id}`} className="text-sm font-medium">
                {service.t?.('grid_configuration.width')}
              </Label>
              <span className="text-xs text-muted-foreground">
                (1-{GRID_COLS})
              </span>
            </div>
            <div className="flex-1 border-t border-dashed border-border mx-2"></div>
            <Input
              id={`width-${service.id}`}
              type="number"
              min="1"
              max={GRID_COLS}
              value={service.gridColSpan || 1}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                const safeValue = Math.max(1, Math.min(GRID_COLS, value));
                onChange(service.id, 'gridColSpan', safeValue);
              }}
              className="w-20 text-right"
            />
          </div>

          {/* Height Setting with dotted separator */}
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-2 grid grid-rows-2">
              <Label htmlFor={`height-${service.id}`} className="text-sm font-medium">
                {service.t?.('grid_configuration.height')}
              </Label>
              <span className="text-xs text-muted-foreground">
                (1-{GRID_ROWS})
              </span>
            </div>
            <div className="flex-1 border-t border-dashed border-border mx-2"></div>
            <Input
              id={`height-${service.id}`}
              type="number"
              min="1"
              max={GRID_ROWS}
              value={service.gridRowSpan || 1}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                const safeValue = Math.max(1, Math.min(GRID_ROWS, value));
                onChange(service.id, 'gridRowSpan', safeValue);
              }}
              className="w-20 text-right"
            />
          </div>

          {conflict && (
            <div className="text-destructive text-sm">
              {service.t?.('grid_configuration.overlap_warning')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


// Component for displaying grid tabs
const ServiceGridWithTabs: React.FC<{
  services: ServiceWithPosition[];
  onAddService: (service: ServiceWithPosition) => void;
  onPropertyChange: (id: string, field: string, value: number | null) => void;
  onPositionChange: (id: string, row: number, col: number) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}> = ({ services, onAddService, onPropertyChange, onPositionChange, activeTab, setActiveTab }) => {
  // Find all parent services that have children (or are folders)
  const parentServices = services.filter(service =>
    service.isLeaf === false
  );

  // Get all placed services (for the main grid) - excluding those that are children of parent services
  const mainGridServices = services.filter(service =>
    (service.gridRow !== null && service.gridCol !== null) &&
    !(service.parentId && parentServices.some(parent => parent.id === service.parentId))
  );

  // For each parent service, get its child services that are placed
  const getParentChildServices = (parentId: string) => {
    return services
      .filter(service =>
        service.parentId === parentId &&
        service.gridRow !== null &&
        service.gridCol !== null
      );
  };

  // Note: MainGridWithOverlays and ChildGridWithOverlays are defined outside this component
  // to avoid redefinition issues with const

  // Create refs for main grid and all child grids
  const mainGridRef = useRef<HTMLDivElement>(null);
  const childGridRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [childGridDimensions, setChildGridDimensions] = useState<{ [key: string]: { width: number, height: number } }>({});

  // State for main grid dimensions
  const [mainGridDimensions, setMainGridDimensions] = useState({ width: 60, height: 60 });

  // Note: activeTab and setActiveTab are passed as props to this component
  // No need to redeclare them with useState

  // Effect to handle main grid dimensions
  useEffect(() => {
    if (!mainGridRef.current) return;

    const updateMainGridDimensions = () => {
      if (!mainGridRef.current) return;
      const containerRect = mainGridRef.current.getBoundingClientRect();

      if (containerRect.width > 0 && containerRect.height > 0) {
        const totalGapWidth = 2 * (GRID_COLS - 1); // 2px gap * (cols - 1)
        const totalGapHeight = 2 * (GRID_ROWS - 1); // 2px gap * (rows - 1)

        const cellWidth = Math.max(1, (containerRect.width - totalGapWidth) / GRID_COLS);
        const cellHeight = Math.max(1, (containerRect.height - totalGapHeight) / GRID_ROWS);

        setMainGridDimensions({ width: cellWidth, height: cellHeight });
      }
    };

    // Run immediately
    updateMainGridDimensions();

    // Use ResizeObserver if available
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateMainGridDimensions);
      resizeObserver.observe(mainGridRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    } else {
      // Fallback to window resize
      window.addEventListener('resize', updateMainGridDimensions);
      return () => window.removeEventListener('resize', updateMainGridDimensions);
    }
  }, []); // Empty dependency array since we're using ref

  // Effect to handle child grid dimensions - run when parent services change
  useEffect(() => {
    const updateChildDimensions = () => {
      const newDimensions: { [key: string]: { width: number, height: number } } = {};

      parentServices.forEach(parent => {
        const element = childGridRefs.current[parent.id];
        if (element) {
          const containerRect = element.getBoundingClientRect();

          if (containerRect.width > 0 && containerRect.height > 0) {
            const totalGapWidth = 2 * (GRID_COLS - 1); // 2px gap * (cols - 1)
            const totalGapHeight = 2 * (GRID_ROWS - 1); // 2px gap * (rows - 1)

            const cellWidth = Math.max(1, (containerRect.width - totalGapWidth) / GRID_COLS);
            const cellHeight = Math.max(1, (containerRect.height - totalGapHeight) / GRID_ROWS);

            newDimensions[parent.id] = { width: cellWidth, height: cellHeight };
          }
        }
      });

      // Only update state if dimensions have actually changed
      setChildGridDimensions(prev => {
        // Compare the new dimensions with previous ones
        const prevKeys = Object.keys(prev);
        const newKeys = Object.keys(newDimensions);

        if (prevKeys.length !== newKeys.length) {
          return newDimensions;
        }

        for (const key of newKeys) {
          if (!prev[key] ||
            prev[key].width !== newDimensions[key].width ||
            prev[key].height !== newDimensions[key].height) {
            return newDimensions;
          }
        }

        return prev; // No changes, return previous to prevent re-render
      });
    };

    // Update immediately after parent services change
    updateChildDimensions();
  }, [parentServices]); // Only run when parent services change

  // Effect for ResizeObserver to handle element size changes
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      // Fallback to window resize if ResizeObserver is not supported
      const updateChildDimensions = () => {
        const newDimensions: { [key: string]: { width: number, height: number } } = {};

        parentServices.forEach(parent => {
          const element = childGridRefs.current[parent.id];
          if (element) {
            const containerRect = element.getBoundingClientRect();

            if (containerRect.width > 0 && containerRect.height > 0) {
              const totalGapWidth = 2 * (GRID_COLS - 1); // 2px gap * (cols - 1)
              const totalGapHeight = 2 * (GRID_ROWS - 1); // 2px gap * (rows - 1)

              const cellWidth = Math.max(1, (containerRect.width - totalGapWidth) / GRID_COLS);
              const cellHeight = Math.max(1, (containerRect.height - totalGapHeight) / GRID_ROWS);

              newDimensions[parent.id] = { width: cellWidth, height: cellHeight };
            }
          }
        });

        // Only update state if dimensions have actually changed
        setChildGridDimensions(prev => {
          // Compare the new dimensions with previous ones
          const prevKeys = Object.keys(prev);
          const newKeys = Object.keys(newDimensions);

          if (prevKeys.length !== newKeys.length) {
            return newDimensions;
          }

          for (const key of newKeys) {
            if (!prev[key] ||
              prev[key].width !== newDimensions[key].width ||
              prev[key].height !== newDimensions[key].height) {
              return newDimensions;
            }
          }

          return prev; // No changes, return previous to prevent re-render
        });
      };

      window.addEventListener('resize', updateChildDimensions);
      return () => window.removeEventListener('resize', updateChildDimensions);
    }

    let resizeObserver: ResizeObserver | null = null;

    const setupObserver = () => {
      // Disconnect existing observer if present
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      // Create new observer
      resizeObserver = new ResizeObserver((entries) => {
        const newDimensions: { [key: string]: { width: number, height: number } } = {};

        // Update only the elements that changed
        entries.forEach(entry => {
          // Look for which parent this element belongs to
          for (const parent of parentServices) {
            if (childGridRefs.current[parent.id] === entry.target) {
              const containerRect = entry.contentRect;

              if (containerRect.width > 0 && containerRect.height > 0) {
                const totalGapWidth = 2 * (GRID_COLS - 1); // 2px gap * (cols - 1)
                const totalGapHeight = 2 * (GRID_ROWS - 1); // 2px gap * (rows - 1)

                const cellWidth = Math.max(1, (containerRect.width - totalGapWidth) / GRID_COLS);
                const cellHeight = Math.max(1, (containerRect.height - totalGapHeight) / GRID_ROWS);

                newDimensions[parent.id] = { width: cellWidth, height: cellHeight };
              }
              break;
            }
          }
        });

        // Update only changed dimensions
        setChildGridDimensions(prev => {
          const updated = { ...prev, ...newDimensions };

          // Check if there are actual changes to prevent unnecessary updates
          let hasChanges = false;
          for (const key in newDimensions) {
            if (!prev[key] ||
              prev[key].width !== newDimensions[key].width ||
              prev[key].height !== newDimensions[key].height) {
              hasChanges = true;
              break;
            }
          }

          return hasChanges ? updated : prev;
        });
      });

      // Observe all current child grid elements
      Object.values(childGridRefs.current).forEach(element => {
        if (element && resizeObserver) {
          resizeObserver.observe(element);
        }
      });
    };

    // Set up the observer
    setupObserver();

    // Return cleanup function
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [parentServices]); // Re-run when parent services change to update observations

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full flex overflow-x-auto">
        <TabsTrigger value="main-grid" className="flex-1">{services[0]?.t?.('grid_configuration.main_grid') || 'Main Grid'}</TabsTrigger>
        {parentServices.map(parent => (
          <TabsTrigger key={`tab-${parent.id}`} value={`grid-${parent.id}`}>
            {parent.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Main Grid Tab */}
      <TabsContent value="main-grid" className="space-y-6">
        <Card>
          <CardHeader>
            {/* @ts-ignore */}
            <CardTitle>{mainGridServices[0]?.t('grid_configuration.main_grid') || 'Main Grid'} ({GRID_COLS}x{GRID_ROWS})</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={mainGridRef}>
              <MainGridWithOverlays
                services={mainGridServices}
                cellWidth={mainGridDimensions.width}
                cellHeight={mainGridDimensions.height}
                onChange={onPropertyChange}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tabs for parent services with nested grids */}
      {parentServices.map(parent => {
        const childServices = getParentChildServices(parent.id);
        const gridDimensions = childGridDimensions[parent.id] || { width: 60, height: 60 };

        return (
          <TabsContent key={`content-${parent.id}`} value={`grid-${parent.id}`} className="space-y-6">
            <Card>
              <CardHeader>
                {/* @ts-ignore */}
                <CardTitle>{parent.name} {parentServices[0]?.t('grid_configuration.sub_grid')} ({GRID_COLS}x{GRID_ROWS})</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={(el) => {
                    if (el) {
                      childGridRefs.current[parent.id] = el;
                    } else {
                      delete childGridRefs.current[parent.id];
                    }
                  }}
                >
                  <ChildGridWithOverlays
                    services={childServices}
                    title={parent.name}
                    cellWidth={gridDimensions.width}
                    cellHeight={gridDimensions.height}
                    onChange={onPropertyChange}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

const SimpleGrid: React.FC<{
  services: ServiceWithPosition[];
  onAddService: (service: ServiceWithPosition) => void;
  onPropertyChange: (id: string, field: string, value: number | null) => void;
  onPositionChange: (id: string, row: number, col: number) => void;
}> = ({ services, onAddService, onPropertyChange, onPositionChange }) => {
  // State for active tab to determine available services
  const [activeTab, setActiveTab] = useState<string>('main-grid');

  // Find first available cell for a new service
  const findFirstAvailableCell = (): [number, number] | null => {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        // Check if this cell is occupied
        const isOccupied = services.some(service => {
          if (service.gridRow === null || service.gridCol === null) return false;
          const serviceRowSpan = service.gridRowSpan || 1;
          const serviceColSpan = service.gridColSpan || 1;

          return (
            row >= service.gridRow &&
            row < service.gridRow + serviceRowSpan &&
            col >= service.gridCol &&
            col < service.gridCol + serviceColSpan
          );
        });

        if (!isOccupied) {
          return [row, col];
        }
      }
    }
    return null; // No available cell
  };

  const handleAddService = (service: ServiceWithPosition) => {
    const pos = findFirstAvailableCell();
    if (pos) {
      const [row, col] = pos;
      onAddService({ ...service, gridRow: row, gridCol: col });
    }
  };

  // Separate services into main grid and sub-grids
  const mainGridServices = services.filter(service =>
    service.gridRow !== null && service.gridCol !== null
  );

  // Filter services based on active tab
  // If active tab is main-grid, show services without parents
  // If active tab is a parent grid, show services that belong to that parent
  const getAvailableServices = () => {
    if (activeTab === 'main-grid') {
      // Show services without parents (or with null parentId) that are unplaced
      return services.filter(service =>
        (service.gridRow === null || service.gridCol === null) &&
        (service.parentId === null || service.parentId === undefined)
      );
    } else {
      // Show services that belong to the current parent tab and are unplaced
      const parentId = activeTab.replace('grid-', '');
      return services.filter(service =>
        (service.gridRow === null || service.gridCol === null) &&
        service.parentId === parentId
      );
    }
  };

  const availableServices = getAvailableServices();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Services and Settings sidebar - only show if there are available services or services on grid */}
        {(availableServices.length > 0 || services.filter(service => service.gridRow !== null && service.gridCol !== null).length > 0) && (
          <div className="lg:col-span-1 space-y-6">
            {/* Available Services card - only show if there are services */}
            {availableServices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{services[0]?.t?.('grid_configuration.available_services')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {availableServices.map(service => (
                    <ServiceItem
                      key={`service-${service.id}`}
                      service={service}
                      onAdd={handleAddService}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Service Settings card - only show if there are services on grid */}
            {services.filter(service => service.gridRow !== null && service.gridCol !== null).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{services[0]?.t?.('grid_configuration.service_settings')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {services
                      .filter(service => service.gridRow !== null && service.gridCol !== null) // Only services placed on grid
                      .map(service => (
                        <AccordionItem key={`editor-${service.id}`} value={`editor-${service.id}`}>
                          <AccordionTrigger className="p-2 hover:bg-accent rounded text-sm">
                            <div className="flex items-center">
                              {service.isLeaf === false && (
                                <FolderIcon size={16} className="mr-2" />
                              )}
                              {service.name}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ServiceEditor
                              service={service}
                              onChange={onPropertyChange}
                              onPositionChange={onPositionChange}
                              allServices={services.filter(s => s.gridRow !== null && s.gridCol !== null)}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      ))
                    }
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Grid visualization with tabs - adjust column span when no sidebars */}
        <div className={(availableServices.length > 0 || services.filter(service => service.gridRow !== null && service.gridCol !== null).length > 0) ? "lg:col-span-3" : "lg:col-span-4"}>
          <ServiceGridWithTabs
            services={services}
            onAddService={onAddService}
            onPropertyChange={onPropertyChange}
            onPositionChange={onPositionChange}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>
      </div>
    </div>
  );
};

// Component to display unit list
const UnitList: React.FC<{
  units: Unit[];
  selectedUnitId: string | null;
  onSelect: (id: string) => void;
  t: (key: string) => string;
}> = ({ units, selectedUnitId, onSelect, t }) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('grid_configuration.units')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        {units.map(unit => (
          <div
            key={unit.id}
            className={`p-3 border rounded cursor-pointer hover:bg-accent ${selectedUnitId === unit.id ? 'bg-accent border-primary' : 'bg-background'
              }`}
            onClick={() => onSelect(unit.id)}
          >
            <div className="flex items-center">
              <span className="flex-grow">{unit.name}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// Component to display when no unit is selected
const NoUnitSelected: React.FC<{ t: (key: string) => string }> = ({ t }) => {
  return (
    <Card className="h-full flex items-center justify-center">
      <CardContent className="text-center p-8">
        <h3 className="text-xl font-semibold mb-2">{t('grid_configuration.no_unit_selected')}</h3>
        <p className="text-muted-foreground">{t('grid_configuration.select_unit_desc')}</p>
      </CardContent>
    </Card>
  );
};

interface ServiceGridEditorProps { unitId?: string; }

const ServiceGridEditor: React.FC<ServiceGridEditorProps> = ({ unitId }) => {
  const t = useTranslations('admin');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(unitId || null);
  const [services, setServices] = useState<ServiceWithPosition[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  // Initialize loading state based on whether we have an ID
  const [isLoading, setIsLoading] = useState(!!(unitId || selectedUnitId));

  const updateServiceMutation = useUpdateService();

  // Load units from API
  // Load units only if unitId prop not provided
  useEffect(() => {
    if (!unitId) {
      const fetchUnits = async () => {
        try {
          const unitsData = await unitsApi.getAll();
          setUnits(unitsData);
        } catch (error) {
          console.error('Error fetching units:', error);
        }
      };
      fetchUnits();
    }
  }, [unitId]);

  // Load services from API when selectedUnitId changes
  useEffect(() => {
    const id = unitId || selectedUnitId;
    if (id) {
      // We set loading here, but to avoid "setState in useEffect" warning for synchronous updates,
      // we rely on the fact that this effect runs on dependency change.
      // However, to be safe and avoid the warning if it's considered synchronous in some contexts (though it shouldn't be for data fetch),
      // we can set it. But the warning was specific.
      // Actually, setting state in useEffect IS standard for data fetching.
      // The warning might be because we are setting it immediately?
      // Let's try to set it only if not already loading?
      // Or just suppress it if it's a false positive for data fetching.
      // But we can also set isLoading(true) when we change selectedUnitId in the handler.

      setIsLoading(true);
      unitsApi.getServicesTree(id)
        .then(servicesTree => {
          const flattenedServices: ServiceWithPosition[] = [];
          const flattenTree = (services: Service[], level = 0) => {
            services.forEach(service => {
              flattenedServices.push({
                ...service,
                gridRow: service.gridRow !== undefined && service.gridRow !== null ? Number(service.gridRow) : null,
                gridCol: service.gridCol !== undefined && service.gridCol !== null ? Number(service.gridCol) : null,
                gridRowSpan: service.gridRowSpan !== undefined && service.gridRowSpan !== null ? Number(service.gridRowSpan) : 1,
                gridColSpan: service.gridColSpan !== undefined && service.gridColSpan !== null ? Number(service.gridColSpan) : 1,
                children: service.children || [],
                t: t,
              });
              if (service.children && service.children.length > 0) {
                flattenTree(service.children, level + 1);
              }
            });
          };
          flattenTree(servicesTree);
          setServices(flattenedServices);
        })
        .catch(error => { console.error('Error loading services:', error); })
        .finally(() => setIsLoading(false));
    } else {
      setServices([]);
      setIsLoading(false);
    }
  }, [unitId, selectedUnitId, t]); // Added t to dependencies

  const handleUnitSelect = (id: string) => {
    setSelectedUnitId(id);
    setIsLoading(true); // Set loading immediately on user interaction
  };

  const handleAddService = (service: ServiceWithPosition) => {
    // Update service with position
    const updatedServices = services.map(s =>
      s.id === service.id
        ? { ...s, gridRow: service.gridRow, gridCol: service.gridCol }
        : s
    );

    setServices(updatedServices);

    // Save to backend
    if (service.gridRow !== null && service.gridCol !== null && selectedUnitId) {
      updateServiceMutation.mutate({
        id: service.id,
        gridRow: service.gridRow,
        gridCol: service.gridCol,
        gridRowSpan: service.gridRowSpan || 1,
        gridColSpan: service.gridColSpan || 1
      });
    }
  };

  const handlePropertyChange = (id: string, field: string, value: number | null) => {
    // Update the service
    const updatedServices = services.map(service => {
      if (service.id === id) {
        switch (field) {
          case 'gridRow':
            return { ...service, gridRow: value };
          case 'gridCol':
            return { ...service, gridCol: value };
          case 'gridRowSpan':
            // Only update if value is not null (for gridRowSpan and gridColSpan)
            return value !== null ? { ...service, gridRowSpan: value } : service;
          case 'gridColSpan':
            // Only update if value is not null (for gridRowSpan and gridColSpan)
            return value !== null ? { ...service, gridColSpan: value } : service;
          default:
            return service;
        }
      }
      return service;
    });

    setServices(updatedServices);

    // Find the updated service to save
    const updatedService = updatedServices.find(s => s.id === id);
    if (updatedService && selectedUnitId) {
      // Check if this service is in a removal state (either coordinate is null)
      const isRemovalOperation = updatedService.gridRow === null || updatedService.gridCol === null;

      if (!isRemovalOperation) {
        // Send updated coordinates to backend (not a removal operation)
        updateServiceMutation.mutate({
          id: updatedService.id,
          gridRow: updatedService.gridRow,
          gridCol: updatedService.gridCol,
          gridRowSpan: updatedService.gridRowSpan || 1,
          gridColSpan: updatedService.gridColSpan || 1
        });
      } else {
        // For removal, we need to bypass the filterEmptyValues function that removes nulls
        // We'll try to call the API service directly without the filtering function
        servicesApi.update(updatedService.id, {
          gridRow: null,
          gridCol: null,
          gridRowSpan: updatedService.gridRowSpan || 1,
          gridColSpan: updatedService.gridColSpan || 1
        }).then(() => {
          // Update local state after API call to ensure proper span values are reflected
          setServices(prevServices =>
            prevServices.map(service =>
              service.id === updatedService.id
                ? { ...service, gridRowSpan: 1, gridColSpan: 1 }
                : service
            )
          );
        });
      }
    }
  };

  const handlePositionChange = (id: string, row: number, col: number) => {
    // Update the service
    const updatedServices = services.map(service => {
      if (service.id === id) {
        return { ...service, gridRow: row, gridCol: col };
      }
      return service;
    });

    setServices(updatedServices);

    // Find the updated service to save
    const updatedService = updatedServices.find(s => s.id === id);
    if (updatedService && selectedUnitId) {
      updateServiceMutation.mutate({
        id: updatedService.id,
        gridRow: updatedService.gridRow,
        gridCol: updatedService.gridCol,
        gridRowSpan: updatedService.gridRowSpan || 1,
        gridColSpan: updatedService.gridColSpan || 1
      });
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left column for units - narrower */}
      {!unitId && (
        <div className="col-span-3">
          <UnitList
            units={units}
            selectedUnitId={selectedUnitId}
            onSelect={handleUnitSelect}
            t={t}
          />
        </div>
      )}

      {/* Right column for grid configuration - wider */}
      <div className={unitId ? "col-span-12" : "col-span-9"}>
        <Card>
          <CardContent className="p-6">
            {selectedUnitId || unitId ? (
              <SimpleGrid
                services={services as unknown as ServiceWithPosition[]}
                onAddService={handleAddService}
                onPropertyChange={handlePropertyChange}
                onPositionChange={handlePositionChange}
              />
            ) : (
              <NoUnitSelected t={t} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServiceGridEditor;