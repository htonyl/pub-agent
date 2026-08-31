# Counter contract

`counter-contract` is the Kotlin-owned, internal wire contract for the counter API.

It contains versioned DTOs, serializers, routes, and status mappings only. It does
not contain HTTP clients, Worker bindings, persistence, or UI code.

The TypeScript Worker must mirror this contract with Zod. Both the Kotlin tests and
the future TypeScript tests must consume every exchange fixture in
[`contracts/v1/counter`](../../../contracts/v1/counter). A contract change is not
complete until the Kotlin DTOs, Zod mirror, fixtures, and both conformance suites
are updated together.

Error messages are diagnostic text. Consumers must branch on `ApiErrorCode` and
provide their own user-facing text.
