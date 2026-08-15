import { AlertTriangle, X } from "lucide-react";

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface Props extends ConfirmDialogOptions {
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "확인",
  cancelLabel = "취소",
  danger,
  onCancel,
  onConfirm
}: Props) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#2f1b12]/35 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center" onClick={onCancel}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-[22px] border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-[0_14px_40px_rgba(47,27,18,0.18)]"
      >
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${danger ? "bg-[#fff1e8] text-[#c95735]" : "bg-[#fff1df] text-[#9a6044]"}`}>
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-[18px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">{title}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-[1.6] text-[#5e473a]">{message}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-full bg-[#f6eadf] p-2 text-[#5a392a]" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="rounded-full border border-[#ead8c9] bg-white py-3 text-sm font-medium text-[#5a392a]">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={`rounded-full py-3 text-sm font-semibold text-white ${danger ? "bg-[#c95735]" : "bg-[#d85b36]"}`}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
