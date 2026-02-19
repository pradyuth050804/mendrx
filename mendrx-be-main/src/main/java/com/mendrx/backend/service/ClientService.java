package com.mendrx.backend.service;

import com.mendrx.backend.dto.ClientDTO;
import com.mendrx.backend.model.Client;
import com.mendrx.backend.model.User;
import com.mendrx.backend.repository.ClientRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class ClientService {
    @Autowired
    private ClientRepository clientRepository;

    @Transactional
    public ClientDTO createClient(User user, String name, String phoneNumber, String gender, YearMonth birthMonth, String email) {
            Client client = new Client();
            client.setUser(user);
            client.setName(name);
            client.setPhoneNumber(phoneNumber);
            client.setGender(gender);
            client.setBirthMonthFromYearMonth(birthMonth);
            client.setEmail(email);

            client = clientRepository.save(client);
            return convertToDTO(client);
    }

    public Page<ClientDTO> getClientsForUser(UUID userAuthId, Pageable pageable) {
        return clientRepository.findByUserAuthId(userAuthId, pageable)
                .map(this::convertToDTO);
    }

    public boolean hasClients(UUID userAuthId) {
        return clientRepository.existsByUserAuthId(userAuthId);
    }

    private ClientDTO convertToDTO(Client client) {
        ClientDTO dto = new ClientDTO();
        dto.setId(client.getId().toString());
        dto.setName(client.getName());
        dto.setPhoneNumber(client.getPhoneNumber());
        dto.setGender(client.getGender());
        dto.setBirthMonth(client.getBirthMonthAsYearMonth());
        dto.setEmail(client.getEmail());

        DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE_TIME;
        dto.setCreatedAt(client.getCreatedAt().format(formatter));
        dto.setUpdatedAt(client.getUpdatedAt().format(formatter));

        return dto;
    }

    @Transactional
    public void deleteClient(UUID userAuthId, UUID clientId) {
        // Find the client and verify it belongs to the user
        Client client = clientRepository.findByIdAndUserAuthId(clientId, userAuthId)
                .orElseThrow(() -> new EntityNotFoundException("Client not found or doesn't belong to the user"));

        // Delete the client (reports will be deleted automatically due to cascade)
        clientRepository.delete(client);
    }

    public Client getClientById(UUID id) {
        return clientRepository.findById(id).orElse(null);
    }

    public Page<ClientDTO> searchClientsForUser(UUID userAuthId, String searchTerm, Pageable pageable) {
        return clientRepository.findByUserAuthIdAndSearchTerm(userAuthId, searchTerm, pageable)
                .map(this::convertToDTO);
    }

    public ClientDTO updateClient(UUID userAuthId, UUID clientId, String name, String phoneNumber, String gender, YearMonth birthMonth, String email) {

            Client client = clientRepository.findByIdAndUserAuthId(clientId, userAuthId)
                .orElseThrow(() -> new RuntimeException("Client not found or access denied"));

            client.setName(name);
            client.setPhoneNumber(phoneNumber);
            client.setGender(gender);
            client.setBirthMonthFromYearMonth(birthMonth);
            client.setEmail(email);
            client.setUpdatedAt(LocalDateTime.now());

            Client updatedClient = clientRepository.save(client);
            return new ClientDTO(updatedClient);
    }
}