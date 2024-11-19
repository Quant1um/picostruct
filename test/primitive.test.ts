import { test } from "vitest";
import { number, boolean, integer, struct, string, any, never } from "../src/index";
import { validates } from "./util";

test("boolean", () =>
    validates<boolean>(
        boolean(),
        [true, false],
        [NaN, Infinity, -Infinity, null, 0, 1, -1.5, undefined, "", "1", "0", {}, [], [{}]],
    ));

test("number", () =>
    validates<number>(
        number(),
        [0, 1, 2, 1.5, -1, -1e7, -1 / 3, 1e-10, Number.MAX_VALUE, Number.MIN_VALUE, Number.MAX_SAFE_INTEGER],
        [NaN, Infinity, -Infinity, true, false, null, undefined, "", "1", "0", {}, [], [{}]],
    ));

test("integer", () =>
    validates<number>(
        integer(),
        [0, 1, 2, -1, -1e7, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE],
        [
            0.5,
            0.1,
            Number.MIN_VALUE,
            NaN,
            Infinity,
            -Infinity,
            true,
            false,
            null,
            undefined,
            "",
            "1",
            "0",
            {},
            [],
            [{}],
        ],
    ));

test("string", () =>
    validates<string>(
        string(),
        ["test", "", "0"],
        [0.5, 0, NaN, Infinity, -Infinity, true, false, null, undefined, {}, [], [{}]],
    ));

test("string regex", () =>
    validates<string>(
        string(/^[a-z0-9]+$/i),
        ["test", "0", "1a2b3c"],
        [" ", "", "_", "a-z0-9", 0.5, 0, NaN, Infinity, -Infinity, true, false, null, undefined, {}, [], [{}]],
    ));

test("null", () =>
    validates<null>(
        struct(null),
        [null],
        [0.5, 0, NaN, Infinity, -Infinity, true, false, undefined, "", "1", "0", {}, [], [{}]],
    ));

test("undefined", () =>
    validates<undefined>(
        struct(undefined),
        [undefined],
        [0.5, 0, NaN, Infinity, -Infinity, true, false, null, "", "1", "0", {}, [], [{}]],
    ));

test("literal", () =>
    validates<"test">(
        struct("test"),
        ["test"],
        ["not-test", 0.5, 0, NaN, Infinity, -Infinity, true, false, null, undefined, "", "1", "0", {}, [], [{}]],
    ));

test("any", () =>
    validates<any>(
        any(),
        [0.5, 0, NaN, Infinity, -Infinity, true, false, null, undefined, "", "1", "0", {}, [], [{}]],
        [],
    ));

test("never", () =>
    validates<never>(
        never(),
        [],
        [0.5, 0, NaN, Infinity, -Infinity, true, false, null, undefined, "", "1", "0", {}, [], [{}]],
    ));
