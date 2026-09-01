// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PubAgentDesign",
    platforms: [.iOS(.v17)],
    products: [.library(name: "PubAgentDesign", targets: ["PubAgentDesign"])],
    targets: [.target(name: "PubAgentDesign")]
)
