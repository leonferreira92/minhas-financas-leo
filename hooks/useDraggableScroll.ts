import { useRef, useEffect, useCallback, useState } from 'react';

interface UseDraggableScrollOptions {
  dragSpeed?: number;
  preventClickOnDragThreshold?: number;
}

/**
 * Hook para permitir arrastar com o mouse (click & drag) em carrosséis horizontais
 * sem interferir no touch nativo de celulares e tablets.
 */
export function useDraggableScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseDraggableScrollOptions = {}
) {
  const { dragSpeed = 1.3, preventClickOnDragThreshold = 4 } = options;
  const ref = useRef<T | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;
    let movedDistance = 0;

    const onMouseDown = (e: MouseEvent) => {
      // Apenas botão esquerdo
      if (e.button !== 0) return;
      
      // Se clicou em um input ou select, não interceptar drag
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      isDown = true;
      hasMoved = false;
      movedDistance = 0;
      setIsDragging(true);
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      
      // Melhora a fluidez durante o arraste
      el.style.scrollBehavior = 'auto';
      el.style.userSelect = 'none';
      el.classList.add('cursor-grabbing');
      el.classList.remove('cursor-grab');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * dragSpeed;
      movedDistance = Math.abs(x - startX);
      
      if (movedDistance > preventClickOnDragThreshold) {
        hasMoved = true;
      }

      el.scrollLeft = scrollLeft - walk;
    };

    const stopDragging = () => {
      if (!isDown) return;
      isDown = false;
      setIsDragging(false);
      el.style.removeProperty('user-select');
      el.style.scrollBehavior = 'smooth';
      el.classList.remove('cursor-grabbing');
      el.classList.add('cursor-grab');
    };

    const onClickCapture = (e: MouseEvent) => {
      // Se o usuário arrastou mais do que o threshold, cancela o evento de clique nos filhos
      if (hasMoved) {
        e.stopPropagation();
        e.preventDefault();
      }
      hasMoved = false;
      movedDistance = 0;
    };

    // Inicializa cursor
    el.classList.add('cursor-grab');

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDragging);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      el.removeEventListener('click', onClickCapture, true);
      el.classList.remove('cursor-grab', 'cursor-grabbing');
    };
  }, [dragSpeed, preventClickOnDragThreshold]);

  return ref;
}
