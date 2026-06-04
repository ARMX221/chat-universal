package com.chatuniversal.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    private Path uploadPath;

    @Value("${cloudinary.url:}")
    private String cloudinaryUrl;

    private Cloudinary cloudinary;

    private static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            ".exe", ".bat", ".sh", ".cmd", ".ps1", ".vbs", ".msi",
            ".com", ".scr", ".pif", ".reg", ".dll", ".sys", ".cpl"
    );

    private static final long MAX_FILE_SIZE = 350L * 1024 * 1024; // 350MB

    @PostConstruct
    public void init() {
        if (StringUtils.hasText(cloudinaryUrl)) {
            cloudinary = new Cloudinary(cloudinaryUrl);
        }

        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory: " + uploadPath, e);
        }
    }

    /**
     * Store a file with a unique UUID-based name.
     * Validates file size and extension before saving.
     *
     * @param file the multipart file to store
     * @return the unique stored filename
     * @throws IOException if file cannot be saved
     * @throws IllegalArgumentException if file is invalid
     */
    public String storeFile(MultipartFile file) throws IOException {
        // Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Arquivo excede o limite de 350MB");
        }

        if (file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo vazio");
        }

        // Validate file extension
        String originalFileName = file.getOriginalFilename();
        if (originalFileName != null) {
            String lowerName = originalFileName.toLowerCase();
            for (String ext : BLOCKED_EXTENSIONS) {
                if (lowerName.endsWith(ext)) {
                    throw new IllegalArgumentException("Tipo de arquivo não permitido: " + ext);
                }
            }
        }

        // Generate unique filename preserving original extension
        String extension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }
        String storedFileName = UUID.randomUUID().toString() + extension;

        if (cloudinary != null) {
            // Upload to Cloudinary
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "resource_type", "auto",
                    "use_filename", true,
                    "unique_filename", true
            ));
            return uploadResult.get("secure_url").toString();
        }

        // Save file to local disk
        Path targetLocation = uploadPath.resolve(storedFileName);
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        return storedFileName;
    }

    /**
     * Get the full filesystem path for a stored file.
     */
    public Path getFilePath(String storedFileName) {
        // Prevent path traversal attacks
        Path resolved = uploadPath.resolve(storedFileName).normalize();
        if (!resolved.startsWith(uploadPath)) {
            throw new SecurityException("Invalid file path");
        }
        return resolved;
    }

    /**
     * Check if a stored file exists.
     */
    public boolean fileExists(String storedFileName) {
        return Files.exists(getFilePath(storedFileName));
    }
}
