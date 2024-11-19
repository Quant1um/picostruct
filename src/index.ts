type Primitive = string | number | bigint | boolean | symbol | null | undefined;

export type Validator<T> = (object: any) => T;
export type Schema<A> = Validator<A> | (A extends Primitive ? A : never) | { [K in keyof A]: Schema<A[K]> };
export type Result<A extends Schema<any>> =
    A extends Validator<infer K>
    ? K
    : A extends object
    ? { -readonly [K in keyof A]: Result<A[K]> }
    : A extends Primitive
    ? A
    : never;

export type ErrorPath = (string | number)[];
export type ErrorInfo = ErrorDescription & { path: ErrorPath };
export type ErrorDescription =
    | { type: "expected"; expected: string }
    | { type: "union"; failures: ErrorInfo[] }
    | { type: "key"; error: ErrorInfo }
    | { type: "custom"; message: string }
    | { type: "unexpected"; };

/**
* Exception that indicates a validation failure.
*/
export class ValidationError extends Error {
    public info: ErrorInfo;
    constructor(info: ErrorInfo) {
        super();
        this.name = "ValidationError";
        this.info = info;
    }
    override get message() {
        return JSON.stringify(this.info);
    }
}

/**
* Prepends a path key to the current path if the error is a ValidationError and rethrows the error.
* Used for rethrowing errors thrown by nested validators.
*/
export const rethrow = <T>(e: T, path: string | number): never => {
    if (e instanceof ValidationError) {
        e.info.path.push(path);
    }
    throw e;
}

/**
 * Fails the validation with a message.
 * A shorthand for `throw new ValidationError(message)` that can be used in ternaries.
 * @example
 * const validator = map(number(), x => x > 5 ? x : fail("expected a value greater than 5"));
 * validator(6); // throws a ValidationError
 * @param message A message to pass to the `ValidationError` constructor
 */
export const fail = (message: string | ErrorDescription): never => {
    throw new ValidationError(typeof message === "string" ? { type: "custom", path: [], message } : { ...message, path: [] });
};

/**
 * The heart of `picostruct`. Validates and transforms the `object` using `schema` as description.
 *
 * Whether the result is the same as the input is unspecified and left up to validator's implementation.
 * Despite that, all the standard validators are expected to return the same object for performance reasons, unless specified otherwise..
 * Note that this means that transforming validators with mutate the input.
 * @example
 * validate(5, number()); // returns 5
 * validate({}, { x: number() }); // throws ValidationError
 * @param x What to validate?
 * @param schema A description of how to validate/transform the object.
 */
export const validate = <const T extends Schema<any>>(x: any, schema: T): Result<T> => {
    if (typeof schema === "function") {
        return schema(x) as Result<T>;
    } else if (typeof schema === "object" && schema) {
        if (
            typeof x !== "object" ||
            !x ||
            !(Array.isArray(schema) ? Array.isArray(x) && schema.length === x.length : !Array.isArray(x))
        )
            throw fail({ type: "expected", expected: Array.isArray(schema) ? `array[${schema.length}]` : "object" });

        for (let i in schema) {
            try {
                x[i] = validate(x[i], schema[i as keyof typeof schema]);
            } catch (e) {
                rethrow(e, i);
            }
        }
        return x;
    } else {
        if (x !== schema) throw fail({ type: "expected", expected: JSON.stringify(schema) });
        return x;
    }
};

/**
 * Maps the resulting value for additional refinement or transformation
 * @example
 * // refinement
 * const validator = map(number(), x > 5 ? x : fail("expected a value greater than 5"));
 * validator(6); // throws a ValidationError
 * @example
 * // transform
 * const validator = map(number(), x => 2 * x);
 * validator(6); // returns 12
 * @param schema A validator for the input of the mapping
 * @param map The mapping itself
 */
export const map =
    <const T extends Schema<any>, U>(schema: T, map: (x: Result<T>) => U): Validator<U> =>
        x =>
            map(validate(x, schema));

/**
* Filters the resulting value for additional refinement based on a specified predicate
* @example
* const validator = filter(number(), x > 5, "expected a value greater than 5");
* validator(6); // throws a ValidationError
* @param schema A validator for the input of the mapping
* @param filter The predicate itself
*/
export const filter =
    <const T extends Schema<any>>(schema: T, filter: (x: Result<T>) => boolean, message?: string | ErrorDescription): Validator<Result<T>> =>
        map(schema, x => filter(x) ? x : fail(message || "filter failed"));

/**
 * Ensures that a value is a string
 * @param regex An optional `RegExp`. Ensures that a value matches said regular expression
 */
export const string =
    (regex?: RegExp): Validator<string> =>
        x =>
            typeof x === "string" && (!regex || regex.test(x))
                ? x
                : fail({
                    type: "expected",
                    expected: `string${regex ? ` matching ${regex}` : ""}`,
                });

/**
 * Ensures that a value is a finite number.
 * Disallows infinities and NaNs
 */
export const number = (): Validator<number> => x =>
    Number.isFinite(x) ? x : fail({ type: "expected", expected: "finite number" });

/**
 * Ensures that a value is an integer
 */
export const integer = (): Validator<number> => x =>
    Number.isInteger(x) ? x : fail({ type: "expected", expected: "integer" });

/**
 * Ensures that a value is a boolean
 */
export const boolean = (): Validator<boolean> => x =>
    typeof x === "boolean" ? x : fail({ type: "expected", expected: "boolean" });

/**
 * Ensures that a value is of a specified type, but allows the value to be `undefined`.
 * If second argument is present, the validator returns that as a "default" value
 * when a value is not present, otherwise it returns `undefined`
 * @param schema Ensures that the elements are of this type
 * @param [default_] Default value, returned by the validator if a value is not present
 */
export const maybe: {
    <const T extends Schema<any>>(schema: T): Validator<Result<T> | undefined>;
    <const T extends Schema<any>, D>(schema: T, default_: D): Validator<Result<T> | D>;
} =
    <const T>(schema: T, default_?: any): Validator<Result<T> | any> =>
        x =>
            typeof x === "undefined" ? default_ : validate(x, schema);

/**
 * Ensures that a value matches the specified type.
 * Basically, this function is a way to coalesce an arbitrary `Schema` into a `Validator` function by merely calling `validate`.
 * If you want to test if a value is a valid `object` in a JS sense, use `record`.
 * @see {@link record}
 * @see {@link validate}
 * @param schema Ensures that a value is of this type
 */
export const struct =
    <const T extends Schema<any>>(schema: T): Validator<Result<T>> =>
        x =>
            validate(x, schema);

/**
 * Ensures that a value is an object with keys and values of a specified type.
 * Creates and returns a new object. The result is unspecified when transforming keys yields a duplicate.
 * @param key Ensures that keys of a value are of this type. Must resolve to a number, string or a symbol.
 * @param value Ensures that values of a value are of this type.
 */
export const record = <const K extends Schema<number | string | symbol>, const V extends Schema<any>>(
    key: K,
    value: V,
): Validator<Record<Result<K>, Result<V>>> => {
    return x => {
        if (typeof x !== "object" || !x || Array.isArray(x))
            throw fail({ type: "expected", expected: "object" });

        let y: any = {};
        for (let i in x) {
            let v;
            try {
                v = validate(x[i], value);
            } catch (e) {
                rethrow(e, i);
            }
            try {
                y[validate(i, key)] = v;
            } catch (e) {
                if (e instanceof ValidationError) {
                    e.info = { type: "key", path: [i], error: e.info };
                }
                throw e;
            }
        }

        return y;
    };
};

/**
 * Ensures that a value is an array and that its elements are of a specific type
 * @param schema Ensures that the elements are of this type
 */
export const array =
    <const T extends Schema<any>>(schema: T): Validator<Result<T>[]> =>
        x => {
            if (!Array.isArray(x)) throw fail({ type: "expected", expected: "array" });
            for (let i = 0; i < x.length; i++) {
                try {
                    x[i] = validate(x[i], schema);
                } catch (e) {
                    rethrow(e, i);
                }
            }

            return x;
        };

/**
 * Ensures that any value passes validation.
 * Effectively does nothing
 */
export const any = (): Validator<any> => x => x;

/**
 * Ensures that no value passes validation
 */
export const never = (): Validator<never> => _ => fail({ type: "expected", expected: "never" });

type Intersect<T extends any[]> = T extends [infer F, ...infer R] ? Result<F> & Intersect<R> : unknown;
type Union<T extends any[]> = Result<T[number]>;

/**
 * Ensures that only values that match all of the specified validators pass validation.
 * @returns A validator that returns an intersection of all the specified validators results
 */
export const allOf =
    <const T extends Schema<any>[]>(...schemas: T): Validator<Intersect<T>> =>
        x =>
            schemas.reduce(validate, x);

/**
 * Ensures that only values that match any of the specified validators pass validation.
 * Provides a quick and easy way to validate tagged unions
 * @see {@link oneOf}
 * @example
 * const validator = anyOf("a", "b", "c", number());
 * const result = validator(2); //result has a type of "a" | "b" | "c" | number
 * @returns A validator that returns a union of all the specified validators results
 */
export const anyOf =
    <const T extends Schema<any>[]>(...schemas: T): Validator<Union<T>> =>
        x => {
            let failures = [];
            for (let schema of schemas) {
                try {
                    return validate(x, schema);
                } catch (e) {
                    if (e instanceof ValidationError) {
                        failures.push(e.info);
                        continue;
                    }

                    throw e;
                }
            }

            throw fail({ type: "union", failures });
        };

/**
 * Ensures that only values that match only one of the specified validators pass validation.
 * Provides a quick and easy way to validate nested property unions.
 * @see {@link anyOf}
 * @example
 * const validator = oneOf(
 *      { circle: { area: number() } },
 *      { rect: { w: number(), h: number() } }
 * );
 *
 * validator({ circle: { area: 0 }, rect: { w: 0, h: 0 }}); // fails validation, while it would pass with `anyOf`.
 * @returns A validator that returns a union of all the specified validators results
 */
export const oneOf =
    <const T extends Schema<any>[]>(...schemas: T): Validator<Union<T>> =>
        x => {
            let count = 0;
            let result = x;
            let failures = [];

            for (let schema of schemas) {
                try {
                    result = validate(x, schema);
                    count += 1;
                } catch (e) {
                    if (e instanceof ValidationError) {
                        failures.push(e.info);
                        continue;
                    }

                    throw e;
                }

                if (count > 1) throw fail({ type: "unexpected" });
            }

            if (count === 0) throw fail({ type: "union", failures });
            return result;
        };
