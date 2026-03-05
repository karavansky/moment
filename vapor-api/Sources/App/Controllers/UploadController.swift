import Vapor
import Foundation

struct UploadController: RouteCollection, Sendable {
    func boot(routes: any RoutesBuilder) throws {
        let upload = routes.grouped("upload")
        // POST /api/upload
        // Set a larger max body size for uploads (e.g. 10MB)
        upload.on(.POST, body: .collect(maxSize: "20mb"), use: uploadFile)
    }

    struct UploadFormData: Content {
        var file: File
        var firmaID: String
        var appointmentId: String
        var reportId: String
    }

    struct UploadResponse: Content {
        var success: Bool
        var photoId: String
        var url: String
    }

    @Sendable
    func uploadFile(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let tokenFirmaID = user.firmaID else { throw Abort(.forbidden) }

        let formData = try req.content.decode(UploadFormData.self)

        // Basic validation
        guard formData.firmaID == tokenFirmaID else {
            throw Abort(.forbidden, reason: "firmaID mismatch")
        }

        let photoId = generateId()
        
        // Extract extension from filename
        let originalName = formData.file.filename
        var ext = "jpeg"
        if let lastDotIdx = originalName.lastIndex(of: ".") {
            let extracted = String(originalName[originalName.index(after: lastDotIdx)...]).lowercased()
            if !extracted.isEmpty {
                ext = extracted
            }
        }

        let bucketName = "images"
        let key = "\(formData.firmaID)/\(formData.appointmentId)/\(formData.reportId)/\(photoId).\(ext)"
        // SeaweedFS S3 gateway stores buckets under /buckets/
        let destPath = "buckets/\(bucketName)/\(key)"

        // Upload to SeaweedFS
        let fileHost = Environment.get("SEAWEED_FILER_URL") ?? "http://seaweedfs:8888"
        let uploadRes = try await req.client.put(URI(string: "\(fileHost)/\(destPath)")) { fReq in
            fReq.body = formData.file.data
            
            // Set content type if available, otherwise octet-stream
            if let ct = formData.file.contentType {
                fReq.headers.contentType = ct
            } else {
                fReq.headers.add(name: .contentType, value: "application/octet-stream")
            }
        }

        guard uploadRes.status == .created || uploadRes.status == .ok else {
            throw Abort(.internalServerError, reason: "Failed to upload file to SeaweedFS")
        }

        let response = UploadResponse(
            success: true,
            photoId: photoId,
            url: "/api/files/buckets/\(bucketName)/\(key)"
        )

        return try await response.encodeResponse(status: .ok, for: req)
    }
}
