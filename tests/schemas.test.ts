import { describe, expect, test } from "bun:test";

import {
  isValidColumn,
  isValidTable,
  TABLE_COLUMNS,
  TABLE_NAMES,
} from "../src/lib/ai/schemas";

describe("table registry", () => {
  test("exposes the dashboard tables", () => {
    expect(TABLE_NAMES.length).toBeGreaterThanOrEqual(19);
    expect(TABLE_NAMES).toContain("tasks");
    expect(TABLE_NAMES).toContain("saas_projects");
    expect(TABLE_NAMES).toContain("personal_expenses");
  });

  test("never exposes credential columns", () => {
    for (const table of TABLE_NAMES) {
      const columns = TABLE_COLUMNS[table] as readonly string[];
      expect(columns).not.toContain("client_password");
      expect(columns).not.toContain("access_password");
    }
  });

  test("every table carries an id", () => {
    for (const table of TABLE_NAMES) {
      expect(TABLE_COLUMNS[table] as readonly string[]).toContain("id");
    }
  });
});

describe("isValidTable", () => {
  test("accepts known tables only", () => {
    expect(isValidTable("tasks")).toBe(true);
    expect(isValidTable("users")).toBe(false);
    expect(isValidTable("__proto__")).toBe(false);
    expect(isValidTable(42)).toBe(false);
  });
});

describe("isValidColumn", () => {
  test("accepts real columns and rejects typos", () => {
    expect(isValidColumn("tasks", "title")).toBe(true);
    expect(isValidColumn("tasks", "titel")).toBe(false);
    expect(isValidColumn("saas_projects", "project_name")).toBe(true);
    expect(isValidColumn("saas_projects", "name")).toBe(false);
  });

  test("columns do not leak across tables", () => {
    expect(isValidColumn("customers", "title")).toBe(false);
    expect(isValidColumn("digital_products", "price")).toBe(true);
  });
});
