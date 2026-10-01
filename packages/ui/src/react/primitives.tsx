// 基础交互基于 Radix，键盘导航、焦点管理及关闭行为由原语负责。
import {
  Dialog as RDialog,
  DropdownMenu as RMenu,
  Select as RSelect,
  Tabs as RTabs,
  Toast as RToast,
} from "radix-ui";
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useId } from "react";
export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`button ${className}`} {...props} />;
}
export function Input({
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const uid = useId();
  const inputId = id ?? uid;
  return (
    <label className="stack" htmlFor={inputId}>
      {label}
      <input id={inputId} className="input" {...props} />
    </label>
  );
}
export function Select({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div className="stack">
      <label htmlFor={id}>{label}</label>
      <RSelect.Root value={value} onValueChange={onValueChange}>
        <RSelect.Trigger id={id} className="input">
          <RSelect.Value placeholder="请选择" />
          <RSelect.Icon> ▾</RSelect.Icon>
        </RSelect.Trigger>
        <RSelect.Portal>
          <RSelect.Content className="card ui-popup" position="popper">
            <RSelect.Viewport>
              {options.map((item) => (
                <RSelect.Item className="ui-option" key={item.value} value={item.value}>
                  <RSelect.ItemText>{item.label}</RSelect.ItemText>
                  <RSelect.ItemIndicator> ✓</RSelect.ItemIndicator>
                </RSelect.Item>
              ))}
            </RSelect.Viewport>
          </RSelect.Content>
        </RSelect.Portal>
      </RSelect.Root>
    </div>
  );
}
type DialogProps = {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (value: boolean) => void;
};
function OverlayDialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
  sheet = false,
}: DialogProps & { sheet?: boolean }) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Trigger asChild>{trigger}</RDialog.Trigger>
      <RDialog.Portal>
        <RDialog.Overlay className="ui-overlay" />
        <RDialog.Content
          className={sheet ? "ui-sheet card" : "ui-dialog card"}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <RDialog.Title>{title}</RDialog.Title>
          {description && <RDialog.Description>{description}</RDialog.Description>}
          {children}
          <RDialog.Close asChild>
            <Button aria-label="关闭">关闭</Button>
          </RDialog.Close>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
export function Dialog(props: DialogProps) {
  return <OverlayDialog {...props} />;
}
export function Sheet(props: DialogProps) {
  return <OverlayDialog {...props} sheet />;
}
export function Tabs({
  items,
  defaultValue,
}: {
  items: { id: string; label: string; content: ReactNode }[];
  defaultValue?: string;
}) {
  return (
    <RTabs.Root defaultValue={defaultValue ?? items[0]?.id}>
      <RTabs.List className="row" aria-label="内容分类">
        {items.map((item) => (
          <RTabs.Trigger key={item.id} value={item.id} className="input">
            {item.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {items.map((item) => (
        <RTabs.Content className="card" key={item.id} value={item.id}>
          {item.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}
export function Toast({
  title,
  description,
  open,
  onOpenChange,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <RToast.Provider swipeDirection="right">
      <RToast.Root className="card ui-toast" open={open} onOpenChange={onOpenChange}>
        <RToast.Title>{title}</RToast.Title>
        {description && <RToast.Description>{description}</RToast.Description>}
        <RToast.Close asChild>
          <Button>关闭提示</Button>
        </RToast.Close>
      </RToast.Root>
      <RToast.Viewport className="ui-toast-viewport" />
    </RToast.Provider>
  );
}
export function DropdownMenu({
  trigger,
  items,
}: {
  trigger: ReactNode;
  items: { label: string; onSelect: () => void; disabled?: boolean }[];
}) {
  return (
    <RMenu.Root>
      <RMenu.Trigger asChild>{trigger}</RMenu.Trigger>
      <RMenu.Portal>
        <RMenu.Content className="card ui-popup" sideOffset={4}>
          {items.map((item) => (
            <RMenu.Item
              className="ui-option"
              key={item.label}
              onSelect={item.onSelect}
              disabled={item.disabled}
            >
              {item.label}
            </RMenu.Item>
          ))}
        </RMenu.Content>
      </RMenu.Portal>
    </RMenu.Root>
  );
}
