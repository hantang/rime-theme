import { useEffect, useRef, type ReactNode } from "react";
import { CloseButton } from "./controls";

// 弹窗统一外壳：Esc 关闭 + 遮罩点击关闭 + 右上角固定位置的关闭按钮。
// 遮罩关闭要求按下与释放都发生在遮罩上——只判 click 会在"弹窗内选中文字、划出后松手"时误关。
// open=false 时仅 CSS 隐藏、不卸载 children，需要保留内部状态的弹窗（如调色板创建器）依赖这一点。
export function OverlayShell({ open, closeLabel, panelClassName, onClose, children }: { open: boolean; closeLabel: string; panelClassName?: string; onClose: () => void; children: ReactNode }) {
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      role="presentation"
      className={`${open ? "flex" : "hidden"} fixed inset-0 z-50 items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] xl:p-8`}
      onMouseDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedOnBackdrop.current && event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" className={`relative grid h-[88vh] w-[min(1280px,calc(100vw-32px))] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--panel)] shadow-2xl xl:h-[82vh] xl:grid-rows-none ${panelClassName ?? ""}`}>
        <div className="absolute right-3 top-3 z-10">
          <CloseButton label={closeLabel} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}
