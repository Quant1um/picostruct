import { expect } from "vitest";
import { ValidationError, type Validator } from "../src";

export const validates = <T>(val: Validator<T>, positive: T[], negative: any[], mode: "ref" | "value" = "ref") => {
    for (let x of positive) {
        expect(() => val(x), `expected to pass, but it failed (${JSON.stringify(x)})`).not.toThrowError(
            ValidationError,
        );
        expect(val(x), `expected to not alter the structure`).toEqual(x);
        if (mode === "ref") {
            expect(val(x), `expected to preserve reference equality`).toBe(x);
        }
    }

    for (let x of negative)
        expect(() => val(x), `expected to fail, but it passed (${JSON.stringify(x)})`).toThrowError(ValidationError);
};

export const transforms = <T>(
    val: Validator<T>,
    positive: [any, T][],
    negative: any[],
    mode: "ref" | "value" = "value",
) => {
    for (let [x, y] of positive) {
        expect(() => val(x), `expected to pass, but it failed (${JSON.stringify(x)})`).not.toThrowError(
            ValidationError,
        );
        expect(val(x)).toEqual(y);
        if (mode === "ref") {
            expect(val(x), `expected to preserve reference equality`).toBe(x);
        }
    }

    for (let x of negative)
        expect(() => val(x), `expected to fail, but it passed (${JSON.stringify(x)})`).toThrowError(ValidationError);
};
