package com.chatuniversal.repository;

import com.chatuniversal.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findTop200ByOrderByTimestampDesc();

    List<Message> findByIdGreaterThanOrderByTimestampAsc(Long id);

    List<Message> findAllByOrderByTimestampAsc();
}
