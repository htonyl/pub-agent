# Compose design catalog

This developer-only Compose Multiplatform catalog renders the generated
Button and TextField contract matrix. Run the desktop host with:

```sh
gradle --configure-on-demand :packages:kotlin:design-catalog:run
```

The Android runner is `:packages:kotlin:design-catalog-android`; it requires a
locally configured Android SDK. Keep catalog examples tied to generated semantic
tokens. Composition examples belong in a separate catalog section.
