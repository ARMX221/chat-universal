package com.chatuniversal.service;

import com.chatuniversal.model.Message;
import com.chatuniversal.repository.MessageRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class MessageService {

    private final MessageRepository messageRepository;

    public MessageService(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    public Message saveMessage(Message message) {
        // Sanitize content to prevent XSS
        if (message.getContent() != null) {
            message.setContent(sanitize(message.getContent()));
        }
        if (message.getSender() != null) {
            message.setSender(sanitize(message.getSender().trim()));
        }
        if (message.getFileName() != null) {
            message.setFileName(sanitize(message.getFileName()));
        }
        return messageRepository.save(message);
    }

    public List<Message> getRecentMessages() {
        List<Message> messages = messageRepository.findTop200ByOrderByTimestampDesc();
        List<Message> reversed = new ArrayList<>(messages);
        Collections.reverse(reversed);
        return reversed;
    }

    public List<Message> getMessagesAfterId(Long id) {
        return messageRepository.findByIdGreaterThanOrderByTimestampAsc(id);
    }

    /**
     * Sanitize input to prevent XSS attacks.
     * Replaces dangerous HTML characters with their entity equivalents.
     */
    private String sanitize(String input) {
        if (input == null) return null;
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;")
                .replace("/", "&#x2F;");
    }
}
