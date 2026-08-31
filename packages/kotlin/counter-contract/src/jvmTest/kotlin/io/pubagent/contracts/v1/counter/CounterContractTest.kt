package io.pubagent.contracts.v1.counter

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class CounterContractTest {
    @Test
    fun `counter state serializes as a canonical unsigned decimal string`() {
        val state = CounterState(CounterValue(ULong.MAX_VALUE))

        assertEquals("{\"value\":\"18446744073709551615\"}", json.encodeToString(CounterState.serializer(), state))
        assertEquals(state, json.decodeFromString(CounterState.serializer(), "{\"value\":\"18446744073709551615\"}"))
    }

    @Test
    fun `counter values reject noncanonical and out of range strings`() {
        listOf("-1", "01", "1.0", " 1", "18446744073709551616").forEach { value ->
            assertFailsWith<Exception> {
                json.decodeFromString(CounterState.serializer(), "{\"value\":\"$value\"}")
            }
        }
    }

    @Test
    fun `increment request requires an idempotency key`() {
        assertFailsWith<IllegalArgumentException> { IncrementCounterRequest("") }
        assertEquals(
            "{\"idempotencyKey\":\"request-123\"}",
            json.encodeToString(IncrementCounterRequest.serializer(), IncrementCounterRequest("request-123")),
        )
    }

    @Test
    fun `fixtures define the v1 HTTP contract`() {
        fixtures.forEach { fixtureName ->
            val fixture = strictJson.decodeFromString(HttpFixture.serializer(), fixtureText(fixtureName))

            assertTrue(fixture.request.path.startsWith("/v1/"))
            assertEquals(CounterV1Http.JSON_CONTENT_TYPE, fixture.response.headers["content-type"])

            when (fixture.request.method) {
                CounterV1Http.getCounter.method -> assertEquals(CounterV1Http.getCounter.path, fixture.request.path)
                CounterV1Http.incrementCounter.method -> {
                    assertEquals(CounterV1Http.incrementCounter.path, fixture.request.path)
                    assertEquals(CounterV1Http.JSON_CONTENT_TYPE, fixture.request.headers["content-type"])
                }
                else -> error("Unexpected fixture request method: ${fixture.request.method}")
            }

            when (fixture.response.status) {
                200 -> strictJson.decodeFromString(CounterState.serializer(), fixture.response.body!!)
                400, 409, 500, 503 -> {
                    val error = strictJson.decodeFromString(ApiError.serializer(), fixture.response.body!!)
                    assertEquals(fixture.response.status, CounterV1Http.statusFor(error.code))
                }
                else -> error("Unexpected fixture response status: ${fixture.response.status}")
            }

            when (fixtureName) {
                "increment-counter-invalid-request.json", "increment-counter-malformed-request.json" -> {
                    assertFailsWith<Exception> {
                        strictJson.decodeFromString(IncrementCounterRequest.serializer(), fixture.request.body!!)
                    }
                }
                "increment-counter-success.json", "increment-counter-overflow.json" -> {
                    strictJson.decodeFromString(IncrementCounterRequest.serializer(), fixture.request.body!!)
                }
            }
        }
    }

    @Test
    fun `error codes have stable HTTP statuses`() {
        assertEquals(400, CounterV1Http.statusFor(ApiErrorCode.INVALID_REQUEST))
        assertEquals(409, CounterV1Http.statusFor(ApiErrorCode.COUNTER_OVERFLOW))
        assertEquals(500, CounterV1Http.statusFor(ApiErrorCode.INTERNAL_ERROR))
        assertEquals(503, CounterV1Http.statusFor(ApiErrorCode.UNAVAILABLE))
    }

    private fun fixtureText(name: String): String = requireNotNull(
        javaClass.getResource("/$name")?.readText(),
    ) { "Missing contract fixture: $name" }

    private companion object {
        val json = Json
        val strictJson = Json { ignoreUnknownKeys = false }
        val fixtures = listOf(
            "get-counter-success.json",
            "increment-counter-success.json",
            "increment-counter-invalid-request.json",
            "increment-counter-malformed-request.json",
            "increment-counter-overflow.json",
            "get-counter-unavailable.json",
        )
    }
}

@Serializable
private data class HttpFixture(
    val request: FixtureRequest,
    val response: FixtureResponse,
)

@Serializable
private data class FixtureRequest(
    val method: String,
    val path: String,
    val headers: Map<String, String>,
    val body: String? = null,
)

@Serializable
private data class FixtureResponse(
    val status: Int,
    val headers: Map<String, String>,
    val body: String? = null,
)
