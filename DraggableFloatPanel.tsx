import { useEffect, useRef, useState } from 'react';

/**
 * 可拖拽悬浮窗组件,实现组件悬浮拖拽
 * - 固定定位（position: fixed），通过 transform: translate(x, y) 进行位置更新
 * - 鼠标/触控在标题栏按住即可拖动
 * - 支持视窗边界限制，避免越界
 * - 可选位置持久化
 */
interface DraggableFloatPanelProps {
  title?: string;
  persistKey?: string;
  zIndex?: number;
  children: React.ReactNode;
}

const DraggableFloatPanel = ({
  title,
  persistKey,
  zIndex = 1000,
  children,
}: DraggableFloatPanelProps) => {
  /**
   * 面板根节点引用，用于获取尺寸（宽高）以进行边界计算
   */
  const panelRef = useRef<HTMLDivElement | null>(null);
  /**
   * 面板当前位置（相对于视窗左上角的偏移量）
   * - 初始从 localStorage 读取（若提供 persistKey）
   * - 默认从 (24, 24) 开始
   */
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (persistKey) {
      const saved = localStorage.getItem(`float-panel:${persistKey}`);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        return { x, y };
      }
    }
    return { x: 24, y: 24 }; 
  });
  /**
   * 拖拽状态：记录拖拽起始点与起始位置
   */
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  /**
   * 将目标位置限制在视窗范围内，防止越界
   * - 根据面板当前宽高与窗口宽高计算最大/最小可达坐标
   */
  const clampToViewport = (x: number, y: number) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = panelRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 240;
    const h = rect?.height ?? 400;
    const minX = 0;
    const minY = 0;
    const maxX = vw - w;
    const maxY = vh - h;
    const cx = Math.min(Math.max(x, minX), Math.max(minX, maxX));
    const cy = Math.min(Math.max(y, minY), Math.max(minY, maxY));
    return { x: cx, y: cy };
  };

  // TODO learn
  /**
   * 在标题栏按下指针（鼠标/触控）时：
   * - 记录起始坐标与面板起始位置
   * - 捕获指针，绑定全局移动/抬起事件
   * - 禁用文本选择避免拖拽抖动
   */
  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const isPrimary = e.isPrimary !== false;
    if (!isPrimary) return;
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
    console.log('X',e.clientX,'Y',e.clientY);//这里指的点击的指针位置
    // (e.target as Element).setPointerCapture?.(e.pointerId);
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  /**
   * 全局移动事件：
   * - 根据起始点与当前指针位置计算偏移
   * - 更新位置并进行边界限制
   */
  const handlePointerMove = (e: PointerEvent) => {
    if (!dragStateRef.current) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    const nextX = dragStateRef.current.originX + dx;
    const nextY = dragStateRef.current.originY + dy;
    const clamped = clampToViewport(nextX, nextY);
    setPosition(clamped);
  };

  /**
   * 全局抬起事件：
   * - 清理拖拽状态与事件监听
   * - 恢复文本选择
   * - 持久化当前位置（如提供 persistKey）
   */
  const handlePointerUp = () => {
    dragStateRef.current = null;
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', handlePointerMove);
    if (persistKey) {
      try {
        localStorage.setItem(
          `float-panel:${persistKey}`,
          JSON.stringify(position),
        );
      } catch {}
    }
  };

  /**
   * 监听窗口尺寸变化：
   * - 当窗口变化时，重新限制面板位置到边界内
   * - 清理事件监听
   */
  useEffect(() => {
    const onResize = () => {
      setPosition((prev) => clampToViewport(prev.x, prev.y));
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        inset: '0px auto auto 0px', // 结合 transform 仅依赖左上角作为基准点
        transform: `translate(${position.x}px, ${position.y}px)`,
        zIndex,
        boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        borderRadius: 8,
        background: '#fff',
        border: '1px solid #e5e7eb',
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        style={{
          cursor: 'move', // 标题栏作为拖拽把手
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid #eef2f7',
          color: '#111827',
          fontWeight: 600,
          fontSize: 14,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          background: '#f8fafc',
        }}
      >
        <span>{title ?? ''}</span>
      </div>
      <div style={{ padding: 8 }}>{children}</div>
    </div>
  );
};

export default DraggableFloatPanel;
