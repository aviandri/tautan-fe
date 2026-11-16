import { describe, expect, it } from "vitest";
import { answerColumns, answerText, submissionTitle } from "./answers";
import { BLOCK_META, FORM_PRESETS, newFieldId } from "@/lib/editor/block-meta";
import { BlockDataSchemas } from "@/lib/types";

const sub = (answers: { field_id: string; label: string; type: string; value: unknown }[], id = "s") => ({
  id, block_id: "b", contact_id: null, created_at: "2026-11-16T00:00:00Z", answers,
});

describe("answers", () => {
  it("formats values by type", () => {
    expect(answerText({ type: "checkbox", value: true })).toBe("Yes");
    expect(answerText({ type: "checkbox", value: false })).toBe("No");
    expect(answerText({ type: "number", value: 3 })).toBe("3");
    expect(answerText({ type: "text", value: "" })).toBe("");
    expect(answerText({ type: "date", value: "2026-12-24" })).toMatch(/Dec/);
  });
  it("columns follow first-seen order and newest label", () => {
    const cols = answerColumns([
      sub([{ field_id: "email", label: "Email address", type: "email", value: "a@b.co" }]),
      sub([{ field_id: "name", label: "Name", type: "text", value: "A" }, { field_id: "email", label: "Email", type: "email", value: "x@y.co" }]),
    ]);
    expect(cols).toEqual([{ field_id: "email", label: "Email address" }, { field_id: "name", label: "Name" }]);
  });
  it("titles a submission by name + email", () => {
    expect(submissionTitle(sub([{ field_id: "name", label: "Name", type: "text", value: "Rina" }, { field_id: "email", label: "Email", type: "email", value: "r@x.io" }]))).toBe("Rina · r@x.io");
  });
});

describe("form block", () => {
  it("presets validate and match the shared schema", () => {
    for (const p of Object.values(FORM_PRESETS)) {
      const d = p.data();
      expect(BlockDataSchemas.form.safeParse(d).success).toBe(true);
      expect(BLOCK_META.form.validate(d).errors).toEqual({});
    }
  });
  it("mirrors checkForm: unique ids, labels, select options, 1–30 fields", () => {
    const v = BLOCK_META.form.validate({
      fields: [
        { id: "a", type: "text", label: "" },
        { id: "a", type: "select", label: "Pick", options: ["", " "] },
        { id: "Bad Id", type: "email", label: "E" },
      ],
    });
    expect(v.errors["fields.0.label"]).toBe("Required");
    expect(v.errors["fields.1.id"]).toBeTruthy();
    expect(v.errors["fields.1.options"]).toBeTruthy();
    expect(v.errors["fields.2.id"]).toBeTruthy();
    expect(BLOCK_META.form.validate({ fields: [] }).errors.fields).toBeTruthy();
  });
  it("strips options from non-select fields and trims choices", () => {
    const v = BLOCK_META.form.validate({
      fields: [
        { id: "t", type: "text", label: "T", options: ["x"] },
        { id: "s", type: "select", label: "S", options: [" A ", "", "B"] },
      ],
    });
    expect(v.data.fields[0]).toEqual({ id: "t", type: "text", label: "T" });
    expect(v.data.fields[1].options).toEqual(["A", "B"]);
  });
  it("newFieldId is stable and unique", () => {
    expect(newFieldId("Your Email!", [])).toBe("your_email");
    expect(newFieldId("email", ["email", "email_2"])).toBe("email_3");
    expect(newFieldId("", [])).toBe("field");
  });
});
