package com.chatuniversal.controller;

import com.chatuniversal.model.Message;
import com.chatuniversal.service.FileStorageService;
import com.chatuniversal.service.MessageService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileStorageService fileStorageService;
    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    public FileController(FileStorageService fileStorageService,
                          MessageService messageService,
                          SimpMessagingTemplate messagingTemplate) {
        this.fileStorageService = fileStorageService;
        this.messageService = messageService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Upload a file and broadcast a FILE message to all chat participants.
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("sender") String sender) {
        try {
            String storedFileName = fileStorageService.storeFile(file);

            // Create a FILE-type message
            Message message = new Message();
            message.setSender(sender);
            message.setContent(file.getOriginalFilename());
            message.setType(Message.MessageType.FILE);
            message.setFileName(file.getOriginalFilename());
            message.setStoredFileName(storedFileName);
            message.setFileSize(file.getSize());
            message.setMimeType(file.getContentType());
            message.setTimestamp(LocalDateTime.now());

            Message savedMessage = messageService.saveMessage(message);

            // Broadcast to all WebSocket subscribers
            messagingTemplate.convertAndSend("/topic/chat", savedMessage);

            return ResponseEntity.ok(savedMessage);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Erro interno: " + e.getMessage()));
        }
    }

    /**
     * Download a previously uploaded file by its stored filename.
     */
    @GetMapping("/download/{storedFileName}")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String storedFileName) {
        try {
            if (!fileStorageService.fileExists(storedFileName)) {
                return ResponseEntity.notFound().build();
            }

            Path filePath = fileStorageService.getFilePath(storedFileName);
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);

        } catch (MalformedURLException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
