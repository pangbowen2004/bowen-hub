import { Button } from "@bowen-hub/ui";
import { useRef, useState } from "react";
import { AccessPanel } from "./AccessPanel";
import "./auth.css";

export function AccountMenu({ themeLabel, onTheme }: { themeLabel: string; onTheme: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className="account-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        账户 <span aria-hidden="true">⌄</span>
      </Button>
      <dialog
        ref={dialog}
        onKeyDown={(event) => {
          if (event.key === "Escape") dialog.current?.close();
        }}
        className="account-dialog"
        aria-label="账户与访问"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <header>
          <h2>账户</h2>
          <button type="button" aria-label="关闭账户菜单" onClick={() => dialog.current?.close()}>
            ×
          </button>
        </header>
        {open && <AccessPanel />}
        <button className="account-theme" type="button" onClick={onTheme}>
          外观 · {themeLabel}
        </button>
      </dialog>
    </>
  );
}
