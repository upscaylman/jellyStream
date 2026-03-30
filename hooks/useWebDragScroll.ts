import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Active le scroll horizontal par clic-glissé (drag) sur web.
 * Sur mobile/natif, ne fait rien (le swipe fonctionne nativement).
 * Empêche les clics parasites lors d'un drag (navigation accidentelle).
 */
export function useWebDragScroll(scrollRef: React.RefObject<any>) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasMoved = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Résoudre le nœud DOM scrollable depuis le ref React Native Web
    const node = resolveScrollableNode(scrollRef.current);
    if (!node) return;

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      hasMoved.current = false;
      startX.current = e.pageX;
      scrollLeft.current = node.scrollLeft;
      node.style.cursor = 'grabbing';
      node.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const diff = startX.current - e.pageX;
      if (Math.abs(diff) > 3) hasMoved.current = true;
      node.scrollLeft = scrollLeft.current + diff;
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      node.style.cursor = 'grab';
      node.style.userSelect = '';
    };

    // Empêcher la navigation si l'utilisateur a fait un drag
    const onClick = (e: MouseEvent) => {
      if (hasMoved.current) {
        e.stopPropagation();
        e.preventDefault();
        hasMoved.current = false;
      }
    };

    node.style.cursor = 'grab';
    node.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    node.addEventListener('mouseleave', onMouseUp);
    node.addEventListener('click', onClick, true);

    return () => {
      node.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      node.removeEventListener('mouseleave', onMouseUp);
      node.removeEventListener('click', onClick, true);
    };
  }, [scrollRef]);
}

/**
 * Tente de récupérer l'élément DOM scrollable depuis un ref React Native Web.
 * Gère FlatList, ScrollView, et les refs DOM directs.
 */
function resolveScrollableNode(ref: any): HTMLElement | null {
  if (!ref) return null;

  // ScrollView.getScrollableNode() — méthode standard react-native-web
  if (typeof ref.getScrollableNode === 'function') {
    return ref.getScrollableNode();
  }

  // Ref DOM direct (react-native-web récent)
  if (ref instanceof HTMLElement) {
    return ref;
  }

  // FlatList → VirtualizedList → ScrollView interne
  const innerScroll =
    ref._listRef?._scrollRef ??
    ref.getScrollRef?.();
  if (innerScroll?.getScrollableNode) {
    return innerScroll.getScrollableNode();
  }

  return null;
}
