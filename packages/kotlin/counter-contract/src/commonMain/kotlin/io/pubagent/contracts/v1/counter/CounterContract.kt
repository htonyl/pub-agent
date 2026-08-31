package io.pubagent.contracts.v1.counter

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

/** A non-negative counter value encoded as a canonical unsigned-decimal JSON string. */
@Serializable(with = CounterValueSerializer::class)
@JvmInline
value class CounterValue(val asULong: ULong)

object CounterValueSerializer : KSerializer<CounterValue> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("io.pubagent.contracts.v1.counter.CounterValue", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): CounterValue {
        val wireValue = decoder.decodeString()
        if (!CANONICAL_UNSIGNED_DECIMAL.matches(wireValue)) {
            throw SerializationException("Counter value must be a canonical unsigned-decimal string")
        }

        return CounterValue(
            wireValue.toULongOrNull()
                ?: throw SerializationException("Counter value exceeds ULong.MAX_VALUE"),
        )
    }

    override fun serialize(encoder: Encoder, value: CounterValue) {
        encoder.encodeString(value.asULong.toString())
    }

    private val CANONICAL_UNSIGNED_DECIMAL = Regex("0|[1-9][0-9]*")
}

@Serializable
data class CounterState(val value: CounterValue)

@Serializable
data class IncrementCounterRequest(val idempotencyKey: String) {
    init {
        require(idempotencyKey.isNotEmpty()) { "idempotencyKey must not be empty" }
    }
}

@Serializable
enum class ApiErrorCode {
    INVALID_REQUEST,
    COUNTER_OVERFLOW,
    INTERNAL_ERROR,
    UNAVAILABLE,
}

/** `message` is diagnostic text; clients must use [code] for behavior and user-facing copy. */
@Serializable
data class ApiError(
    val code: ApiErrorCode,
    val message: String,
)

data class HttpEndpoint(
    val method: String,
    val path: String,
    val successStatus: Int,
)

/** Versioned HTTP metadata for the counter API. */
object CounterV1Http {
    const val JSON_CONTENT_TYPE = "application/json"
    const val COUNTER_PATH = "/v1/counter"

    val getCounter = HttpEndpoint(method = "GET", path = COUNTER_PATH, successStatus = 200)
    val incrementCounter = HttpEndpoint(method = "POST", path = COUNTER_PATH + "/increment", successStatus = 200)

    fun statusFor(errorCode: ApiErrorCode): Int = when (errorCode) {
        ApiErrorCode.INVALID_REQUEST -> 400
        ApiErrorCode.COUNTER_OVERFLOW -> 409
        ApiErrorCode.INTERNAL_ERROR -> 500
        ApiErrorCode.UNAVAILABLE -> 503
    }
}
