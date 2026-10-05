import type { MarketDay } from "@bowen-hub/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import raw from "../../../../../fixtures/samples/markets/MarketDay.2026-08-28.json";
import { MarketInstrument } from "./index";

it("keeps core figures and only real falling members; dial keyboard changes focus", () => {
  const day = structuredClone(raw) as MarketDay;
  const first = day.directions?.items[0],
    second = day.directions?.items[1];
  if (!first || !second) throw Error("missing directions");
  first.relativeVsAllA = 10;
  first.laggards = [
    { code: "TEST", name: "零涨跌占位", return1d: 0 },
    { code: "TEST", name: "真实领跌", return1d: -0.01 },
  ];
  render(<MarketInstrument day={day} />);
  expect(screen.queryByText("零涨跌占位")).toBeNull();
  expect(screen.getByText("真实领跌")).toBeTruthy();
  expect(screen.getByText("成交额")).toBeTruthy();
  expect(screen.getByText("封板率")).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("button", { name: new RegExp(first.name + "，当日涨跌") }), {
    key: "ArrowRight",
  });
  expect(screen.getByRole("heading", { name: second.name })).toBeTruthy();
});
