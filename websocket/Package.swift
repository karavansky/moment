// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "WebSocketServer",
    platforms: [
       .macOS(.v13)
    ],
    dependencies: [
        // 💧 A server-side Swift web framework.
        .package(url: "https://github.com/vapor/vapor.git", from: "4.115.0"),
        // 🔵 Non-blocking, event-driven networking for Swift. Used for custom executors
        .package(url: "https://github.com/apple/swift-nio.git", from: "2.65.0"),
        .package(url: "https://github.com/vapor/fluent.git", from: "4.8.0"),
        // 🐘 PostgreSQL driver for Fluent
        .package(url: "https://github.com/vapor/fluent-postgres-driver.git", from: "2.0.0"),
        // 🔴 Redis client for session storage
        .package(url: "https://github.com/vapor/redis.git", from: "4.0.0"),

        // 🔐 Crypto для JWE расшифровки NextAuth токенов (как в vapor-api)
        .package(url: "https://github.com/apple/swift-crypto.git", "1.0.0"..<"4.0.0"),
        .package(url: "https://github.com/krzyzanowskim/CryptoSwift.git", from: "1.8.0"),
    ],
    targets: [
        .executableTarget(
            name: "WebSocketServer",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
                .product(name: "NIOCore", package: "swift-nio"),
                .product(name: "NIOPosix", package: "swift-nio"),
                .product(name: "Fluent", package: "fluent"),
                .product(name: "FluentPostgresDriver", package: "fluent-postgres-driver"),
                .product(name: "Redis", package: "redis"),

                // Crypto для JWTAuthMiddleware
                .product(name: "Crypto", package: "swift-crypto"),
                .product(name: "CryptoSwift", package: "CryptoSwift"),
            ],
            swiftSettings: swiftSettings
        ),
        .testTarget(
            name: "HelloTests",
            dependencies: [
                .target(name: "WebSocketServer"),
                .product(name: "VaporTesting", package: "vapor"),
            ],
            swiftSettings: swiftSettings
        )
    ]
)

var swiftSettings: [SwiftSetting] { [
    .enableUpcomingFeature("ExistentialAny"),
] }
