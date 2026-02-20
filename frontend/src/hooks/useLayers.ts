import { useState, useCallback, useEffect } from 'react';
import type { Layer, LayerPanelState, DrawingElement } from '../types/canvas';

/**
 * Default layer colors for visual distinction
 */
const LAYER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

/**
 * Custom hook for managing layers
 * 
 * @param elements - Array of drawing elements
 * @param setElements - Function to update elements
 */
export function useLayers(
  elements: DrawingElement[],
  setElements: (elements: DrawingElement[] | ((prev: DrawingElement[]) => DrawingElement[])) => void
) {
  const [layerState, setLayerState] = useState<LayerPanelState>({
    layers: [],
    activeLayerId: null,
    isExpanded: true,
    panelWidth: 280
  });

  /**
   * Create a new layer
   */
  const createLayer = useCallback((name?: string, setActive: boolean = true) => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: name || `Layer ${layerState.layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      index: layerState.layers.length,
      elementIds: [],
      color: LAYER_COLORS[layerState.layers.length % LAYER_COLORS.length]
    };

    setLayerState(prev => ({
      ...prev,
      layers: [...prev.layers, newLayer],
      activeLayerId: setActive ? newLayer.id : prev.activeLayerId
    }));

    return newLayer;
  }, [layerState.layers]);

  /**
   * Initialize default layer if none exist
   */
  useEffect(() => {
    if (layerState.layers.length === 0) {
      createLayer('Background', true);
    }
  }, [createLayer, layerState.layers.length]);

  /**
   * Ensure all elements have valid layerIds
   */
  useEffect(() => {
    if (layerState.layers.length === 0 || !layerState.activeLayerId) return;

    // Check if any elements are missing layerId or have invalid layerId
    const needsUpdate = elements.some(el =>
      !el.layerId || !layerState.layers.find(l => l.id === el.layerId)
    );

    if (needsUpdate) {
      setElements(prev => prev.map(el => ({
        ...el,
        layerId: el.layerId && layerState.layers.find(l => l.id === el.layerId)
          ? el.layerId
          : layerState.activeLayerId!
      })));
    }
  }, [elements, layerState.layers, layerState.activeLayerId, setElements]);

  /**
   * Update layer element counts
   */
  const updateLayerElementCounts = useCallback(() => {
    setLayerState(prev => ({
      ...prev,
      layers: prev.layers.map(layer => ({
        ...layer,
        elementIds: elements
          .filter(el => el.layerId === layer.id)
          .map(el => el.id)
      }))
    }));
  }, [elements]);

  /**
   * Delete a layer
   */
  const deleteLayer = useCallback((layerId: string) => {
    // Don't delete if it's the last layer
    if (layerState.layers.length <= 1) return;

    setLayerState(prev => {
      const newLayers = prev.layers.filter(l => l.id !== layerId);

      // Move elements from deleted layer to next available layer
      const targetLayerId = newLayers[0]?.id;

      if (targetLayerId) {
        setElements(prevElements =>
          prevElements.map(el =>
            el.layerId === layerId ? { ...el, layerId: targetLayerId } : el
          )
        );
      }

      // Update indices
      newLayers.forEach((layer, idx) => {
        layer.index = idx;
      });

      return {
        ...prev,
        layers: newLayers,
        activeLayerId: prev.activeLayerId === layerId ? newLayers[0]?.id : prev.activeLayerId
      };
    });
  }, [layerState.layers, setElements]);

  /**
   * Duplicate a layer
   */
  const duplicateLayer = useCallback((layerId: string) => {
    const sourceLayer = layerState.layers.find(l => l.id === layerId);
    if (!sourceLayer) return;

    // Create new layer
    const newLayer: Layer = {
      ...sourceLayer,
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `${sourceLayer.name} (copy)`,
      index: sourceLayer.index + 1,
      elementIds: []
    };

    // Duplicate elements from source layer
    const elementsToDuplicate = elements.filter(el => el.layerId === layerId);
    const newElements = elementsToDuplicate.map(el => ({
      ...el,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      layerId: newLayer.id,
      x: (el.x || 0) + 20, // Offset by 20px
      y: (el.y || 0) + 20
    }));

    // Add new elements
    setElements(prev => [...prev, ...newElements]);

    // Update layers
    setLayerState(prev => {
      const newLayers = [...prev.layers];
      newLayers.splice(sourceLayer.index + 1, 0, newLayer);

      // Update indices of subsequent layers
      newLayers.forEach((layer, idx) => {
        layer.index = idx;
      });

      return {
        ...prev,
        layers: newLayers,
        activeLayerId: newLayer.id
      };
    });
  }, [layerState.layers, elements, setElements]);

  /**
   * Toggle layer visibility
   */
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayerState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId
          ? { ...layer, visible: !layer.visible }
          : layer
      )
    }));
  }, []);

  /**
   * Toggle layer lock
   */
  const toggleLayerLock = useCallback((layerId: string) => {
    setLayerState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId
          ? { ...layer, locked: !layer.locked }
          : layer
      )
    }));
  }, []);

  /**
   * Set active layer
   */
  const setActiveLayer = useCallback((layerId: string) => {
    setLayerState(prev => ({
      ...prev,
      activeLayerId: layerId
    }));
  }, []);

  /**
   * Rename layer
   */
  const renameLayer = useCallback((layerId: string, newName: string) => {
    setLayerState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId
          ? { ...layer, name: newName }
          : layer
      )
    }));
  }, []);

  /**
   * Change layer opacity
   */
  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayerState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId
          ? { ...layer, opacity }
          : layer
      )
    }));
  }, []);

  /**
   * Change layer blend mode
   */
  const setLayerBlendMode = useCallback((layerId: string, blendMode: Layer['blendMode']) => {
    setLayerState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId
          ? { ...layer, blendMode }
          : layer
      )
    }));
  }, []);

  /**
   * Reorder layers (drag and drop)
   */
  const reorderLayers = useCallback((sourceIndex: number, targetIndex: number) => {
    if (sourceIndex === targetIndex) return;

    setLayerState(prev => {
      const newLayers = [...prev.layers];
      const [movedLayer] = newLayers.splice(sourceIndex, 1);
      newLayers.splice(targetIndex, 0, movedLayer);

      // Update indices
      newLayers.forEach((layer, idx) => {
        layer.index = idx;
      });

      return {
        ...prev,
        layers: newLayers
      };
    });
  }, []);

  /**
   * Merge layer down
   */
  const mergeLayerDown = useCallback((layerId: string) => {
    const layerIndex = layerState.layers.findIndex(l => l.id === layerId);
    if (layerIndex <= 0) return; // Can't merge the bottom layer

    const targetLayer = layerState.layers[layerIndex];
    const bottomLayer = layerState.layers[layerIndex - 1];

    // Move all elements from target layer to bottom layer
    setElements(prev =>
      prev.map(el =>
        el.layerId === targetLayer.id
          ? { ...el, layerId: bottomLayer.id }
          : el
      )
    );

    // Remove target layer
    setLayerState(prev => {
      const newLayers = prev.layers.filter((_, idx) => idx !== layerIndex);
      newLayers.forEach((layer, idx) => {
        layer.index = idx;
      });

      return {
        ...prev,
        layers: newLayers,
        activeLayerId: bottomLayer.id
      };
    });
  }, [layerState.layers, setElements]);

  /**
   * Get elements for a specific layer (considering visibility)
   */
  const getLayerElements = useCallback((layerId: string): DrawingElement[] => {
    const layer = layerState.layers.find(l => l.id === layerId);
    if (!layer || !layer.visible) return [];

    return elements.filter(el => el.layerId === layerId);
  }, [elements, layerState.layers]);

  /**
   * Check if a layer is editable (visible and not locked)
   */
  const isLayerEditable = useCallback((layerId: string): boolean => {
    const layer = layerState.layers.find(l => l.id === layerId);
    return layer ? layer.visible && !layer.locked : false;
  }, [layerState.layers]);

  return {
    layerState,
    createLayer,
    deleteLayer,
    duplicateLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setActiveLayer,
    renameLayer,
    setLayerOpacity,
    setLayerBlendMode,
    reorderLayers,
    mergeLayerDown,
    getLayerElements,
    isLayerEditable,
    updateLayerElementCounts,
    setLayerState
  };
}