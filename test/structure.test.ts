import { test } from "vitest";
import {
    number,
    boolean,
    struct,
    maybe,
    string,
    any,
    array,
    anyOf,
    oneOf,
    allOf,
    record,
    filter,
    map,
    integer,
} from "../src/index.js";
import { transforms, validates } from "./util.js";

test("struct({ x: string })", () =>
    validates<any>(
        struct({ x: string() }),
        [{ x: "x" }, { x: "y", y: "z" }, { x: "z", z: null }],
        [null, undefined, {}, { y: "x" }, { x: 0 }, { x: 0, y: "x" }, { x: 0, z: null }],
    ));

test("struct([number, string])", () =>
    validates<[number, string]>(
        struct([number(), string()]),
        [
            [0, ""],
            [-1, "1"],
            [0, "a"],
        ],
        [null, {}, [{}, {}], [0, 0], ["a", 1], ["0", "1"], ["0", "a"], [0, {}], [{}, ""], { 0: 0, 1: "" }],
    ));

test("struct(complex)", () =>
    validates<any>(
        struct({
            x: anyOf(number(), string()),
            y: { 0: number(), 1: number() },
            z: anyOf("a", "b", undefined),
            w: ["static"],
        }),
        [
            {
                x: 0,
                y: { 0: 1, 1: 2 },
                w: ["static"],
            },

            {
                x: "",
                y: { 0: 1, 1: 2 },
                w: ["static"],
            },

            {
                x: "test",
                y: { 0: -1, 1: 2 },
                w: ["static"],
            },

            {
                x: 1,
                y: { 0: 1, 1: 2 },
                z: "a",
                w: ["static"],
            },

            {
                x: "test-2",
                y: { 0: 1, 1: 2 },
                z: "b",
                w: ["static"],
            },

            {
                q: false,
                x: "test-3",
                y: { 0: 1, 1: 2 },
                z: "a",
                w: ["static"],
            },
        ],
        [
            {
                x: false,
                y: { 0: 1, 1: 2 },
                w: ["static"],
            },

            {
                x: 0,
                y: { 0: 1, 1: 2 },
                w: ["wrong"],
            },

            {
                x: "test",
                y: { 1: 2 },
                z: "a",
                w: ["static"],
            },

            {
                x: 1,
                y: { 0: true, 1: 2 },
                z: "b",
                w: ["static"],
            },

            {
                x: 0,
                y: { 0: 0, 1: 2 },
                z: "a",
                w: ["static", ""],
            },

            {
                x: "test",
                y: { 0: 0, 1: 2 },
                z: "c",
                w: ["static"],
            },

            {
                x: "test",
                y: { 0: 0, 1: 2 },
                z: "a",
                w: false,
            },

            {
                y: { 0: 0, 1: 2 },
                z: "a",
                w: ["static"],
            },
        ],
    ));

test("array(any)", () =>
    validates<any[]>(array(any()), [[], [true], [[]], [{}, {}, []], new Array(10)], [null, {}, true, undefined]));

test("array(string)", () =>
    validates<string[]>(
        array(string()),
        [[], [""], ["a", "a"], ["0", "1", "2", "3"]],
        [[0, 1, 2, 3], [null, undefined], [[]], new Array(10)],
    ));

test("record(any, any)", () =>
    validates<Record<string | number | symbol, any>>(
        record(any(), any()),
        [{}, { 0: "" }, { "": null, "0": {}, 1: false as const }],
        [null, true, undefined, [], [{}]],
        "value", // record creates a new object, referential equality is not expected to be met
    ));

test("record(string, number)", () =>
    validates<Record<string, number>>(
        record(string(), number()),
        [{}, { a: 0 }, { b: 1 }, { x: 2, "0": -1 }],
        [{ a: undefined }, { "1": null }, { "": "" }, { a: "b", c: 3 }, { x: "y", z: { x: 0 } }, { [1]: "a" }],
        "value",
    ));

test("maybe(number)", () =>
    validates<number | undefined>(
        maybe(number()),
        [0, 1, 2, undefined, 3],
        [null, false, true, NaN, "", [], {}, [{}]],
    ));

test("maybe(string, 'default')", () =>
    transforms<string>(
        maybe(string(), "default"),
        [
            ["", ""],
            ["1", "1"],
            ["0", "0"],
            [undefined, "default"],
            ["default", "default"],
        ],
        [null, false, true, NaN, 1, 0, [], {}, [{}]],
    ));

test("anyOf(['string', string], ['number', number], ['boolean', boolean])", () =>
    validates<["string", string] | ["number", number] | ["boolean", boolean]>(
        anyOf(["string", string()], ["number", number()], ["boolean", boolean()]),
        [
            ["string", ""],
            ["number", 100],
            ["boolean", true],
        ],
        [
            ["string", 100],
            ["number", true],
            ["boolean", ""],
            ["string", null],
            ["number", "0"],
            [],
            ["number"],
            ["object", {}],
            ["number", 0, 10],
        ],
    ));

test("anyOf(string, number)", () =>
    validates<string | number>(
        anyOf(string(), number()),
        [0, 0.5, -1, "", "test", "0", "1"],
        [null, undefined, false, true, NaN, Infinity, [], {}, [{}]],
    ));

test("oneOf(a | b, a | c | d)", () =>
    validates<"a" | "b" | "c" | "d">(oneOf(anyOf("a", "b"), anyOf("a", "c", "d")), ["b", "c", "d"], ["", "a", "e"]));

test("allOf(a | b | c, a | c | d)", () =>
    validates<"a" | "c">(allOf(anyOf("a", "b", "c"), anyOf("a", "c", "d")), ["a", "c"], ["", "b", "d", "e"]));

test("filter", () =>
    validates<string>(
        filter(string(), x => x.length > 4 && x.length < 8),
        ["01234", "testing", "sixsix"],
        [
            "",
            "a",
            "four",
            "888ww888",
            "aaaaaaaaaaaaa",
            0.5,
            0,
            NaN,
            Infinity,
            -Infinity,
            true,
            false,
            null,
            undefined,
            {},
            [],
            [{}],
        ],
    ));

test("map", () =>
    transforms<Date>(
        map(integer(), x => new Date(x * 1000)),
        [
            [0, new Date("1970-01-01")],
            [119731017, new Date("1973-10-17 18:36:57Z")],
            [1000000000, new Date("2001-09-09 01:46:40Z")],
            [1234567890, new Date("2009-02-13 23:31:30Z")],
        ],
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
