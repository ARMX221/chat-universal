package com.chatuniversal.controller;

import com.chatuniversal.model.Message;
import com.chatuniversal.service.MessageService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Controller
public class ChatWebSocketController {

    private final MessageService messageService;

    public ChatWebSocketController(MessageService messageService) {
        this.messageService = messageService;
    }

    /**
     * Handles incoming chat messages via WebSocket STOMP.
     * Messages sent to /app/chat.send are processed here
     * and broadcast to all subscribers of /topic/chat.
     */
    @MessageMapping("/chat.send")
    @SendTo("/topic/chat")
    public Message sendMessage(Message message) {
        message.setTimestamp(LocalDateTime.now());
        if (message.getType() == null) {
            message.setType(Message.MessageType.TEXT);
        }
        return messageService.saveMessage(message);
    }
}
