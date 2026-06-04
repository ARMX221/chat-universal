package com.chatuniversal.controller;

import com.chatuniversal.model.Message;
import com.chatuniversal.service.MessageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageRestController {

    private final MessageService messageService;

    public MessageRestController(MessageService messageService) {
        this.messageService = messageService;
    }

    /**
     * Get chat message history.
     * If 'after' parameter is provided, returns only messages after that ID.
     * Otherwise returns the most recent 200 messages.
     */
    @GetMapping
    public ResponseEntity<List<Message>> getMessages(
            @RequestParam(value = "after", required = false) Long afterId) {
        if (afterId != null) {
            return ResponseEntity.ok(messageService.getMessagesAfterId(afterId));
        }
        return ResponseEntity.ok(messageService.getRecentMessages());
    }
}
