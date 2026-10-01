import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Button,
  DataTable,
  Dialog,
  DropdownMenu,
  Input,
  SearchBox,
  Select,
  Sheet,
  Tabs,
  Toast,
} from "../src/index";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("按钮和标签输入可操作", async () => {
  const click = vi.fn();
  render(
    <>
      <Button onClick={click}>保存</Button>
      <Input label="名称" />
    </>,
  );
  await userEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(click).toHaveBeenCalledOnce();
  await userEvent.type(screen.getByLabelText("名称"), "中文");
  expect((screen.getByLabelText("名称") as HTMLInputElement).value).toBe("中文");
});
for (const Component of [Dialog, Sheet])
  it("浮层打开和关闭管理焦点", async () => {
    render(
      <Component title="说明" trigger={<Button>打开</Button>}>
        <p>正文</p>
      </Component>,
    );
    await userEvent.click(screen.getByRole("button", { name: "打开" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
it("标签页切换内容", async () => {
  render(
    <Tabs
      items={[
        { id: "a", label: "甲", content: "甲内容" },
        { id: "b", label: "乙", content: "乙内容" },
      ]}
    />,
  );
  await userEvent.click(screen.getByRole("tab", { name: "乙" }));
  expect(screen.getByText("乙内容")).toBeTruthy();
  expect(screen.queryByText("甲内容")).toBeNull();
});
it("Toast可关闭", async () => {
  function Example() {
    const [open, setOpen] = useState(true);
    return <Toast title="已保存" open={open} onOpenChange={setOpen} />;
  }
  render(<Example />);
  await userEvent.click(screen.getByRole("button", { name: "关闭提示" }));
  await waitFor(() => expect(screen.queryByText("已保存")).toBeNull());
});
it("下拉菜单触发回调", async () => {
  const selected = vi.fn();
  render(
    <DropdownMenu
      trigger={<Button>更多</Button>}
      items={[{ label: "查看", onSelect: selected }]}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "更多" }));
  await userEvent.click(screen.getByRole("menuitem", { name: "查看" }));
  expect(selected).toHaveBeenCalledOnce();
});
it("Select键盘选择", async () => {
  const selected = vi.fn();
  render(
    <Select
      label="类型"
      options={[
        { value: "a", label: "甲" },
        { value: "b", label: "乙" },
      ]}
      onValueChange={selected}
    />,
  );
  screen.getByRole("combobox").focus();
  await userEvent.keyboard("{Enter}{ArrowDown}{Enter}");
  expect(selected).toHaveBeenCalled();
});
it("表格数值排序、过滤、空状态和自定义格式", async () => {
  render(
    <DataTable
      rows={[
        { id: "a", name: "甲", n: 2 },
        { id: "b", name: "乙", n: 1 },
      ]}
      rowKey={(row) => row.id}
      columns={[
        { id: "name", label: "名称", value: (row) => row.name },
        {
          id: "n",
          label: "数值",
          numeric: true,
          value: (row) => row.n,
          format: (value) => `${value}家`,
        },
      ]}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: /数值/ }));
  expect(screen.getAllByRole("row")[1]?.textContent).toBe("乙1家");
  await userEvent.type(screen.getByRole("searchbox"), "不存在");
  expect(screen.getByRole("status").textContent).toBe("没有匹配的数据");
});
it("本地中文搜索", async () => {
  render(
    <SearchBox
      items={[
        { id: "a", title: "语言模型", href: "/a" },
        { id: "b", title: "市场复盘" },
      ]}
    />,
  );
  await userEvent.type(screen.getByRole("searchbox"), "模型");
  await waitFor(() => expect(screen.getByRole("link", { name: "语言模型" })).toBeTruthy());
});
it("服务端搜索取消旧请求且展示失败", async () => {
  const signals: AbortSignal[] = [];
  const search = vi.fn(async (_query: string, signal: AbortSignal) => {
    signals.push(signal);
    throw new Error("假故障");
  });
  render(<SearchBox search={search} />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "甲" } });
  await waitFor(() => expect(screen.getByRole("status").textContent).toBe("搜索失败，请重试"));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "乙" } });
  await waitFor(() => expect(signals[0]?.aborted).toBe(true));
});
