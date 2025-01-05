# picostruct - a teeny tiny typescript validator

![NPM Version](https://img.shields.io/npm/v/picostruct)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/picostruct)

a really small (<1kB), extensible and simple to use typescript data validator

## features

-   **Typescript first.** Made with Typescript in mind. Better developer experience by introducing types to your unstructured data
-   **Small.** No bloat, zero dependencies and tree-shakeable by design. Under 1 kB minified and brotlied. Uses [this cool tool](https://github.com/ai/size-limit) to control the size
-   **Simple to use.** Just declare a schema that looks like your ordinary Typescript type and be done with it
-   **Easily extensible.** Validators are just functions of type `(x: any) => T` that you can write yourself
-   **Transform values.** In addition to simple validation, `picostruct` can transform and convert values into whatever you need
-   **Performant.** Fast. Avoids memory allocations where possible
-   **Error reporting.** A validation error contains information about where and why it occured, packaged into a simple `ErrorInfo` API

## example

```ts
import { struct, array, map, filter, string, number, integer } from "picostruct"

const unixTimestamp = map(number(), x => new Date(x * 1000));
const cardNumber = filter(string(), x => true /* your validation logic here*/);
// validators and transformers are just functions
const custom = (x: any): number => +x;

const order = struct({
    cart: array([
        item: string(),
        qty: filter(integer(), x => x > 0),
    ]),

    payment: anyOf(
        {
            type: "paypal",
            email: string()
        },
        {
            type: "card",
            number: cardNumber(),
            cvc: filter(string(), x => x.length === 3),
            expiration: [integer(), integer()]
        }
    ),

    time: unixTimestamp(),
    custom: custom
});

const request = order(JSON.parse("..."));
// now typescript knows about your type

```

## alternatives

-   [superstruct](https://github.com/ianstormtaylor/superstruct) - a more feature complete library with a similar API
-   [banditypes](https://github.com/thoughtspile/banditypes) - even smaller validator library
-   [zod](https://zod.dev/) - probably the most popular typescript vaidation library
